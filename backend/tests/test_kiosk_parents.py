"""Kiosk v0.19.0: grown-ups on the board, and parent approval with a PIN.

Grown-ups are Parent profiles assigned to chores (Chore.assigned_kids, since 0.7.7).
Their completions are instant, unapproved and pointless by design.

PIN approval yields a short ticket bound to ONE kiosk device; it is never a session.
"""
import uuid

from app.database import SessionLocal
from app.models import Kid, Parent, User
from app.routers import kiosk as kiosk_router
from app.security import hash_pin
from tests.conftest import auth, make_chore, make_kid, make_kid_account


def _device(client, parent_token, name="Kitchen tablet") -> dict:
    res = client.post("/api/kiosk/devices", json={"name": name}, headers=auth(parent_token))
    assert res.status_code == 200, res.text
    return res.json()


def _parent_user_with_pin(pin: str) -> str:
    """A fresh parent account (User + linked Parent) with this PIN; returns the parent name."""
    db = SessionLocal()
    try:
        tag = uuid.uuid4().hex[:6]
        user = User(email=f"pin-{tag}@example.com", password_hash=hash_pin("x-unused-pass-123"),
                    display_name=f"PinParent-{tag}", is_admin=False)
        db.add(user)
        db.flush()
        db.add(Parent(name=f"PinParent-{tag}", user_id=user.id, pin_hash=hash_pin(pin)))
        db.commit()
        return f"PinParent-{tag}"
    finally:
        db.close()


def _adult(client, parent_token) -> dict:
    res = client.post("/api/parents", json={"name": f"Adult-{uuid.uuid4().hex[:5]}"}, headers=auth(parent_token))
    assert res.status_code == 200, res.text
    return res.json()


# --- Grown-ups ---

def test_adult_appears_and_marks_done_instantly_without_points(client, parent_token):
    adult = _adult(client, parent_token)
    kid = make_kid(client, parent_token)
    chore = make_chore(client, parent_token, assigned_kids=[adult["id"], kid["id"]])
    kiosk = auth(_device(client, parent_token)["token"])

    state = client.get("/api/kiosk/state", headers=kiosk).json()
    me = next(a for a in state["adults"] if a["id"] == adult["id"])
    assert next(c for c in me["chores"] if c["id"] == chore["id"])["status"] == "pending"
    kid_points_before = next(k for k in state["kids"] if k["id"] == kid["id"])["points"]
    pending_before = client.get("/api/approvals/pending/count", headers=auth(parent_token)).json()["chores"]

    res = client.post("/api/kiosk/adult-done", json={"parent_id": adult["id"], "chore_id": chore["id"]}, headers=kiosk)
    assert res.status_code == 200, res.text
    again = client.post("/api/kiosk/adult-done", json={"parent_id": adult["id"], "chore_id": chore["id"]}, headers=kiosk)
    assert again.status_code == 400

    state = client.get("/api/kiosk/state", headers=kiosk).json()
    me = next(a for a in state["adults"] if a["id"] == adult["id"])
    assert next(c for c in me["chores"] if c["id"] == chore["id"])["status"] == "approved"
    # Nothing landed in the approval queue and no kid's balance moved.
    assert client.get("/api/approvals/pending/count", headers=auth(parent_token)).json()["chores"] == pending_before
    kid_row = next(k for k in state["kids"] if k["id"] == kid["id"])
    assert kid_row["points"] == kid_points_before
    assert next(c for c in kid_row["chores"] if c["id"] == chore["id"])["status"] == "pending"


def test_adult_cannot_complete_unassigned_chore(client, parent_token):
    adult = _adult(client, parent_token)
    chore = make_chore(client, parent_token, assigned_kids=[])
    kiosk = auth(_device(client, parent_token)["token"])
    res = client.post("/api/kiosk/adult-done", json={"parent_id": adult["id"], "chore_id": chore["id"]}, headers=kiosk)
    assert res.status_code == 400


def test_adult_done_needs_a_kiosk_token(client, parent_token):
    adult = _adult(client, parent_token)
    chore = make_chore(client, parent_token, assigned_kids=[adult["id"]])
    body = {"parent_id": adult["id"], "chore_id": chore["id"]}
    assert client.post("/api/kiosk/adult-done", json=body).status_code == 401
    assert client.post("/api/kiosk/adult-done", json=body, headers=auth(parent_token)).status_code == 401


# --- PIN approval ---

def test_pin_unlock_approve_and_reject(client, parent_token):
    kiosk_router._unlock_failures.clear()
    name = _parent_user_with_pin("4821")
    kid = make_kid(client, parent_token)
    c1 = make_chore(client, parent_token, points=10, assigned_kids=[kid["id"]])
    c2 = make_chore(client, parent_token, points=5, assigned_kids=[kid["id"]])
    kiosk = auth(_device(client, parent_token)["token"])
    for c in (c1, c2):
        assert client.post("/api/kiosk/claim", json={"kid_id": kid["id"], "chore_id": c["id"]}, headers=kiosk).status_code == 200

    assert client.get("/api/kiosk/state", headers=kiosk).json()["parent_pin_set"] is True
    res = client.post("/api/kiosk/parent/unlock", json={"pin": "4821"}, headers=kiosk)
    assert res.status_code == 200, res.text
    assert res.json()["parent_name"] == name
    ticket = {**kiosk, "X-Kiosk-Parent": res.json()["ticket"]}

    pending = client.get("/api/kiosk/parent/pending", headers=ticket).json()
    mine = {p["chore_id"] for p in pending if p["kid_id"] == kid["id"]}
    assert mine == {c1["id"], c2["id"]}

    before = client.get(f"/api/kids/{kid['id']}", headers=auth(parent_token)).json()["points"]
    ok = client.post("/api/kiosk/parent/approve", json={"chore_id": c1["id"], "kid_id": kid["id"]}, headers=ticket)
    assert ok.status_code == 200, ok.text
    assert ok.json()["status"] == "approved" and ok.json()["approved_by"] == name
    after = client.get(f"/api/kids/{kid['id']}", headers=auth(parent_token)).json()["points"]
    assert after == before + 10

    no = client.post("/api/kiosk/parent/reject", json={"chore_id": c2["id"], "kid_id": kid["id"]}, headers=ticket)
    assert no.status_code == 200, no.text
    pending = client.get("/api/kiosk/parent/pending", headers=ticket).json()
    assert not [p for p in pending if p["kid_id"] == kid["id"]]


def test_wrong_pin_and_missing_ticket_are_refused(client, parent_token):
    kiosk_router._unlock_failures.clear()
    _parent_user_with_pin("1357")
    kid = make_kid(client, parent_token)
    chore = make_chore(client, parent_token, assigned_kids=[kid["id"]])
    kiosk = auth(_device(client, parent_token)["token"])
    client.post("/api/kiosk/claim", json={"kid_id": kid["id"], "chore_id": chore["id"]}, headers=kiosk)

    assert client.post("/api/kiosk/parent/unlock", json={"pin": "0000"}, headers=kiosk).status_code == 401
    body = {"chore_id": chore["id"], "kid_id": kid["id"]}
    assert client.post("/api/kiosk/parent/approve", json=body, headers=kiosk).status_code == 401
    assert client.get("/api/kiosk/parent/pending", headers={**kiosk, "X-Kiosk-Parent": "junk"}).status_code == 401
    # No kiosk token at all: the PIN alone opens nothing.
    assert client.post("/api/kiosk/parent/unlock", json={"pin": "1357"}).status_code == 401


def test_ticket_is_bound_to_its_device_and_is_not_a_session(client, parent_token):
    kiosk_router._unlock_failures.clear()
    _parent_user_with_pin("2468")
    a = auth(_device(client, parent_token, "A")["token"])
    b = auth(_device(client, parent_token, "B")["token"])
    ticket = client.post("/api/kiosk/parent/unlock", json={"pin": "2468"}, headers=a).json()["ticket"]
    assert client.get("/api/kiosk/parent/pending", headers={**a, "X-Kiosk-Parent": ticket}).status_code == 200
    assert client.get("/api/kiosk/parent/pending", headers={**b, "X-Kiosk-Parent": ticket}).status_code == 401
    # The ticket is not a sign-in: every user route refuses it.
    assert client.get("/api/kids", headers=auth(ticket)).status_code == 401
    assert client.get("/api/auth/me", headers=auth(ticket)).status_code == 401
    assert client.get("/api/approvals/pending", headers=auth(ticket)).status_code == 401


def test_kid_linked_account_pin_never_unlocks(client, parent_token):
    """A Parent row whose user is a kid account must not grant approval."""
    kiosk_router._unlock_failures.clear()
    kid = make_kid(client, parent_token)
    make_kid_account(kid["id"])
    db = SessionLocal()
    try:
        kid_user_id = db.query(Kid).filter(Kid.id == kid["id"]).one().user_id
        db.add(Parent(name="Sneaky", user_id=kid_user_id, pin_hash=hash_pin("9753")))
        db.commit()
    finally:
        db.close()
    kiosk = auth(_device(client, parent_token)["token"])
    assert client.post("/api/kiosk/parent/unlock", json={"pin": "9753"}, headers=kiosk).status_code == 401


def test_wrong_pins_are_rate_limited(client, parent_token):
    kiosk_router._unlock_failures.clear()
    _parent_user_with_pin("8642")
    kiosk = auth(_device(client, parent_token)["token"])
    for _ in range(kiosk_router._UNLOCK_FAIL_MAX):
        assert client.post("/api/kiosk/parent/unlock", json={"pin": "1111"}, headers=kiosk).status_code == 401
    assert client.post("/api/kiosk/parent/unlock", json={"pin": "8642"}, headers=kiosk).status_code == 429
    kiosk_router._unlock_failures.clear()
    assert client.post("/api/kiosk/parent/unlock", json={"pin": "8642"}, headers=kiosk).status_code == 200
