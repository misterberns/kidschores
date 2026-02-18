"""Approvals API endpoints - pending chore/reward approvals."""
import logging
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

logger = logging.getLogger(__name__)

from ..database import get_db
from ..deps import require_auth
from ..models import ChoreClaim, RewardClaim, Kid, Chore, Reward, User
from ..schemas import (
    PendingApprovalsResponse, ChoreClaimResponse, RewardClaimResponse,
    PendingCountResponse, ApprovalHistoryItem,
)

router = APIRouter()


@router.get("/pending", response_model=PendingApprovalsResponse)
def get_pending_approvals(db: Session = Depends(get_db), _user: User = Depends(require_auth)):
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


@router.get("/pending/count", response_model=PendingCountResponse)
def get_pending_count(db: Session = Depends(get_db), _user: User = Depends(require_auth)):
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


@router.get("/history", response_model=List[ApprovalHistoryItem])
def get_approval_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    _user: User = Depends(require_auth),
):
    """Get recent approval history."""
    chore_history = db.query(ChoreClaim).options(
        joinedload(ChoreClaim.kid),
        joinedload(ChoreClaim.chore),
    ).filter(
        ChoreClaim.status.in_(["approved", "disapproved"])
    ).order_by(ChoreClaim.approved_at.desc()).limit(limit).all()

    reward_history = db.query(RewardClaim).options(
        joinedload(RewardClaim.kid),
        joinedload(RewardClaim.reward),
    ).filter(
        RewardClaim.status.in_(["approved", "disapproved"])
    ).order_by(RewardClaim.approved_at.desc()).limit(limit).all()

    # Combine and sort
    all_history = []

    for claim in chore_history:
        all_history.append({
            "type": "chore",
            "id": claim.id,
            "kid_name": claim.kid.name if claim.kid else "Unknown",
            "item_name": claim.chore.name if claim.chore else "Unknown",
            "status": claim.status,
            "points": claim.points_awarded,
            "approved_by": claim.approved_by,
            "timestamp": claim.approved_at
        })

    for claim in reward_history:
        all_history.append({
            "type": "reward",
            "id": claim.id,
            "kid_name": claim.kid.name if claim.kid else "Unknown",
            "item_name": claim.reward.name if claim.reward else "Unknown",
            "status": claim.status,
            "points": -claim.points_spent if claim.points_spent else 0,
            "approved_by": claim.approved_by,
            "timestamp": claim.approved_at
        })

    # Sort by timestamp
    all_history.sort(key=lambda x: x["timestamp"] or "", reverse=True)

    return all_history[:limit]
