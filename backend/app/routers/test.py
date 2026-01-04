"""Test API endpoints - for E2E testing only."""
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..database import get_db
from ..models import ChoreClaim, RewardClaim, Chore, Reward, Kid, Parent

router = APIRouter()


@router.post("/reset")
def reset_database(db: Session = Depends(get_db)):
    """
    Reset database for testing - clears all data.

    This endpoint is intended for E2E testing only.
    In production, this should be disabled or protected.
    """
    # Check if we're in a test/dev environment
    # For now, we'll allow it but log a warning in production
    env = os.environ.get("ENVIRONMENT", "development")
    if env == "production":
        raise HTTPException(
            status_code=403,
            detail="Database reset not allowed in production"
        )

    try:
        # Delete in order respecting foreign key constraints
        # 1. Claims first (they reference both kids and chores/rewards)
        db.query(ChoreClaim).delete()
        db.query(RewardClaim).delete()

        # 2. Then chores and rewards
        db.query(Chore).delete()
        db.query(Reward).delete()

        # 3. Then kids and parents
        db.query(Kid).delete()
        db.query(Parent).delete()

        # Commit all deletions
        db.commit()

        return {"status": "reset complete", "message": "All data cleared"}

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
        "chore_claims": db.query(ChoreClaim).count(),
        "reward_claims": db.query(RewardClaim).count(),
    }
