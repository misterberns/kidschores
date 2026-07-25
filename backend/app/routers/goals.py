"""Savings goals API endpoints (UX-REVIEW 5b).

Goals are denominated in POINTS and rendered as $ client-side via the kid's
points_per_dollar (carried on the list response). Progress is the kid's live
points balance vs target_points — "reached" is derived, never stored. Every
route keys on {kid_id} so require_kid_access covers both "kid manages own
goals" and "parent manages any" with no extra authz code.
"""
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_kid_access
from ..models import AllowanceSettings, Kid, SavingsGoal, User
from .allowance import PayoutResponse, create_payout
from .challenges import _naive_utc

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_ACTIVE_GOALS = 3


# Request/Response models
class GoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    icon: str = "piggy-bank"
    target_points: int = Field(gt=0)
    target_date: Optional[datetime] = None


class GoalUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    icon: Optional[str] = None
    target_points: Optional[int] = Field(default=None, gt=0)
    target_date: Optional[datetime] = None


class GoalResponse(BaseModel):
    id: str
    kid_id: str
    name: str
    icon: str
    target_points: int
    target_date: Optional[datetime]
    status: str
    payout_id: Optional[str]
    completed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class GoalWithProgress(GoalResponse):
    progress_pct: float  # clamped 0-100
    reached: bool


class GoalsListResponse(BaseModel):
    kid_id: str
    current_points: float
    points_per_dollar: int
    goals: List[GoalWithProgress]


class GoalConvertRequest(BaseModel):
    payout_method: str = "cash"  # cash, bank, gift_card


class GoalConvertResponse(BaseModel):
    goal: GoalResponse
    payout: PayoutResponse


def _points_per_dollar(db: Session, kid_id: str) -> int:
    settings = db.query(AllowanceSettings).filter(
        AllowanceSettings.kid_id == kid_id
    ).first()
    return settings.points_per_dollar if settings else 100


def _minimum_payout(db: Session, kid_id: str) -> float:
    settings = db.query(AllowanceSettings).filter(
        AllowanceSettings.kid_id == kid_id
    ).first()
    return settings.minimum_payout if settings else 1.0


def _with_progress(goal: SavingsGoal, current_points: float) -> GoalWithProgress:
    base = GoalResponse.model_validate(goal).model_dump()
    if goal.status == "active":
        pct = (current_points / goal.target_points) * 100 if goal.target_points else 0.0
        pct = max(0.0, min(100.0, pct))
        reached = current_points >= goal.target_points
    else:
        pct = 100.0
        reached = False  # completed goals aren't awaiting conversion
    return GoalWithProgress(**base, progress_pct=round(pct, 1), reached=reached)


def _get_kid(db: Session, kid_id: str) -> Kid:
    kid = db.query(Kid).filter(Kid.id == kid_id).first()
    if not kid:
        raise HTTPException(status_code=404, detail="Kid not found")
    return kid


def _get_goal(db: Session, kid_id: str, goal_id: str) -> SavingsGoal:
    goal = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id).first()
    if not goal or goal.kid_id != kid_id:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


def _validate_target(db: Session, kid_id: str, target_points: int) -> None:
    """Reject goals too small to ever convert (below the minimum payout)."""
    ppd = _points_per_dollar(db, kid_id)
    minimum = _minimum_payout(db, kid_id)
    if target_points / ppd < minimum:
        raise HTTPException(
            status_code=400,
            detail=f"Goal target is below the minimum payout of ${minimum:.2f} "
                   f"({int(minimum * ppd)} points)",
        )


@router.get("/{kid_id}", response_model=GoalsListResponse)
def list_goals(kid_id: str, db: Session = Depends(get_db), _user: User = Depends(require_kid_access)):
    """List a kid's savings goals (active first) with live progress."""
    kid = _get_kid(db, kid_id)
    goals = db.query(SavingsGoal).filter(SavingsGoal.kid_id == kid_id).all()
    active = sorted((g for g in goals if g.status == "active"), key=lambda g: g.created_at)
    completed = sorted(
        (g for g in goals if g.status != "active"),
        key=lambda g: g.completed_at or g.created_at,
        reverse=True,
    )
    return GoalsListResponse(
        kid_id=kid_id,
        current_points=kid.points,
        points_per_dollar=_points_per_dollar(db, kid_id),
        goals=[_with_progress(g, kid.points) for g in active + completed],
    )


@router.post("/{kid_id}", response_model=GoalResponse)
def create_goal(
    kid_id: str,
    body: GoalCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(require_kid_access),
):
    """Create a savings goal (cap: 3 active per kid)."""
    _get_kid(db, kid_id)

    active_count = db.query(SavingsGoal).filter(
        SavingsGoal.kid_id == kid_id,
        SavingsGoal.status == "active",
    ).count()
    if active_count >= MAX_ACTIVE_GOALS:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum of {MAX_ACTIVE_GOALS} active goals — complete or remove one first",
        )

    _validate_target(db, kid_id, body.target_points)

    goal = SavingsGoal(
        kid_id=kid_id,
        name=body.name,
        icon=body.icon,
        target_points=body.target_points,
        target_date=_naive_utc(body.target_date) if body.target_date else None,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.put("/{kid_id}/{goal_id}", response_model=GoalResponse)
def update_goal(
    kid_id: str,
    goal_id: str,
    body: GoalUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(require_kid_access),
):
    """Edit an active goal."""
    goal = _get_goal(db, kid_id, goal_id)
    if goal.status != "active":
        raise HTTPException(status_code=400, detail="Completed goals can't be edited")

    data = body.model_dump(exclude_unset=True)
    if "target_points" in data and data["target_points"] is not None:
        _validate_target(db, kid_id, data["target_points"])
    if "target_date" in data and data["target_date"] is not None:
        data["target_date"] = _naive_utc(data["target_date"])
    for field, value in data.items():
        setattr(goal, field, value)

    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{kid_id}/{goal_id}")
def delete_goal(
    kid_id: str,
    goal_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(require_kid_access),
):
    """Delete a goal (any status) — no points are touched."""
    goal = _get_goal(db, kid_id, goal_id)
    db.delete(goal)
    db.commit()
    return {"message": "Goal deleted"}


@router.post("/{kid_id}/{goal_id}/convert", response_model=GoalConvertResponse)
def convert_goal(
    kid_id: str,
    goal_id: str,
    body: GoalConvertRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_kid_access),
):
    """One-tap payout: convert exactly target_points via the allowance flow and
    mark the goal completed — atomically (create_payout doesn't commit, so the
    payout row, the points deduction, and the goal completion land together).
    """
    goal = _get_goal(db, kid_id, goal_id)
    if goal.status != "active":
        raise HTTPException(status_code=400, detail="Goal is already completed")

    payout = create_payout(
        db,
        kid_id,
        goal.target_points,
        payout_method=body.payout_method,
        notes=f"Savings goal: {goal.name}",
    )
    db.flush()  # assigns payout.id (uuid default) without committing
    goal.status = "completed"
    goal.completed_at = datetime.now(timezone.utc)
    goal.payout_id = payout.id
    db.commit()
    db.refresh(goal)
    db.refresh(payout)
    logger.info("Savings goal converted: kid=%s goal=%s payout=%s", kid_id, goal_id, payout.id)

    return GoalConvertResponse(
        goal=GoalResponse.model_validate(goal),
        payout=PayoutResponse.model_validate(payout),
    )
