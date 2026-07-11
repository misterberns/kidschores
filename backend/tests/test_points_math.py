"""Chore approval points math + reward balance guards (v0.8.0 fixes)."""
from conftest import auth, make_chore, make_kid, make_reward, set_kid_points


def _claim(client, parent_token, chore_id, kid_id):
    res = client.post(f"/api/chores/{chore_id}/claim", json={"kid_id": kid_id}, headers=auth(parent_token))
    assert res.status_code == 200, res.text


def _kid_points(client, parent_token, kid_id) -> float:
    res = client.get(f"/api/kids/{kid_id}", headers=auth(parent_token))
    assert res.status_code == 200
    return res.json()["points"]


def test_approve_awards_default_points(client, parent_token):
    kid = make_kid(client, parent_token)
    chore = make_chore(client, parent_token, points=25, assigned_kids=[kid["id"]])
    _claim(client, parent_token, chore["id"], kid["id"])
    res = client.post(f"/api/chores/{chore['id']}/approve", json={}, headers=auth(parent_token))
    assert res.status_code == 200, res.text
    assert res.json()["points_awarded"] == 25
    assert _kid_points(client, parent_token, kid["id"]) == 25


def test_approve_applies_multiplier_with_rounding(client, parent_token):
    kid = make_kid(client, parent_token)
    upd = client.put(f"/api/kids/{kid['id']}", json={"points_multiplier": 1.5}, headers=auth(parent_token))
    assert upd.status_code == 200, upd.text
    chore = make_chore(client, parent_token, points=20, assigned_kids=[kid["id"]])
    _claim(client, parent_token, chore["id"], kid["id"])
    res = client.post(f"/api/chores/{chore['id']}/approve", json={}, headers=auth(parent_token))
    assert res.json()["points_awarded"] == 30  # 20 * 1.5, rounded not truncated
    assert _kid_points(client, parent_token, kid["id"]) == 30


def test_approve_honors_explicit_zero(client, parent_token):
    """v0.8.0: an intentional 0-point award is honored (falsy-0 used to fall back to default)."""
    kid = make_kid(client, parent_token)
    chore = make_chore(client, parent_token, points=25, assigned_kids=[kid["id"]])
    _claim(client, parent_token, chore["id"], kid["id"])
    res = client.post(
        f"/api/chores/{chore['id']}/approve", json={"points_awarded": 0}, headers=auth(parent_token)
    )
    assert res.status_code == 200
    assert res.json()["points_awarded"] == 0
    assert _kid_points(client, parent_token, kid["id"]) == 0


def test_redeem_requires_sufficient_points(client, parent_token):
    kid = make_kid(client, parent_token)
    reward = make_reward(client, parent_token, cost=100)
    res = client.post(
        f"/api/rewards/{reward['id']}/redeem", json={"kid_id": kid["id"]}, headers=auth(parent_token)
    )
    assert res.status_code == 400
    assert "Not enough points" in res.json()["detail"]


def test_no_approval_reward_deducts_instantly(client, parent_token):
    kid = make_kid(client, parent_token)
    set_kid_points(kid["id"], 80)
    reward = make_reward(client, parent_token, cost=30, requires_approval=False)
    res = client.post(
        f"/api/rewards/{reward['id']}/redeem", json={"kid_id": kid["id"]}, headers=auth(parent_token)
    )
    assert res.status_code == 200, res.text
    assert _kid_points(client, parent_token, kid["id"]) == 50


def test_reward_approve_uses_redemption_price_and_rechecks_balance(client, parent_token):
    """v0.8.0: approve deducts points_spent recorded AT redemption (not the live,
    possibly-edited cost) and re-checks the balance instead of going negative."""
    kid = make_kid(client, parent_token)
    set_kid_points(kid["id"], 60)
    reward = make_reward(client, parent_token, cost=40, requires_approval=True)

    res = client.post(
        f"/api/rewards/{reward['id']}/redeem", json={"kid_id": kid["id"]}, headers=auth(parent_token)
    )
    assert res.status_code == 200, res.text

    # Edit the reward price AFTER redemption — approval must still charge 40
    upd = client.put(
        f"/api/rewards/{reward['id']}",
        json={"cost": 999},
        headers=auth(parent_token),
    )
    assert upd.status_code == 200, upd.text

    res = client.post(f"/api/rewards/{reward['id']}/approve", json={}, headers=auth(parent_token))
    assert res.status_code == 200, res.text
    assert _kid_points(client, parent_token, kid["id"]) == 20  # 60 - 40 (not -939)


def test_reward_approve_rejects_when_balance_drained(client, parent_token):
    """Points spent elsewhere between redemption and approval -> approve refuses."""
    kid = make_kid(client, parent_token)
    set_kid_points(kid["id"], 50)
    reward = make_reward(client, parent_token, cost=40, requires_approval=True)
    res = client.post(
        f"/api/rewards/{reward['id']}/redeem", json={"kid_id": kid["id"]}, headers=auth(parent_token)
    )
    assert res.status_code == 200

    set_kid_points(kid["id"], 10)  # drained in the meantime
    res = client.post(f"/api/rewards/{reward['id']}/approve", json={}, headers=auth(parent_token))
    assert res.status_code == 400
    assert "Not enough points" in res.json()["detail"]
