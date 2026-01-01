"""Chores API endpoints."""
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Chore, ChoreClaim, Kid
from ..schemas import (
    ChoreCreate, ChoreUpdate, ChoreResponse, ChoreWithStatus,
    ChoreClaimRequest, ChoreApproveRequest, ChoreClaimResponse
)

router = APIRouter()


@router.get("", response_model=List[ChoreResponse])
@router.get("/", response_model=List[ChoreResponse], include_in_schema=False)
def list_chores(db: Session = Depends(get_db)):
    """List all chores."""
    return db.query(Chore).all()


@router.post("", response_model=ChoreResponse)
@router.post("/", response_model=ChoreResponse, include_in_schema=False)
def create_chore(chore: ChoreCreate, db: Session = Depends(get_db)):
    """Create a new chore."""
    db_chore = Chore(**chore.model_dump())
    db.add(db_chore)
    db.commit()
    db.refresh(db_chore)
    return db_chore


@router.get("/{chore_id}", response_model=ChoreResponse)
def get_chore(chore_id: str, db: Session = Depends(get_db)):
    """Get chore by ID."""
    chore = db.query(Chore).filter(Chore.id == chore_id).first()
    if not chore:
        raise HTTPException(status_code=404, detail="Chore not found")
    return chore


@router.put("/{chore_id}", response_model=ChoreResponse)
def update_chore(chore_id: str, chore_update: ChoreUpdate, db: Session = Depends(get_db)):
    """Update chore."""
    chore = db.query(Chore).filter(Chore.id == chore_id).first()
    if not chore:
        raise HTTPException(status_code=404, detail="Chore not found")

    update_data = chore_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(chore, field, value)

    db.commit()
    db.refresh(chore)
    return chore


@router.delete("/{chore_id}")
def delete_chore(chore_id: str, db: Session = Depends(get_db)):
    """Delete chore."""
    chore = db.query(Chore).filter(Chore.id == chore_id).first()
    if not chore:
        raise HTTPException(status_code=404, detail="Chore not found")

    db.delete(chore)
    db.commit()
    return {"message": "Chore deleted"}


@router.get("/kid/{kid_id}", response_model=List[ChoreWithStatus])
def get_chores_for_kid(kid_id: str, db: Session = Depends(get_db)):
    """Get all chores assigned to a kid with their status."""
    kid = db.query(Kid).filter(Kid.id == kid_id).first()
    if not kid:
        raise HTTPException(status_code=404, detail="Kid not found")

    # Get all chores where kid is assigned
    chores = db.query(Chore).all()
    result = []

    for chore in chores:
        if kid_id in (chore.assigned_kids or []):
            # Check if there's an active claim
            claim = db.query(ChoreClaim).filter(
                ChoreClaim.chore_id == chore.id,
                ChoreClaim.kid_id == kid_id,
                ChoreClaim.status.in_(["claimed", "pending"])
            ).first()

            status = "pending"
            claimed_by = None
            if claim:
                status = claim.status
                claimed_by = kid.name

            # Check if overdue
            if chore.due_date and chore.due_date < datetime.utcnow() and status == "pending":
                status = "overdue"

            result.append(ChoreWithStatus(
                **{k: v for k, v in chore.__dict__.items() if not k.startswith('_')},
                status=status,
                claimed_by=claimed_by
            ))

    return result


@router.post("/{chore_id}/claim", response_model=ChoreClaimResponse)
def claim_chore(chore_id: str, request: ChoreClaimRequest, db: Session = Depends(get_db)):
    """Kid claims a chore."""
    chore = db.query(Chore).filter(Chore.id == chore_id).first()
    if not chore:
        raise HTTPException(status_code=404, detail="Chore not found")

    kid = db.query(Kid).filter(Kid.id == request.kid_id).first()
    if not kid:
        raise HTTPException(status_code=404, detail="Kid not found")

    # Check if kid is assigned to this chore
    if request.kid_id not in (chore.assigned_kids or []):
        raise HTTPException(status_code=400, detail="Kid not assigned to this chore")

    # Check for existing claim if multiple claims not allowed
    if not chore.allow_multiple_claims_per_day:
        existing = db.query(ChoreClaim).filter(
            ChoreClaim.chore_id == chore_id,
            ChoreClaim.kid_id == request.kid_id,
            ChoreClaim.status.in_(["claimed", "approved"])
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Chore already claimed today")

    # Create claim
    claim = ChoreClaim(
        kid_id=request.kid_id,
        chore_id=chore_id,
        status="claimed"
    )
    db.add(claim)

    # Update chore last_claimed
    chore.last_claimed = datetime.utcnow()

    db.commit()
    db.refresh(claim)
    return claim


@router.post("/{chore_id}/approve", response_model=ChoreClaimResponse)
def approve_chore(chore_id: str, request: ChoreApproveRequest, db: Session = Depends(get_db)):
    """Parent approves a claimed chore."""
    # Find the pending claim
    claim = db.query(ChoreClaim).filter(
        ChoreClaim.chore_id == chore_id,
        ChoreClaim.status == "claimed"
    ).first()

    if not claim:
        raise HTTPException(status_code=404, detail="No pending claim found for this chore")

    chore = db.query(Chore).filter(Chore.id == chore_id).first()
    kid = db.query(Kid).filter(Kid.id == claim.kid_id).first()

    # Calculate points
    points = request.points_awarded if request.points_awarded else chore.default_points
    points_with_multiplier = points * kid.points_multiplier

    # Update claim
    claim.status = "approved"
    claim.approved_at = datetime.utcnow()
    claim.approved_by = request.parent_name
    claim.points_awarded = points_with_multiplier

    # Award points to kid
    kid.points += points_with_multiplier
    if kid.points > kid.max_points_ever:
        kid.max_points_ever = kid.points

    # Update kid's completion stats
    kid.completed_chores_today += 1
    kid.completed_chores_weekly += 1
    kid.completed_chores_monthly += 1
    kid.completed_chores_total += 1

    # Update chore last_completed
    chore.last_completed = datetime.utcnow()

    db.commit()
    db.refresh(claim)
    return claim


@router.post("/{chore_id}/disapprove")
def disapprove_chore(chore_id: str, request: ChoreApproveRequest, db: Session = Depends(get_db)):
    """Parent disapproves a claimed chore."""
    claim = db.query(ChoreClaim).filter(
        ChoreClaim.chore_id == chore_id,
        ChoreClaim.status == "claimed"
    ).first()

    if not claim:
        raise HTTPException(status_code=404, detail="No pending claim found for this chore")

    claim.status = "disapproved"
    claim.approved_at = datetime.utcnow()
    claim.approved_by = request.parent_name

    db.commit()
    return {"message": "Chore disapproved"}
