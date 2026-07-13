"""GET /api/kids scoping (v0.14.1).

Kid-linked accounts must see ONLY their own kid. The per-kid detail endpoints
already 403 siblings (require_kid_access), so listing siblings just made kid
devices render cards/tabs whose queries could never succeed — the v0.14.0
tablet 403 storm (each tablet fetched the sister's streaks/progress forever).
"""
from conftest import auth, make_kid, make_kid_account


def test_parent_lists_all_kids(client, parent_token):
    a = make_kid(client, parent_token)
    b = make_kid(client, parent_token)
    res = client.get("/api/kids", headers=auth(parent_token))
    assert res.status_code == 200
    ids = {k["id"] for k in res.json()}
    assert {a["id"], b["id"]} <= ids


def test_kid_account_lists_only_own_kid(client, parent_token):
    own = make_kid(client, parent_token)
    sibling = make_kid(client, parent_token)
    kid_token = make_kid_account(own["id"])

    res = client.get("/api/kids", headers=auth(kid_token))
    assert res.status_code == 200
    body = res.json()
    assert [k["id"] for k in body] == [own["id"]]
    assert sibling["id"] not in {k["id"] for k in body}
