"""Test API endpoints - for E2E testing only.

This router is only registered when ENVIRONMENT != 'production' (see main.py).
"""
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    ChoreClaim, RewardClaim, Chore, Reward, Kid, Parent,
    ChoreCategory, AllowancePayout, AllowanceSettings,
    Badge, Bonus, Penalty, DailyMultiplier, ScheduledJobLog,
    PushSubscription, NotificationPreference,
)

router = APIRouter()


@router.post("/reset")
def reset_database(db: Session = Depends(get_db)):
    """
    Reset database for testing - clears all entity data.

    Preserves User accounts so the test user can still login.
    Only available when ENVIRONMENT != 'production'.
    """
    env = os.environ.get("ENVIRONMENT", "development")
    if env == "production":
        raise HTTPException(
            status_code=403,
            detail="Database reset not allowed in production"
        )

    try:
        # Delete in FK-safe order (children before parents)

        # 1. Claims and payouts (reference kids + chores/rewards)
        db.query(ChoreClaim).delete()
        db.query(RewardClaim).delete()
        db.query(AllowancePayout).delete()

        # 2. Gamification (reference kids)
        db.query(Badge).delete()
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

        db.commit()

        return {"status": "reset complete", "message": "All entity data cleared (users preserved)"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")


@router.get("/status")
def test_status(db: Session = Depends(get_db)):
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
