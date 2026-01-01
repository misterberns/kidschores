"""Kids API endpoints."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Kid, ChoreClaim
from ..schemas import (
    KidCreate, KidUpdate, KidResponse, KidStats, PointsAdjustRequest
)

router = APIRouter()


@router.get("", response_model=List[KidResponse])
@router.get("/", response_model=List[KidResponse], include_in_schema=False)
def list_kids(db: Session = Depends(get_db)):
    """List all kids."""
    return db.query(Kid).all()


@router.post("", response_model=KidResponse)
@router.post("/", response_model=KidResponse, include_in_schema=False)
def create_kid(kid: KidCreate, db: Session = Depends(get_db)):
    """Create a new kid."""
    db_kid = Kid(**kid.model_dump())
    db.add(db_kid)
    db.commit()
    db.refresh(db_kid)
    return db_kid


@router.get("/{kid_id}", response_model=KidResponse)
def get_kid(kid_id: str, db: Session = Depends(get_db)):
    """Get kid by ID."""
    kid = db.query(Kid).filter(Kid.id == kid_id).first()
    if not kid:
        raise HTTPException(status_code=404, detail="Kid not found")
    return kid


@router.put("/{kid_id}", response_model=KidResponse)
def update_kid(kid_id: str, kid_update: KidUpdate, db: Session = Depends(get_db)):
    """Update kid."""
    kid = db.query(Kid).filter(Kid.id == kid_id).first()
    if not kid:
        raise HTTPException(status_code=404, detail="Kid not found")

    update_data = kid_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(kid, field, value)

    db.commit()
    db.refresh(kid)
    return kid


@router.delete("/{kid_id}")
def delete_kid(kid_id: str, db: Session = Depends(get_db)):
    """Delete kid."""
    kid = db.query(Kid).filter(Kid.id == kid_id).first()
    if not kid:
        raise HTTPException(status_code=404, detail="Kid not found")

    db.delete(kid)
    db.commit()
    return {"message": "Kid deleted"}


@router.get("/{kid_id}/stats", response_model=KidStats)
def get_kid_stats(kid_id: str, db: Session = Depends(get_db)):
    """Get detailed kid statistics."""
    kid = db.query(Kid).filter(Kid.id == kid_id).first()
    if not kid:
        raise HTTPException(status_code=404, detail="Kid not found")

    # Count pending and claimed chores
    pending_count = db.query(ChoreClaim).filter(
        ChoreClaim.kid_id == kid_id,
        ChoreClaim.status == "pending"
    ).count()

    claimed_count = db.query(ChoreClaim).filter(
        ChoreClaim.kid_id == kid_id,
        ChoreClaim.status == "claimed"
    ).count()

    return KidStats(
        id=kid.id,
        name=kid.name,
        points=kid.points,
        points_multiplier=kid.points_multiplier,
        overall_chore_streak=kid.overall_chore_streak,
        completed_chores_today=kid.completed_chores_today,
        completed_chores_weekly=kid.completed_chores_weekly,
        completed_chores_monthly=kid.completed_chores_monthly,
        completed_chores_total=kid.completed_chores_total,
        badges=kid.badges or [],
        pending_chores=pending_count,
        claimed_chores=claimed_count,
    )


@router.post("/{kid_id}/points", response_model=KidResponse)
def adjust_points(kid_id: str, request: PointsAdjustRequest, db: Session = Depends(get_db)):
    """Add or deduct points from kid."""
    kid = db.query(Kid).filter(Kid.id == kid_id).first()
    if not kid:
        raise HTTPException(status_code=404, detail="Kid not found")

    kid.points += request.points

    # Track max points ever
    if kid.points > kid.max_points_ever:
        kid.max_points_ever = kid.points

    # Don't allow negative points
    if kid.points < 0:
        kid.points = 0

    db.commit()
    db.refresh(kid)
    return kid
