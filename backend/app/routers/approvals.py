"""Approvals API endpoints - pending chore/reward approvals."""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ChoreClaim, RewardClaim, Kid, Chore, Reward
from ..schemas import PendingApprovalsResponse, ChoreClaimResponse, RewardClaimResponse

router = APIRouter()


@router.get("/pending", response_model=PendingApprovalsResponse)
def get_pending_approvals(db: Session = Depends(get_db)):
    """Get all pending approvals for parents to review."""
    # Get pending chore claims
    chore_claims = db.query(ChoreClaim).filter(
        ChoreClaim.status == "claimed"
    ).all()

    # Get pending reward claims
    reward_claims = db.query(RewardClaim).filter(
        RewardClaim.status == "pending"
    ).all()

    return PendingApprovalsResponse(
        chores=[ChoreClaimResponse.model_validate(c) for c in chore_claims],
        rewards=[RewardClaimResponse.model_validate(c) for c in reward_claims]
    )


@router.get("/pending/count")
def get_pending_count(db: Session = Depends(get_db)):
    """Get count of pending approvals."""
    chore_count = db.query(ChoreClaim).filter(
        ChoreClaim.status == "claimed"
    ).count()

    reward_count = db.query(RewardClaim).filter(
        RewardClaim.status == "pending"
    ).count()

    return {
        "chores": chore_count,
        "rewards": reward_count,
        "total": chore_count + reward_count
    }


@router.get("/history")
def get_approval_history(
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get recent approval history."""
    chore_history = db.query(ChoreClaim).filter(
        ChoreClaim.status.in_(["approved", "disapproved"])
    ).order_by(ChoreClaim.approved_at.desc()).limit(limit).all()

    reward_history = db.query(RewardClaim).filter(
        RewardClaim.status.in_(["approved", "disapproved"])
    ).order_by(RewardClaim.approved_at.desc()).limit(limit).all()

    # Combine and sort
    all_history = []

    for claim in chore_history:
        kid = db.query(Kid).filter(Kid.id == claim.kid_id).first()
        chore = db.query(Chore).filter(Chore.id == claim.chore_id).first()
        all_history.append({
            "type": "chore",
            "id": claim.id,
            "kid_name": kid.name if kid else "Unknown",
            "item_name": chore.name if chore else "Unknown",
            "status": claim.status,
            "points": claim.points_awarded,
            "approved_by": claim.approved_by,
            "timestamp": claim.approved_at
        })

    for claim in reward_history:
        kid = db.query(Kid).filter(Kid.id == claim.kid_id).first()
        reward = db.query(Reward).filter(Reward.id == claim.reward_id).first()
        all_history.append({
            "type": "reward",
            "id": claim.id,
            "kid_name": kid.name if kid else "Unknown",
            "item_name": reward.name if reward else "Unknown",
            "status": claim.status,
            "points": -claim.points_spent if claim.points_spent else 0,
            "approved_by": claim.approved_by,
            "timestamp": claim.approved_at
        })

    # Sort by timestamp
    all_history.sort(key=lambda x: x["timestamp"] or "", reverse=True)

    return all_history[:limit]
