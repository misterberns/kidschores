"""Kiosk mode (v0.18.0): a claim-only device token.

The load-bearing test is `test_kiosk_token_grants_nothing_outside_kiosk`: it walks
EVERY route the app serves (derived from the app's own OpenAPI schema, not a hand
list; FastAPI 0.142+ keeps included routers lazy, so `app.routes` lists only 2) and requires
that a kiosk token gets exactly what an anonymous caller gets. Remove the scope check
in deps.get_current_user and it goes red on every authenticated route.
"""
import re

from app.main import app
from tests.conftest import auth, make_chore, make_kid, make_kid_account


def _mint(client, parent_token, name="Kitchen tablet") -> dict:
    res = client.post("/api/kiosk/devices", json={"name": name}, headers=auth(parent_token))
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["token"].startswith("kc_")
    return body


def test_parent_mints_lists_and_revokes_device(client, parent_token):
    dev = _mint(client, parent_token, "Hall tablet")
    listed = client.get("/api/kiosk/devices", headers=auth(parent_token)).json()
    assert any(d["id"] == dev["id"] and d["name"] == "Hall tablet" for d in listed)
    assert all("token" not in d for d in listed)  # full token is shown once only

    kiosk = auth(dev["token"])
    assert client.get("/api/kiosk/state", headers=kiosk).status_code == 200
    assert client.delete(f"/api/kiosk/devices/{dev['id']}", headers=auth(parent_token)).status_code == 200
    assert client.get("/api/kiosk/state", headers=kiosk).status_code == 401


def test_kid_account_cannot_mint_or_manage(client, parent_token):
    kid = make_kid(client, parent_token)
    kid_jwt = make_kid_account(kid["id"])
    assert client.post("/api/kiosk/devices", json={"name": "x"}, headers=auth(kid_jwt)).status_code == 403
    assert client.get("/api/kiosk/devices", headers=auth(kid_jwt)).status_code == 403


def test_general_token_endpoint_refuses_scopes(client, parent_token):
    res = client.post(
        "/api/tokens", json={"name": "sneaky", "scopes": ["kiosk"]}, headers=auth(parent_token)
    )
    assert res.status_code == 422
    # A legacy (unscoped) token is still a full token.
    res = client.post("/api/tokens", json={"name": "HA", "scopes": []}, headers=auth(parent_token))
    assert res.status_code == 200, res.text
    assert client.get("/api/kids", headers=auth(res.json()["token"])).status_code == 200


def test_user_jwt_and_anonymous_cannot_use_kiosk_endpoints(client, parent_token):
    assert client.get("/api/kiosk/state").status_code == 401
    assert client.get("/api/kiosk/state", headers=auth(parent_token)).status_code == 401
    assert client.post("/api/kiosk/claim", json={"kid_id": "x", "chore_id": "y"},
                       headers=auth(parent_token)).status_code == 401


def test_state_claim_and_once_per_day(client, parent_token):
    kid = make_kid(client, parent_token, "Kiosk Kid")
    chore = make_chore(client, parent_token, assigned_kids=[kid["id"]])
    kiosk = auth(_mint(client, parent_token)["token"])

    state = client.get("/api/kiosk/state", headers=kiosk).json()
    me = next(k for k in state["kids"] if k["id"] == kid["id"])
    row = next(c for c in me["chores"] if c["id"] == chore["id"])
    assert row["status"] == "pending"

    res = client.post("/api/kiosk/claim", json={"kid_id": kid["id"], "chore_id": chore["id"]}, headers=kiosk)
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "claimed"

    again = client.post("/api/kiosk/claim", json={"kid_id": kid["id"], "chore_id": chore["id"]}, headers=kiosk)
    assert again.status_code == 400

    state = client.get("/api/kiosk/state", headers=kiosk).json()
    me = next(k for k in state["kids"] if k["id"] == kid["id"])
    assert next(c for c in me["chores"] if c["id"] == chore["id"])["status"] == "claimed"

    # The main app sees the same claim (shared service, same rules).
    today = client.get(f"/api/chores/today/{kid['id']}", headers=auth(parent_token)).json()
    assert next(c for c in today if c["id"] == chore["id"])["status"] == "claimed"


def test_kiosk_cannot_claim_unassigned_chore(client, parent_token):
    kid = make_kid(client, parent_token)
    chore = make_chore(client, parent_token, assigned_kids=[])
    kiosk = auth(_mint(client, parent_token)["token"])
    res = client.post("/api/kiosk/claim", json={"kid_id": kid["id"], "chore_id": chore["id"]}, headers=kiosk)
    assert res.status_code == 400


def test_end_session_revokes_itself(client, parent_token):
    kiosk = auth(_mint(client, parent_token)["token"])
    assert client.delete("/api/kiosk/session", headers=kiosk).status_code == 200
    assert client.get("/api/kiosk/state", headers=kiosk).status_code == 401


def _fill(path: str) -> str:
    return re.sub(r"\{[^}]+\}", "00000000-0000-0000-0000-000000000000", path)


def test_kiosk_token_grants_nothing_outside_kiosk(client, parent_token):
    """Every non-kiosk route answers a kiosk token exactly as it answers no token."""
    kiosk = auth(_mint(client, parent_token)["token"])
    checked = 0
    for path, ops in app.openapi()["paths"].items():
        # /api/kiosk is the scope's own surface; /api/test is the e2e reset helper
        # (test env only) whose side effects would wipe the session fixtures.
        if path.startswith("/api/kiosk") or path.startswith("/api/test"):
            continue
        for method in sorted(m.upper() for m in ops if m in {"get", "post", "put", "patch", "delete"}):
            url = _fill(path)
            anon = client.request(method, url).status_code
            with_kiosk = client.request(method, url, headers=kiosk).status_code
            assert with_kiosk == anon, f"{method} {path}: kiosk={with_kiosk} anonymous={anon}"
            checked += 1
    # Control: the walk must actually have covered the authenticated surface.
    assert checked >= 60, f"only {checked} routes walked"
