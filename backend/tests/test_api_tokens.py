"""API token lifecycle — including the v0.8.0 expiry enforcement."""
from datetime import datetime, timedelta, timezone

from conftest import auth

from app.database import SessionLocal
from app.models import ApiToken


def _create_token(client, parent_token, name="pytest-token", expires_in_days=None):
    res = client.post(
        "/api/tokens",
        json={"name": name, "scopes": [], "expires_in_days": expires_in_days},
        headers=auth(parent_token),
    )
    assert res.status_code == 200, res.text
    return res.json()


def test_api_token_authenticates(client, parent_token):
    created = _create_token(client, parent_token)
    assert created["token"].startswith("kc_")
    res = client.get("/api/kids", headers=auth(created["token"]))
    assert res.status_code == 200


def test_expired_api_token_is_rejected(client, parent_token):
    """v0.8.0: expires_at is enforced — an expired token must NOT authenticate."""
    created = _create_token(client, parent_token, name="expiring", expires_in_days=1)

    # Force the stored expiry into the past (naive-UTC, as stored)
    db = SessionLocal()
    try:
        row = db.query(ApiToken).filter(ApiToken.id == created["id"]).first()
        row.expires_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=2)
        db.commit()
    finally:
        db.close()

    res = client.get("/api/kids", headers=auth(created["token"]))
    assert res.status_code == 401


def test_revoked_api_token_is_rejected(client, parent_token):
    created = _create_token(client, parent_token, name="revocable")
    assert client.delete(f"/api/tokens/{created['id']}", headers=auth(parent_token)).status_code == 200
    assert client.get("/api/kids", headers=auth(created["token"])).status_code == 401


def test_garbage_bearer_is_rejected(client):
    assert client.get("/api/kids", headers=auth("kc_not-a-real-token")).status_code == 401
    assert client.get("/api/kids", headers=auth("not-even-prefixed")).status_code == 401
