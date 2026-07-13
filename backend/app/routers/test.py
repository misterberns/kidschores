"""Test API endpoints - for E2E testing only.

This router is only registered when ENVIRONMENT != 'production' (see main.py).
"""
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_admin
from ..models import (
    ChoreClaim, RewardClaim, Chore, Reward, Kid, Parent,
    ChoreCategory, AllowancePayout, AllowanceSettings,
    Badge, Bonus, Penalty, Challenge, DailyMultiplier, ScheduledJobLog,
    PushSubscription, NotificationPreference, User,
)

router = APIRouter()

# Environments in which the destructive test endpoints are permitted (fail-closed).
_ALLOWED_TEST_ENVS = {"development", "dev", "test", "e2e"}


@router.post("/reset")
def reset_database(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    """
    Reset database for testing - clears all entity data.

    Preserves User accounts so the test user can still login.
    Requires an authenticated admin AND an explicit non-production ENVIRONMENT
    (defense in depth on top of the fail-closed router mount in main.py).
    """
    env = os.environ.get("ENVIRONMENT", "").strip().lower()
    if env not in _ALLOWED_TEST_ENVS:
        raise HTTPException(
            status_code=403,
            detail="Database reset not allowed in this environment"
        )

    try:
        # Delete in FK-safe order (children before parents)

        # 1. Claims and payouts (reference kids + chores/rewards)
        db.query(ChoreClaim).delete()
        db.query(RewardClaim).delete()
        db.query(AllowancePayout).delete()

        # 2. Gamification (reference kids)
        db.query(Badge).delete()
        db.query(Challenge).delete()
        db.query(Bonus).delete()
        db.query(Penalty).delete()
        db.query(DailyMultiplier).delete()

        # 3. Notifications (reference kids/users)
        db.query(PushSubscription).delete()
        db.query(NotificationPreference).delete()

        # 4. Chores and rewards
        db.query(Chore).delete()
        db.query(Reward).delete()

        # 5. Categories and settings
        db.query(ChoreCategory).delete()
        db.query(AllowanceSettings).delete()

        # 6. Kids and parents
        db.query(Kid).delete()
        db.query(Parent).delete()

        # 7. Scheduler logs
        db.query(ScheduledJobLog).delete()

        # The badge CATALOG is reference data seeded at startup — restore it
        # after the wipe so gamification keeps working across resets.
        from ..services.gamification import seed_default_badges
        db.commit()
        seed_default_badges(db)

        db.commit()

        return {"status": "reset complete", "message": "All entity data cleared (users preserved)"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")


@router.post("/kid-account")
def create_kid_account(
    payload: dict,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Create a kid-linked User account and return a token for it (E2E only).

    The real linkage happens inside the Google OAuth callback, which is not
    testable offline — this mirrors backend/tests/conftest.py::make_kid_account
    at the HTTP layer so Playwright can drive a role='kid' session. A plain
    {"sub": user.id} token suffices: /auth/me derives the role from the DB.

    Body: {"kid_id": "<existing kid id>"}  (or {"name": "..."} to create one)
    """
    env = os.environ.get("ENVIRONMENT", "").strip().lower()
    if env not in _ALLOWED_TEST_ENVS:
        raise HTTPException(
            status_code=403,
            detail="Test kid-account creation not allowed in this environment"
        )

    import uuid as _uuid
    from ..security import create_access_token, hash_password

    kid_id = payload.get("kid_id")
    if kid_id:
        kid = db.query(Kid).filter(Kid.id == kid_id).first()
        if not kid:
            raise HTTPException(status_code=404, detail="Kid not found")
    else:
        kid = Kid(name=payload.get("name") or f"E2E Kid {_uuid.uuid4().hex[:6]}")
        db.add(kid)
        db.flush()

    if kid.user_id:
        raise HTTPException(status_code=400, detail="Kid already has a linked account")

    user = User(
        email=f"e2e-kid-{_uuid.uuid4().hex[:8]}@example.com",
        password_hash=hash_password(f"e2e-kid-pass-{_uuid.uuid4().hex[:8]}"),
        display_name=f"{kid.name} (e2e kid account)",
    )
    db.add(user)
    db.flush()
    kid.user_id = user.id
    db.commit()

    return {
        "access_token": create_access_token({"sub": user.id}),
        "kid_id": kid.id,
        "user_id": user.id,
    }


@router.get("/status")
def test_status(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    """Get current database entity counts - useful for test debugging."""
    return {
        "kids": db.query(Kid).count(),
        "parents": db.query(Parent).count(),
        "chores": db.query(Chore).count(),
        "rewards": db.query(Reward).count(),
        "categories": db.query(ChoreCategory).count(),
        "chore_claims": db.query(ChoreClaim).count(),
        "reward_claims": db.query(RewardClaim).count(),
    }
