"""Kids API endpoints."""
from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_auth, require_admin
from ..models import Kid, Chore, ChoreClaim, DailyMultiplier, User
from ..schemas import (
    KidCreate, KidUpdate, KidResponse, KidStats, PointsAdjustRequest,
    StreakInfo, DailyProgressResponse
)

# Streak milestones
STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 365]

router = APIRouter()


@router.get("", response_model=List[KidResponse])
@router.get("/", response_model=List[KidResponse], include_in_schema=False)
def list_kids(db: Session = Depends(get_db)):
    """List all kids."""
    return db.query(Kid).all()


@router.post("", response_model=KidResponse)
@router.post("/", response_model=KidResponse, include_in_schema=False)
def create_kid(kid: KidCreate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
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
def update_kid(kid_id: str, kid_update: KidUpdate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
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
def delete_kid(kid_id: str, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
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
def adjust_points(kid_id: str, request: PointsAdjustRequest, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
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


@router.get("/{kid_id}/streaks", response_model=StreakInfo)
def get_kid_streaks(kid_id: str, db: Session = Depends(get_db)):
    """Get detailed streak information for a kid."""
    kid = db.query(Kid).filter(Kid.id == kid_id).first()
    if not kid:
        raise HTTPException(status_code=404, detail="Kid not found")

    # Determine next milestone
    current_streak = kid.overall_chore_streak
    next_milestone = None
    days_to_next = None

    for milestone in STREAK_MILESTONES:
        if milestone > current_streak:
            next_milestone = milestone
            days_to_next = milestone - current_streak
            break

    # Check if streak is at risk (no chores completed today yet)
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today + timedelta(days=1)

    todays_completions = db.query(ChoreClaim).filter(
        ChoreClaim.kid_id == kid_id,
        ChoreClaim.status == "approved",
        ChoreClaim.approved_at >= today,
        ChoreClaim.approved_at < today_end
    ).count()

    is_at_risk = current_streak > 0 and todays_completions == 0

    return StreakInfo(
        overall_streak=kid.overall_chore_streak,
        longest_streak_ever=kid.longest_streak_ever,
        streak_freeze_count=kid.streak_freeze_count,
        chore_streaks=kid.chore_streaks or {},
        is_streak_at_risk=is_at_risk,
        next_milestone=next_milestone,
        days_to_next_milestone=days_to_next
    )


@router.post("/{kid_id}/streak-freeze", response_model=KidResponse)
def use_streak_freeze(kid_id: str, db: Session = Depends(get_db)):
    """Use a streak freeze to protect the streak for one day."""
    kid = db.query(Kid).filter(Kid.id == kid_id).first()
    if not kid:
        raise HTTPException(status_code=404, detail="Kid not found")

    if kid.streak_freeze_count <= 0:
        raise HTTPException(status_code=400, detail="No streak freezes available")

    kid.streak_freeze_count -= 1
    db.commit()
    db.refresh(kid)

    return kid


@router.get("/{kid_id}/daily-progress", response_model=DailyProgressResponse)
def get_daily_progress(kid_id: str, db: Session = Depends(get_db)):
    """Get daily chore completion progress for a kid."""
    kid = db.query(Kid).filter(Kid.id == kid_id).first()
    if not kid:
        raise HTTPException(status_code=404, detail="Kid not found")

    today = datetime.now()
    today_start = today.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    day_of_week = today.weekday()

    # Get all recurring chores assigned to kid for today
    all_chores = db.query(Chore).all()
    todays_chore_ids = []

    for chore in all_chores:
        if kid_id not in (chore.assigned_kids or []):
            continue

        # Only count recurring chores for daily progress
        if chore.recurring_frequency == "daily":
            todays_chore_ids.append(chore.id)
        elif chore.recurring_frequency == "weekly":
            if not chore.applicable_days or day_of_week in chore.applicable_days:
                todays_chore_ids.append(chore.id)
        elif chore.recurring_frequency == "biweekly":
            week_number = today.isocalendar()[1]
            if week_number % 2 == 0:
                if not chore.applicable_days or day_of_week in chore.applicable_days:
                    todays_chore_ids.append(chore.id)
        elif chore.recurring_frequency == "monthly":
            if today.day == 1:
                todays_chore_ids.append(chore.id)

    total_chores = len(todays_chore_ids)

    # Count completed chores today
    completed_count = db.query(ChoreClaim).filter(
        ChoreClaim.kid_id == kid_id,
        ChoreClaim.chore_id.in_(todays_chore_ids),
        ChoreClaim.status == "approved",
        ChoreClaim.claimed_at >= today_start,
        ChoreClaim.claimed_at < today_end
    ).count() if todays_chore_ids else 0

    all_completed = completed_count == total_chores and total_chores > 0
    completion_pct = (completed_count / total_chores * 100) if total_chores > 0 else 0

    # Check daily multiplier record
    daily_record = db.query(DailyMultiplier).filter(
        DailyMultiplier.kid_id == kid_id,
        DailyMultiplier.date == today_start
    ).first()

    bonus_awarded = daily_record.bonus_awarded if daily_record else False
    bonus_points = daily_record.bonus_points if daily_record else 0
    multiplier = 1.0 + (daily_record.bonus_multiplier if daily_record else 0)

    return DailyProgressResponse(
        kid_id=kid_id,
        date=today_start,
        total_chores=total_chores,
        completed_chores=completed_count,
        completion_percentage=round(completion_pct, 1),
        all_completed=all_completed,
        bonus_eligible=all_completed and not bonus_awarded,
        bonus_awarded=bonus_awarded,
        bonus_points=bonus_points,
        multiplier=multiplier
    )
