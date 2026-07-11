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
