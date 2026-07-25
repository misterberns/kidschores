"""Savings goals (v0.16.0, UX-REVIEW 5b): CRUD + cap + authz + convert flow.

Progress is the kid's live points balance vs target_points; convert deducts
exactly target_points via the allowance payout flow atomically with goal
completion. Cross-kid isolation rides require_kid_access (v0.14.1 discipline).
"""
import uuid

from conftest import auth, make_kid, make_kid_account, set_kid_points


def _create_goal(client, token, kid_id, *, name=None, target=500, **overrides):
    body = {"name": name or f"Goal-{uuid.uuid4().hex[:6]}", "target_points": target}
    body.update(overrides)
    return client.post(f"/api/goals/{kid_id}", json=body, headers=auth(token))


def _list_goals(client, token, kid_id):
    return client.get(f"/api/goals/{kid_id}", headers=auth(token))


def test_goal_crud_as_parent(client, parent_token):
    kid = make_kid(client, parent_token)

    res = _create_goal(client, parent_token, kid["id"], name="New Bike", target=500)
    assert res.status_code == 200, res.text
    goal = res.json()
    assert goal["status"] == "active"
    assert goal["icon"] == "piggy-bank"
    assert goal["target_points"] == 500

    # List carries the conversion rate + live progress
    listed = _list_goals(client, parent_token, kid["id"]).json()
    assert listed["points_per_dollar"] == 100
    assert listed["current_points"] == 0
    assert len(listed["goals"]) == 1
    assert listed["goals"][0]["progress_pct"] == 0.0
    assert listed["goals"][0]["reached"] is False

    # Update
    res = client.put(
        f"/api/goals/{kid['id']}/{goal['id']}",
        json={"name": "Red Bike", "target_points": 600, "icon": "star"},
        headers=auth(parent_token),
    )
    assert res.status_code == 200, res.text
    assert res.json()["name"] == "Red Bike"
    assert res.json()["target_points"] == 600

    # Delete
    res = client.delete(f"/api/goals/{kid['id']}/{goal['id']}", headers=auth(parent_token))
    assert res.status_code == 200
    assert _list_goals(client, parent_token, kid["id"]).json()["goals"] == []


def test_kid_manages_own_goal(client, parent_token):
    kid = make_kid(client, parent_token)
    kid_token = make_kid_account(kid["id"])

    res = _create_goal(client, kid_token, kid["id"], name="Lego Set")
    assert res.status_code == 200, res.text
    goal = res.json()

    res = client.put(
        f"/api/goals/{kid['id']}/{goal['id']}",
        json={"name": "Big Lego Set"},
        headers=auth(kid_token),
    )
    assert res.status_code == 200

    res = client.delete(f"/api/goals/{kid['id']}/{goal['id']}", headers=auth(kid_token))
    assert res.status_code == 200


def test_cross_kid_403(client, parent_token):
    kid_a = make_kid(client, parent_token)
    kid_b = make_kid(client, parent_token)
    kid_a_token = make_kid_account(kid_a["id"])
    goal_b = _create_goal(client, parent_token, kid_b["id"]).json()

    assert _list_goals(client, kid_a_token, kid_b["id"]).status_code == 403
    assert _create_goal(client, kid_a_token, kid_b["id"]).status_code == 403
    res = client.post(
        f"/api/goals/{kid_b['id']}/{goal_b['id']}/convert",
        json={},
        headers=auth(kid_a_token),
    )
    assert res.status_code == 403


def test_active_goal_cap(client, parent_token):
    kid = make_kid(client, parent_token)
    goals = [_create_goal(client, parent_token, kid["id"]).json() for _ in range(3)]

    res = _create_goal(client, parent_token, kid["id"])
    assert res.status_code == 400
    assert "Maximum of 3" in res.json()["detail"]

    # Deleting one frees a slot
    client.delete(f"/api/goals/{kid['id']}/{goals[0]['id']}", headers=auth(parent_token))
    assert _create_goal(client, parent_token, kid["id"]).status_code == 200


def test_target_below_minimum_payout_rejected(client, parent_token):
    kid = make_kid(client, parent_token)
    # Default settings: 100 points/$ and $1.00 minimum -> 50 points = $0.50
    res = _create_goal(client, parent_token, kid["id"], target=50)
    assert res.status_code == 400
    assert "minimum payout" in res.json()["detail"].lower()


def test_progress_derivation_and_clamp(client, parent_token):
    kid = make_kid(client, parent_token)
    goal = _create_goal(client, parent_token, kid["id"], target=500).json()

    set_kid_points(kid["id"], 250)
    g = _list_goals(client, parent_token, kid["id"]).json()["goals"][0]
    assert g["progress_pct"] == 50.0
    assert g["reached"] is False

    set_kid_points(kid["id"], 600)  # over target -> clamped, reached
    g = _list_goals(client, parent_token, kid["id"]).json()["goals"][0]
    assert g["progress_pct"] == 100.0
    assert g["reached"] is True
    assert goal["status"] == "active"


def test_convert_happy_path(client, parent_token):
    kid = make_kid(client, parent_token)
    goal = _create_goal(client, parent_token, kid["id"], name="Skateboard", target=500).json()
    set_kid_points(kid["id"], 600)
    kid_token = make_kid_account(kid["id"])

    res = client.post(
        f"/api/goals/{kid['id']}/{goal['id']}/convert",
        json={"payout_method": "cash"},
        headers=auth(kid_token),
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["goal"]["status"] == "completed"
    assert body["goal"]["payout_id"] == body["payout"]["id"]
    assert body["goal"]["completed_at"] is not None
    assert body["payout"]["status"] == "pending"
    assert body["payout"]["points_converted"] == 500
    assert body["payout"]["dollar_amount"] == 5.0
    assert body["payout"]["notes"] == "Savings goal: Skateboard"

    # Exactly target_points deducted; leftover balance retained
    listed = _list_goals(client, parent_token, kid["id"]).json()
    assert listed["current_points"] == 100
    # Completed goal renders at 100% but is no longer "reached" (not convertible)
    assert listed["goals"][0]["progress_pct"] == 100.0
    assert listed["goals"][0]["reached"] is False

    # Payout visible in the allowance pending queue
    pending = client.get("/api/allowance/pending", headers=auth(parent_token)).json()
    assert any(p["id"] == body["payout"]["id"] for p in pending)

    # A completed goal can't be edited or re-converted
    res = client.put(
        f"/api/goals/{kid['id']}/{goal['id']}",
        json={"name": "Nope"},
        headers=auth(parent_token),
    )
    assert res.status_code == 400
    res = client.post(
        f"/api/goals/{kid['id']}/{goal['id']}/convert", json={}, headers=auth(parent_token)
    )
    assert res.status_code == 400


def test_convert_insufficient_balance_is_atomic(client, parent_token):
    kid = make_kid(client, parent_token)
    goal = _create_goal(client, parent_token, kid["id"], target=500).json()
    set_kid_points(kid["id"], 100)

    res = client.post(
        f"/api/goals/{kid['id']}/{goal['id']}/convert", json={}, headers=auth(parent_token)
    )
    assert res.status_code == 400
    assert "Not enough points" in res.json()["detail"]

    # Nothing changed: goal still active, points untouched, no payout created
    listed = _list_goals(client, parent_token, kid["id"]).json()
    assert listed["current_points"] == 100
    assert listed["goals"][0]["status"] == "active"
    payouts = client.get(f"/api/allowance/payouts/{kid['id']}", headers=auth(parent_token)).json()
    assert payouts == []


def test_payout_cancel_refunds_but_goal_stays_completed(client, parent_token):
    kid = make_kid(client, parent_token)
    goal = _create_goal(client, parent_token, kid["id"], target=500).json()
    set_kid_points(kid["id"], 500)

    body = client.post(
        f"/api/goals/{kid['id']}/{goal['id']}/convert", json={}, headers=auth(parent_token)
    ).json()

    res = client.post(
        f"/api/allowance/payouts/{body['payout']['id']}/cancel", headers=auth(parent_token)
    )
    assert res.status_code == 200
    assert res.json()["status"] == "cancelled"

    # Points refunded; goal deliberately stays completed (payout_id keeps the link)
    listed = _list_goals(client, parent_token, kid["id"]).json()
    assert listed["current_points"] == 500
    assert listed["goals"][0]["status"] == "completed"


def test_goal_404s(client, parent_token):
    kid = make_kid(client, parent_token)
    res = _create_goal(client, parent_token, "nonexistent-kid")
    assert res.status_code == 404
    res = client.put(
        f"/api/goals/{kid['id']}/nonexistent-goal",
        json={"name": "X"},
        headers=auth(parent_token),
    )
    assert res.status_code == 404
    # A real goal id under the WRONG kid_id is a 404, not a leak
    other_kid = make_kid(client, parent_token)
    goal = _create_goal(client, parent_token, kid["id"]).json()
    res = client.delete(f"/api/goals/{other_kid['id']}/{goal['id']}", headers=auth(parent_token))
    assert res.status_code == 404
