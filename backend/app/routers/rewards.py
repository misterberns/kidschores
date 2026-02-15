"""Rewards API endpoints."""
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_admin
from ..models import Reward, RewardClaim, Kid, User
from ..schemas import (
    RewardCreate, RewardUpdate, RewardResponse,
    RewardRedeemRequest, RewardApproveRequest, RewardClaimResponse
)

router = APIRouter()


@router.get("", response_model=List[RewardResponse])
@router.get("/", response_model=List[RewardResponse], include_in_schema=False)
def list_rewards(db: Session = Depends(get_db)):
    """List all rewards."""
    return db.query(Reward).all()


@router.post("", response_model=RewardResponse)
@router.post("/", response_model=RewardResponse, include_in_schema=False)
def create_reward(reward: RewardCreate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    """Create a new reward."""
    db_reward = Reward(**reward.model_dump())
    db.add(db_reward)
    db.commit()
    db.refresh(db_reward)
    return db_reward


@router.get("/{reward_id}", response_model=RewardResponse)
def get_reward(reward_id: str, db: Session = Depends(get_db)):
    """Get reward by ID."""
    reward = db.query(Reward).filter(Reward.id == reward_id).first()
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    return reward


@router.put("/{reward_id}", response_model=RewardResponse)
def update_reward(reward_id: str, reward_update: RewardUpdate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    """Update reward."""
    reward = db.query(Reward).filter(Reward.id == reward_id).first()
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")

    update_data = reward_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(reward, field, value)

    db.commit()
    db.refresh(reward)
    return reward


@router.delete("/{reward_id}")
def delete_reward(reward_id: str, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    """Delete reward."""
    reward = db.query(Reward).filter(Reward.id == reward_id).first()
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")

    db.delete(reward)
    db.commit()
    return {"message": "Reward deleted"}


@router.post("/{reward_id}/redeem", response_model=RewardClaimResponse)
def redeem_reward(reward_id: str, request: RewardRedeemRequest, db: Session = Depends(get_db)):
    """Kid requests to redeem a reward."""
    reward = db.query(Reward).filter(Reward.id == reward_id).first()
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")

    kid = db.query(Kid).filter(Kid.id == request.kid_id).first()
    if not kid:
        raise HTTPException(status_code=404, detail="Kid not found")

    # Check if kid is eligible
    if reward.eligible_kids and request.kid_id not in reward.eligible_kids:
        raise HTTPException(status_code=400, detail="Kid not eligible for this reward")

    # Check if kid has enough points
    if kid.points < reward.cost:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough points. Need {reward.cost}, have {kid.points}"
        )

    # Create claim
    status = "pending" if reward.requires_approval else "approved"
    claim = RewardClaim(
        kid_id=request.kid_id,
        reward_id=reward_id,
        status=status,
        points_spent=reward.cost
    )

    # If no approval required, deduct points immediately
    if not reward.requires_approval:
        kid.points -= reward.cost
        claim.approved_at = datetime.now(timezone.utc)

    db.add(claim)
    db.commit()
    db.refresh(claim)
    return claim


@router.post("/{reward_id}/approve", response_model=RewardClaimResponse)
def approve_reward(reward_id: str, request: RewardApproveRequest, db: Session = Depends(get_db)):
    """Parent approves a reward redemption."""
    # Find pending claim
    claim = db.query(RewardClaim).filter(
        RewardClaim.reward_id == reward_id,
        RewardClaim.status == "pending"
    ).first()

    if not claim:
        raise HTTPException(status_code=404, detail="No pending redemption found")

    reward = db.query(Reward).filter(Reward.id == reward_id).first()
    kid = db.query(Kid).filter(Kid.id == claim.kid_id).first()

    # Deduct points
    kid.points -= reward.cost

    # Update claim
    claim.status = "approved"
    claim.approved_at = datetime.now(timezone.utc)
    claim.approved_by = request.parent_name

    db.commit()
    db.refresh(claim)
    return claim


@router.post("/{reward_id}/disapprove")
def disapprove_reward(reward_id: str, request: RewardApproveRequest, db: Session = Depends(get_db)):
    """Parent disapproves a reward redemption."""
    claim = db.query(RewardClaim).filter(
        RewardClaim.reward_id == reward_id,
        RewardClaim.status == "pending"
    ).first()

    if not claim:
        raise HTTPException(status_code=404, detail="No pending redemption found")

    claim.status = "disapproved"
    claim.approved_at = datetime.now(timezone.utc)
    claim.approved_by = request.parent_name

    db.commit()
    return {"message": "Reward disapproved"}
