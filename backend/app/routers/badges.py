"""Badge catalog + manual grants (the previously-orphaned badges engine)."""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_auth, require_parent
from ..models import Badge, Kid, User
from ..services.gamification import AUTO_THRESHOLD_TYPES, grant_badge

router = APIRouter()


class BadgeResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    icon: str
    threshold_type: str
    threshold_value: int
    points_multiplier_bonus: float
    created_at: datetime

    class Config:
        from_attributes = True


class BadgeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    icon: str = "medal"
    threshold_type: str = "special"  # auto types or "special" (manual grant only)
    threshold_value: int = Field(default=0, ge=0)
    points_multiplier_bonus: float = Field(default=0.0, ge=0, le=1)


class BadgeUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = None
    threshold_type: Optional[str] = None
    threshold_value: Optional[int] = Field(default=None, ge=0)
    points_multiplier_bonus: Optional[float] = Field(default=None, ge=0, le=1)


_VALID_TYPES = AUTO_THRESHOLD_TYPES | {"special"}


@router.get("", response_model=List[BadgeResponse])
@router.get("/", response_model=List[BadgeResponse], include_in_schema=False)
def list_badges(db: Session = Depends(get_db), _user: User = Depends(require_auth)):
    """Badge catalog — readable by every family member (kids see locked badges)."""
    return db.query(Badge).all()


@router.post("", response_model=BadgeResponse)
@router.post("/", response_model=BadgeResponse, include_in_schema=False)
def create_badge(body: BadgeCreate, db: Session = Depends(get_db), _parent: User = Depends(require_parent)):
    if body.threshold_type not in _VALID_TYPES:
        raise HTTPException(status_code=422, detail=f"threshold_type must be one of {sorted(_VALID_TYPES)}")
    badge = Badge(**body.model_dump())
    db.add(badge)
    db.commit()
    db.refresh(badge)
    return badge


@router.put("/{badge_id}", response_model=BadgeResponse)
def update_badge(badge_id: str, body: BadgeUpdate, db: Session = Depends(get_db), _parent: User = Depends(require_parent)):
    badge = db.query(Badge).filter(Badge.id == badge_id).first()
    if not badge:
        raise HTTPException(status_code=404, detail="Badge not found")
    updates = body.model_dump(exclude_unset=True)
    if "threshold_type" in updates and updates["threshold_type"] not in _VALID_TYPES:
        raise HTTPException(status_code=422, detail=f"threshold_type must be one of {sorted(_VALID_TYPES)}")
    for key, value in updates.items():
        setattr(badge, key, value)
    db.commit()
    db.refresh(badge)
    return badge


@router.delete("/{badge_id}")
def delete_badge(badge_id: str, db: Session = Depends(get_db), _parent: User = Depends(require_parent)):
    badge = db.query(Badge).filter(Badge.id == badge_id).first()
    if not badge:
        raise HTTPException(status_code=404, detail="Badge not found")
    db.delete(badge)
    db.commit()
    return {"message": "Badge deleted"}


@router.post("/{badge_id}/award/{kid_id}", response_model=dict)
def award_badge_manually(badge_id: str, kid_id: str, db: Session = Depends(get_db), _parent: User = Depends(require_parent)):
    """Parent manually grants any badge (covers the 'special' catalog rows)."""
    badge = db.query(Badge).filter(Badge.id == badge_id).first()
    if not badge:
        raise HTTPException(status_code=404, detail="Badge not found")
    kid = db.query(Kid).filter(Kid.id == kid_id).first()
    if not kid:
        raise HTTPException(status_code=404, detail="Kid not found")
    newly = grant_badge(db, kid, badge)
    db.commit()
    return {"awarded": newly, "badge_id": badge.id, "kid_id": kid.id}
