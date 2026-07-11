"""v0.8.0 authorization model: require_parent, require_kid_access/assert_kid_access."""
from conftest import auth, make_chore, make_kid, make_kid_account


def test_unauthenticated_requests_are_rejected(client):
    assert client.get("/api/kids").status_code == 401
    assert client.post("/api/kids", json={"name": "Nope"}).status_code == 401


def test_first_parent_can_manage_family(client, parent_token):
    kid = make_kid(client, parent_token, "Authz Kid A")
    assert kid["name"] == "Authz Kid A"


def test_second_parent_is_also_a_parent(client, parent_token, second_parent_token):
    """v0.8.0: ANY non-kid-linked account is a parent — not just the first admin."""
    kid = make_kid(client, second_parent_token, "Authz Kid B")
    assert kid["name"] == "Authz Kid B"


def test_kid_account_blocked_from_management(client, parent_token):
    """require_parent rejects kid-linked accounts on management endpoints."""
    kid = make_kid(client, parent_token)
    kid_token = make_kid_account(kid["id"])

    # create kid / chore / reward are parent-gated
    assert client.post("/api/kids", json={"name": "Sneaky"}, headers=auth(kid_token)).status_code == 403
    assert (
        client.post(
            "/api/chores",
            json={"name": "Sneaky chore", "default_points": 5, "assigned_kids": []},
            headers=auth(kid_token),
        ).status_code
        == 403
    )
    # approve is parent-gated too
    chore = make_chore(client, parent_token, assigned_kids=[kid["id"]])
    client.post(f"/api/chores/{chore['id']}/claim", json={"kid_id": kid["id"]}, headers=auth(kid_token))
    assert (
        client.post(f"/api/chores/{chore['id']}/approve", json={}, headers=auth(kid_token)).status_code
        == 403
    )


def test_kid_cannot_touch_other_kids_data(client, parent_token):
    """require_kid_access (path param) + assert_kid_access (body param) IDOR guards."""
    kid_a = make_kid(client, parent_token)
    kid_b = make_kid(client, parent_token)
    kid_a_token = make_kid_account(kid_a["id"])

    # Path-param guard: allowance summary of the OTHER kid -> 403; own -> 200
    assert client.get(f"/api/allowance/summary/{kid_b['id']}", headers=auth(kid_a_token)).status_code == 403
    assert client.get(f"/api/allowance/summary/{kid_a['id']}", headers=auth(kid_a_token)).status_code == 200

    # Body-param guard: claiming a chore AS the other kid -> 403
    chore = make_chore(client, parent_token, assigned_kids=[kid_a["id"], kid_b["id"]])
    res = client.post(
        f"/api/chores/{chore['id']}/claim", json={"kid_id": kid_b["id"]}, headers=auth(kid_a_token)
    )
    assert res.status_code == 403


def test_parent_unrestricted_across_kids(client, parent_token):
    """Parents (no linked Kid) pass the kid-access guards for any kid."""
    kid = make_kid(client, parent_token)
    assert client.get(f"/api/allowance/summary/{kid['id']}", headers=auth(parent_token)).status_code == 200
