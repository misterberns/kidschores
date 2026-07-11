"""Badges & challenges engine (Tier 2.5)."""
from datetime import datetime, timedelta, timezone

from conftest import auth, make_chore, make_kid, make_kid_account, make_reward, set_kid_points


def _claim_and_approve(client, parent_token, chore_id, kid_id, points_awarded=None):
    res = client.post(f"/api/chores/{chore_id}/claim", json={"kid_id": kid_id}, headers=auth(parent_token))
    assert res.status_code == 200, res.text
    body = {} if points_awarded is None else {"points_awarded": points_awarded}
    res = client.post(f"/api/chores/{chore_id}/approve", json=body, headers=auth(parent_token))
    assert res.status_code == 200, res.text
    return res.json()


def _kid(client, parent_token, kid_id):
    return client.get(f"/api/kids/{kid_id}", headers=auth(parent_token)).json()


def test_default_badge_catalog_seeded(client, parent_token):
    res = client.get("/api/badges", headers=auth(parent_token))
    assert res.status_code == 200
    ids = {b["id"] for b in res.json()}
    assert {"first_chore", "streak_3", "streak_7", "streak_30", "goal_crusher", "champion", "legend"} <= ids


def test_first_chore_badge_awarded_on_approve(client, parent_token):
    kid = make_kid(client, parent_token)
    chore = make_chore(client, parent_token, points=10, assigned_kids=[kid["id"]])
    approved = _claim_and_approve(client, parent_token, chore["id"], kid["id"])
    assert "first_chore" in approved["new_badges"]
    assert "first_chore" in _kid(client, parent_token, kid["id"])["badges"]


def test_badge_not_awarded_twice(client, parent_token):
    kid = make_kid(client, parent_token)
    chore = make_chore(client, parent_token, points=10, assigned_kids=[kid["id"]],
                       allow_multiple_claims_per_day=True)
    first = _claim_and_approve(client, parent_token, chore["id"], kid["id"])
    assert "first_chore" in first["new_badges"]
    second = _claim_and_approve(client, parent_token, chore["id"], kid["id"])
    assert "first_chore" not in second["new_badges"]
    badges = _kid(client, parent_token, kid["id"])["badges"]
    assert badges.count("first_chore") == 1


def test_points_threshold_badge(client, parent_token):
    """goal_crusher fires when lifetime max points crosses 1000."""
    kid = make_kid(client, parent_token)
    chore = make_chore(client, parent_token, points=1200, assigned_kids=[kid["id"]])
    approved = _claim_and_approve(client, parent_token, chore["id"], kid["id"])
    assert "goal_crusher" in approved["new_badges"]


def test_champion_badge_on_first_redemption(client, parent_token):
    kid = make_kid(client, parent_token)
    set_kid_points(kid["id"], 100)
    reward = make_reward(client, parent_token, cost=10, requires_approval=False)
    res = client.post(f"/api/rewards/{reward['id']}/redeem", json={"kid_id": kid["id"]}, headers=auth(parent_token))
    assert res.status_code == 200, res.text
    assert "champion" in _kid(client, parent_token, kid["id"])["badges"]


def test_badge_crud_is_parent_gated(client, parent_token):
    kid = make_kid(client, parent_token)
    kid_token = make_kid_account(kid["id"])
    body = {"name": "Sneaky badge", "threshold_type": "special"}
    assert client.post("/api/badges", json=body, headers=auth(kid_token)).status_code == 403
    # kid CAN read the catalog
    assert client.get("/api/badges", headers=auth(kid_token)).status_code == 200


def test_custom_badge_and_manual_award(client, parent_token):
    kid = make_kid(client, parent_token)
    res = client.post(
        "/api/badges",
        json={"name": "Helper of the Month", "description": "Parent's choice", "threshold_type": "special"},
        headers=auth(parent_token),
    )
    assert res.status_code == 200, res.text
    badge = res.json()
    res = client.post(f"/api/badges/{badge['id']}/award/{kid['id']}", headers=auth(parent_token))
    assert res.status_code == 200 and res.json()["awarded"] is True
    assert badge["id"] in _kid(client, parent_token, kid["id"])["badges"]
    # idempotent
    res = client.post(f"/api/badges/{badge['id']}/award/{kid['id']}", headers=auth(parent_token))
    assert res.json()["awarded"] is False


def _make_challenge(client, parent_token, *, target=2, target_type="chore_count", bonus=25, badge_id=None, kid_ids=None):
    now = datetime.now(timezone.utc)
    res = client.post(
        "/api/challenges",
        json={
            "name": "Test Sprint",
            "description": "pytest challenge",
            "target_type": target_type,
            "target_value": target,
            "start_date": (now - timedelta(hours=1)).isoformat(),
            "end_date": (now + timedelta(days=2)).isoformat(),
            "kid_ids": kid_ids or [],
            "badge_id": badge_id,
            "bonus_points": bonus,
        },
        headers=auth(parent_token),
    )
    assert res.status_code == 200, res.text
    return res.json()


def test_challenge_validation(client, parent_token):
    now = datetime.now(timezone.utc)
    res = client.post(
        "/api/challenges",
        json={
            "name": "Backwards",
            "target_type": "chore_count",
            "target_value": 3,
            "start_date": now.isoformat(),
            "end_date": (now - timedelta(days=1)).isoformat(),
        },
        headers=auth(parent_token),
    )
    assert res.status_code == 422


def test_challenge_templates_parent_only(client, parent_token):
    kid = make_kid(client, parent_token)
    kid_token = make_kid_account(kid["id"])
    assert client.get("/api/challenges/templates", headers=auth(parent_token)).status_code == 200
    assert client.get("/api/challenges/templates", headers=auth(kid_token)).status_code == 403


def test_challenge_completion_awards_bonus_and_badge_once(client, parent_token):
    kid = make_kid(client, parent_token)
    challenge = _make_challenge(client, parent_token, target=2, bonus=25, badge_id="superstar", kid_ids=[kid["id"]])

    c1 = make_chore(client, parent_token, points=10, assigned_kids=[kid["id"]])
    c2 = make_chore(client, parent_token, points=10, assigned_kids=[kid["id"]])
    c3 = make_chore(client, parent_token, points=10, assigned_kids=[kid["id"]])

    _claim_and_approve(client, parent_token, c1["id"], kid["id"])
    second = _claim_and_approve(client, parent_token, c2["id"], kid["id"])
    assert any(c["name"] == "Test Sprint" for c in second["completed_challenges"])

    after = _kid(client, parent_token, kid["id"])
    assert "superstar" in after["badges"]
    assert after["points"] == 10 + 10 + 25  # two approvals + bonus

    # No re-award on further approvals
    third = _claim_and_approve(client, parent_token, c3["id"], kid["id"])
    assert third["completed_challenges"] == []
    final = _kid(client, parent_token, kid["id"])
    assert final["points"] == 10 + 10 + 25 + 10
    assert final["badges"].count("superstar") == 1

    # Progress endpoint reflects completion
    res = client.get("/api/challenges", headers=auth(parent_token))
    entry = next(c for c in res.json() if c["id"] == challenge["id"])
    assert entry["progress"][0]["completed"] is True


def test_challenge_kid_scoping(client, parent_token):
    kid_a = make_kid(client, parent_token)
    kid_b = make_kid(client, parent_token)
    _make_challenge(client, parent_token, target=99, kid_ids=[kid_a["id"]])
    kid_b_token = make_kid_account(kid_b["id"])
    res = client.get("/api/challenges", headers=auth(kid_b_token))
    assert res.status_code == 200
    assert all("Test Sprint" != c["name"] or kid_b["id"] in c["kid_ids"] or not c["kid_ids"] for c in res.json())
    # kid B sees no challenge scoped exclusively to kid A
    assert not any(c["kid_ids"] == [kid_a["id"]] for c in res.json())

def test_reset_preserves_badge_catalog(client, parent_token):
    """/api/test/reset wipes entity tables — the badge CATALOG must survive
    (it seeds at startup only; the reset re-seeds it). Regression: the first
    live e2e run wiped the catalog and silently disabled all auto-awards."""
    res = client.post("/api/test/reset", headers=auth(parent_token))
    assert res.status_code == 200, res.text
    ids = {b["id"] for b in client.get("/api/badges", headers=auth(parent_token)).json()}
    assert "first_chore" in ids and len(ids) >= 12
