"""Shared fixtures for the backend test suite.

The app binds its SQLite engine and settings at import time, so the test
environment (temp DB path, JWT secret) MUST be set before `app` is imported —
which is why the import happens inside the fixture below.
"""
import os
import tempfile
import uuid

import pytest

# Environment must be prepared before ANY app import.
_TMPDIR = tempfile.mkdtemp(prefix="kidschores-pytest-")
os.environ.setdefault("DATABASE_PATH", os.path.join(_TMPDIR, "test.db"))
os.environ.setdefault("JWT_SECRET_KEY", "pytest-only-secret-key-0123456789abcdef")
os.environ.setdefault("ENVIRONMENT", "test")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.models import Kid, User  # noqa: E402
from app.security import create_access_token, hash_password  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def _register(client: TestClient, email: str, name: str) -> str:
    """Register a user and return their access token."""
    res = client.post(
        "/api/auth/register",
        json={"email": email, "password": "pytest-pass-123", "display_name": name},
    )
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def parent_token(client) -> str:
    """First registered user — the family admin (and a parent)."""
    return _register(client, "parent1@example.com", "Parent One")


@pytest.fixture(scope="session")
def second_parent_token(client) -> str:
    """A later-registered, non-admin user — still a parent (v0.8.0 model)."""
    return _register(client, "parent2@example.com", "Parent Two")


def make_kid(client: TestClient, parent_token: str, name: str | None = None) -> dict:
    res = client.post(
        "/api/kids",
        json={"name": name or f"Kid-{uuid.uuid4().hex[:6]}"},
        headers=auth(parent_token),
    )
    assert res.status_code == 200, res.text
    return res.json()


def make_kid_account(kid_id: str) -> str:
    """Create a User linked to a Kid profile (the kid-role account) and return
    a JWT for it. Mirrors what the Google kid-sign-in flow produces; done
    directly at the DB layer since the OAuth flow isn't testable offline."""
    db = SessionLocal()
    try:
        user = User(
            email=f"kid-{uuid.uuid4().hex[:8]}@example.com",
            password_hash=hash_password("pytest-kid-pass-123"),
            display_name="Kid Account",
            is_admin=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        kid = db.query(Kid).filter(Kid.id == kid_id).first()
        assert kid is not None, f"kid {kid_id} not found"
        kid.user_id = user.id
        db.commit()
        return create_access_token({"sub": user.id})
    finally:
        db.close()


def set_kid_points(kid_id: str, points: float) -> None:
    """Directly set a kid's balance (test setup helper)."""
    db = SessionLocal()
    try:
        kid = db.query(Kid).filter(Kid.id == kid_id).first()
        kid.points = points
        db.commit()
    finally:
        db.close()


def make_chore(client: TestClient, parent_token: str, *, points: int = 10, **overrides) -> dict:
    body = {
        "name": f"Chore-{uuid.uuid4().hex[:6]}",
        "description": "pytest chore",
        "icon": "broom",
        "default_points": points,
        "assigned_kids": overrides.pop("assigned_kids", []),
        "recurring_frequency": "daily",
    }
    body.update(overrides)
    res = client.post("/api/chores", json=body, headers=auth(parent_token))
    assert res.status_code == 200, res.text
    return res.json()


def make_reward(client: TestClient, parent_token: str, *, cost: int = 50, requires_approval: bool = True) -> dict:
    res = client.post(
        "/api/rewards",
        json={
            "name": f"Reward-{uuid.uuid4().hex[:6]}",
            "description": "pytest reward",
            "icon": "gift",
            "cost": cost,
            "requires_approval": requires_approval,
        },
        headers=auth(parent_token),
    )
    assert res.status_code == 200, res.text
    return res.json()
