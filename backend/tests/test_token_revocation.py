"""JWT revocation (v0.15.0): token_version epoch + refresh-jti denylist.

Pre-v0.15.0 the tokens were fully stateless: logout was a server-side no-op
and a password reset revoked NOTHING — old access (24h) + refresh (14d) JWTs
survived. These tests pin the new behavior, mirroring the API-token revocation
shape in test_api_tokens.py. Each test registers its own dedicated user so the
suite never invalidates the shared parent_token fixture.
"""
import uuid
from datetime import datetime, timedelta, timezone

from conftest import auth

from app.database import SessionLocal
from app.jobs.token_cleanup import purge_expired_revoked_tokens
from app.models import PasswordResetToken, RevokedToken, User
from app.security import create_access_token, decode_token, generate_reset_token


def _register_pair(client, email: str) -> tuple[str, str]:
    """Register a dedicated user; return (access_token, refresh_token)."""
    res = client.post(
        "/api/auth/register",
        json={"email": email, "password": "pytest-pass-123", "display_name": "Revoke Test"},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    return body["access_token"], body["refresh_token"]


def _email() -> str:
    return f"revoke-{uuid.uuid4().hex[:8]}@example.com"


def test_tokens_carry_tv_and_refresh_carries_jti(client):
    access, refresh = _register_pair(client, _email())
    a, r = decode_token(access), decode_token(refresh)
    assert a["tv"] == 0 and r["tv"] == 0
    assert r.get("jti"), "refresh token must carry a jti for per-device logout"


def test_logout_denylists_refresh_token(client):
    access, refresh = _register_pair(client, _email())

    res = client.post("/api/auth/logout", json={"refresh_token": refresh})
    assert res.status_code == 200

    # The logged-out device's refresh token is dead
    res = client.post("/api/auth/refresh", json={"refresh_token": refresh})
    assert res.status_code == 401, "denylisted refresh token must be rejected"

    # Per design, the short-TTL access token remains valid until exp
    # (logout is per-device; access dies on its own <=30 min TTL)
    res = client.get("/api/auth/me", headers=auth(access))
    assert res.status_code == 200

    # Logout is idempotent + never leaks validity
    assert client.post("/api/auth/logout", json={"refresh_token": refresh}).status_code == 200
    assert client.post("/api/auth/logout", json={"refresh_token": "garbage"}).status_code == 200


def test_logout_all_kills_all_tokens_immediately(client):
    access, refresh = _register_pair(client, _email())

    res = client.post("/api/auth/logout-all", headers=auth(access))
    assert res.status_code == 200

    # token_version bumped -> BOTH old tokens die at once
    assert client.get("/api/auth/me", headers=auth(access)).status_code == 401
    assert client.post("/api/auth/refresh", json={"refresh_token": refresh}).status_code == 401


def test_password_reset_signs_out_all_sessions(client):
    email = _email()
    access, refresh = _register_pair(client, email)

    # Mint a reset token at the DB layer (the email flow isn't testable offline)
    plain, token_hash = generate_reset_token()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        db.add(PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        ))
        db.commit()
    finally:
        db.close()

    res = client.post(
        "/api/auth/reset-password",
        json={"token": plain, "new_password": "pytest-new-pass-456"},
    )
    assert res.status_code == 200, res.text

    # The headline fix: a reset evicts every pre-existing session
    assert client.get("/api/auth/me", headers=auth(access)).status_code == 401
    assert client.post("/api/auth/refresh", json={"refresh_token": refresh}).status_code == 401

    # And the new password logs in fine, minting tv=1 tokens
    res = client.post("/api/auth/login", json={"email": email, "password": "pytest-new-pass-456"})
    assert res.status_code == 200, res.text
    assert decode_token(res.json()["access_token"])["tv"] == 1


def test_stale_tv_access_token_rejected(client):
    email = _email()
    _register_pair(client, email)

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        user_id = user.id
        user.token_version = 3
        db.commit()
    finally:
        db.close()

    stale = create_access_token({"sub": user_id, "tv": 2})
    assert client.get("/api/auth/me", headers=auth(stale)).status_code == 401

    current = create_access_token({"sub": user_id, "tv": 3})
    assert client.get("/api/auth/me", headers=auth(current)).status_code == 200


def test_missing_tv_claim_treated_as_zero(client):
    """Pre-v0.15.0 tokens (no tv claim) stay valid while the user is at tv=0."""
    email = _email()
    _register_pair(client, email)

    db = SessionLocal()
    try:
        user_id = db.query(User).filter(User.email == email).first().id
    finally:
        db.close()

    legacy = create_access_token({"sub": user_id})  # no tv claim
    assert client.get("/api/auth/me", headers=auth(legacy)).status_code == 200


def test_refresh_rotates_legacy_jtiless_token(client):
    """A pre-v0.15.0 refresh token (no jti) is accepted and rotated."""
    email = _email()
    _register_pair(client, email)

    db = SessionLocal()
    try:
        user_id = db.query(User).filter(User.email == email).first().id
    finally:
        db.close()

    import jwt as pyjwt
    from app.config import settings
    legacy_refresh = pyjwt.encode(
        {
            "sub": user_id,
            "type": "refresh",
            "exp": datetime.now(timezone.utc) + timedelta(days=7),
        },
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )
    res = client.post("/api/auth/refresh", json={"refresh_token": legacy_refresh})
    assert res.status_code == 200, res.text
    assert decode_token(res.json()["refresh_token"]).get("jti"), "rotation must hand back a jti-carrying token"


def test_purge_job_drops_only_expired_rows():
    import asyncio

    db = SessionLocal()
    try:
        expired_jti, live_jti = str(uuid.uuid4()), str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        db.add(RevokedToken(jti=expired_jti, user_id="u", expires_at=now - timedelta(days=1)))
        db.add(RevokedToken(jti=live_jti, user_id="u", expires_at=now + timedelta(days=7)))
        db.commit()
    finally:
        db.close()

    asyncio.run(purge_expired_revoked_tokens())

    db = SessionLocal()
    try:
        assert db.query(RevokedToken).filter(RevokedToken.jti == expired_jti).first() is None
        live = db.query(RevokedToken).filter(RevokedToken.jti == live_jti).first()
        assert live is not None, "unexpired denylist rows must survive the purge"
        db.delete(live)
        db.commit()
    finally:
        db.close()
