"""Time-boxed challenges (UX-REVIEW 5a Phase 2)."""
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_user_kid, require_auth, require_parent
from ..models import Badge, Challenge, Kid, User
from ..services.gamification import challenge_progress

router = APIRouter()


class ChallengeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    icon: str = "target"
    target_type: str = "chore_count"  # chore_count | points_earned
    target_value: int = Field(gt=0)
    start_date: datetime
    end_date: datetime
    kid_ids: List[str] = []  # empty = all kids
    badge_id: Optional[str] = None
    bonus_points: int = Field(default=0, ge=0)


class ChallengeResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    icon: str
    target_type: str
    target_value: int
    start_date: datetime
    end_date: datetime
    kid_ids: List[str]
    badge_id: Optional[str]
    bonus_points: int
    completed_kids: List[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ChallengeProgressEntry(BaseModel):
    kid_id: str
    kid_name: str
    progress: float
    target: int
    completed: bool


class ChallengeWithProgress(ChallengeResponse):
    active: bool
    progress: List[ChallengeProgressEntry]


def _naive_utc(dt: datetime) -> datetime:
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def _with_progress(db: Session, ch: Challenge, kids: List[Kid]) -> ChallengeWithProgress:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    scope = ch.kid_ids or []
    entries = []
    for kid in kids:
        if scope and kid.id not in scope:
            continue
        entries.append(ChallengeProgressEntry(
            kid_id=kid.id,
            kid_name=kid.name,
            progress=challenge_progress(db, ch, kid.id),
            target=ch.target_value,
            completed=kid.id in (ch.completed_kids or []),
        ))
    base = ChallengeResponse.model_validate(ch).model_dump()
    return ChallengeWithProgress(
        **base,
        active=ch.start_date <= now <= ch.end_date,
        progress=entries,
    )


@router.get("", response_model=List[ChallengeWithProgress])
@router.get("/", response_model=List[ChallengeWithProgress], include_in_schema=False)
def list_challenges(
    active_only: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(require_auth),
):
    """List challenges with live per-kid progress. Kid accounts see only
    challenges that include them (and only their own progress row)."""
    kids = db.query(Kid).all()
    own_kid = get_user_kid(db, user)
    if own_kid is not None:
        kids = [own_kid]

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    q = db.query(Challenge)
    challenges = q.all()
    out = []
    for ch in challenges:
        if active_only and not (ch.start_date <= now <= ch.end_date):
            continue
        scope = ch.kid_ids or []
        if own_kid is not None and scope and own_kid.id not in scope:
            continue
        out.append(_with_progress(db, ch, kids))
    return out


@router.post("", response_model=ChallengeResponse)
@router.post("/", response_model=ChallengeResponse, include_in_schema=False)
def create_challenge(body: ChallengeCreate, db: Session = Depends(get_db), _parent: User = Depends(require_parent)):
    if body.target_type not in {"chore_count", "points_earned"}:
        raise HTTPException(status_code=422, detail="target_type must be chore_count or points_earned")
    start = _naive_utc(body.start_date)
    end = _naive_utc(body.end_date)
    if end <= start:
        raise HTTPException(status_code=422, detail="end_date must be after start_date")
    if body.badge_id and not db.query(Badge).filter(Badge.id == body.badge_id).first():
        raise HTTPException(status_code=404, detail="Reward badge not found")
    challenge = Challenge(
        **{**body.model_dump(), "start_date": start, "end_date": end}
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    return challenge


@router.delete("/{challenge_id}")
def delete_challenge(challenge_id: str, db: Session = Depends(get_db), _parent: User = Depends(require_parent)):
    ch = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Challenge not found")
    db.delete(ch)
    db.commit()
    return {"message": "Challenge deleted"}


@router.get("/templates", response_model=List[dict])
def challenge_templates(_user: User = Depends(require_parent)):
    """Starter templates the admin UI offers (dates are filled client-side)."""
    now = datetime.now(timezone.utc)
    week = now + timedelta(days=7)
    weekend_start = now
    weekend_end = now + timedelta(days=2)
    return [
        {
            "name": "Weekend Warrior",
            "description": "Complete 5 chores this weekend",
            "icon": "zap",
            "target_type": "chore_count",
            "target_value": 5,
            "start_date": weekend_start.isoformat(),
            "end_date": weekend_end.isoformat(),
            "bonus_points": 25,
        },
        {
            "name": "Point Sprint",
            "description": "Earn 100 points this week",
            "icon": "target",
            "target_type": "points_earned",
            "target_value": 100,
            "start_date": now.isoformat(),
            "end_date": week.isoformat(),
            "bonus_points": 50,
        },
        {
            "name": "Perfect Week",
            "description": "Complete 7 chores in 7 days",
            "icon": "check-circle",
            "target_type": "chore_count",
            "target_value": 7,
            "start_date": now.isoformat(),
            "end_date": week.isoformat(),
            "badge_id": "perfectionist",
            "bonus_points": 30,
        },
    ]
