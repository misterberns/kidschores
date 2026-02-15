"""Chores API endpoints."""
from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_admin
from ..models import Chore, ChoreClaim, Kid, DailyMultiplier, PushSubscription, User
from ..schemas import (
    ChoreCreate, ChoreUpdate, ChoreResponse, ChoreWithStatus,
    ChoreClaimRequest, ChoreApproveRequest, ChoreClaimResponse,
    TodaysChoreResponse, ApprovalWithStreakResponse
)
from ..services.push_service import push_service

# Streak milestones that trigger celebrations
STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 365]
DAILY_COMPLETION_BONUS = 10

router = APIRouter()


def notify_parents_chore_claimed(db: Session, kid_name: str, chore_name: str):
    """Send push notification to all parent devices when a chore is claimed."""
    # Get all parent subscriptions (subscriptions without kid_id)
    subscriptions = db.query(PushSubscription).filter(
        PushSubscription.kid_id.is_(None)
    ).all()

    for sub in subscriptions:
        subscription_info = {
            "endpoint": sub.endpoint,
            "keys": {
                "p256dh": sub.p256dh_key,
                "auth": sub.auth_key,
            }
        }
        try:
            push_service.send_chore_claimed(subscription_info, kid_name, chore_name)
        except Exception as e:
            print(f"Failed to send push notification: {e}")


def notify_kid_chore_approved(db: Session, kid_id: str, chore_name: str, points: int):
    """Send push notification to kid's devices when a chore is approved."""
    subscriptions = db.query(PushSubscription).filter(
        PushSubscription.kid_id == kid_id
    ).all()

    for sub in subscriptions:
        subscription_info = {
            "endpoint": sub.endpoint,
            "keys": {
                "p256dh": sub.p256dh_key,
                "auth": sub.auth_key,
            }
        }
        try:
            push_service.send_chore_approved(subscription_info, chore_name, points)
        except Exception as e:
            print(f"Failed to send push notification: {e}")


@router.get("", response_model=List[ChoreResponse])
@router.get("/", response_model=List[ChoreResponse], include_in_schema=False)
def list_chores(db: Session = Depends(get_db)):
    """List all chores."""
    return db.query(Chore).all()


@router.post("", response_model=ChoreResponse)
@router.post("/", response_model=ChoreResponse, include_in_schema=False)
def create_chore(chore: ChoreCreate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
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
def update_chore(chore_id: str, chore_update: ChoreUpdate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
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
def delete_chore(chore_id: str, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    """Delete chore."""
    chore = db.query(Chore).filter(Chore.id == chore_id).first()
    if not chore:
        raise HTTPException(status_code=404, detail="Chore not found")

    db.delete(chore)
    db.commit()
    return {"message": "Chore deleted"}


@router.get("/today/{kid_id}", response_model=List[TodaysChoreResponse])
def get_todays_chores(kid_id: str, db: Session = Depends(get_db)):
    """Get chores applicable for today for a specific kid."""
    kid = db.query(Kid).filter(Kid.id == kid_id).first()
    if not kid:
        raise HTTPException(status_code=404, detail="Kid not found")

    today = datetime.now()
    day_of_week = today.weekday()  # 0=Monday, 6=Sunday
    today_start = today.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    # Get all chores where kid is assigned
    all_chores = db.query(Chore).all()
    result = []

    for chore in all_chores:
        if kid_id not in (chore.assigned_kids or []):
            continue

        # Check if chore is applicable today based on recurring settings
        is_applicable = False
        is_recurring = False

        if chore.recurring_frequency == "none" or chore.recurring_frequency is None:
            is_applicable = True  # Non-recurring chores always show
        elif chore.recurring_frequency == "daily":
            is_applicable = True
            is_recurring = True
        elif chore.recurring_frequency == "weekly":
            if not chore.applicable_days or day_of_week in chore.applicable_days:
                is_applicable = True
            is_recurring = True
        elif chore.recurring_frequency == "biweekly":
            week_number = today.isocalendar()[1]
            if week_number % 2 == 0:
                if not chore.applicable_days or day_of_week in chore.applicable_days:
                    is_applicable = True
            is_recurring = True
        elif chore.recurring_frequency == "monthly":
            if today.day == 1:
                is_applicable = True
            is_recurring = True

        if not is_applicable:
            continue

        # Check claim status for today
        claim = db.query(ChoreClaim).filter(
            ChoreClaim.chore_id == chore.id,
            ChoreClaim.kid_id == kid_id,
            ChoreClaim.claimed_at >= today_start,
            ChoreClaim.claimed_at < today_end
        ).order_by(ChoreClaim.claimed_at.desc()).first()

        status = "pending"
        claimed_by = None
        if claim:
            status = claim.status
            claimed_by = kid.name

        # Get streak count for this chore
        chore_streaks = kid.chore_streaks or {}
        streak_count = chore_streaks.get(chore.id, 0)

        result.append(TodaysChoreResponse(
            **{k: v for k, v in chore.__dict__.items() if not k.startswith('_')},
            status=status,
            claimed_by=claimed_by,
            streak_count=streak_count,
            is_recurring=is_recurring
        ))

    return result


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
            if chore.due_date and chore.due_date < datetime.now(timezone.utc) and status == "pending":
                status = "overdue"

            result.append(ChoreWithStatus(
                **{k: v for k, v in chore.__dict__.items() if not k.startswith('_')},
                status=status,
                claimed_by=claimed_by
            ))

    return result


@router.post("/{chore_id}/claim", response_model=ChoreClaimResponse)
def claim_chore(
    chore_id: str,
    request: ChoreClaimRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
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
    chore.last_claimed = datetime.now(timezone.utc)

    db.commit()
    db.refresh(claim)

    # Send push notification to parents (in background)
    background_tasks.add_task(notify_parents_chore_claimed, db, kid.name, chore.name)

    return claim


@router.post("/{chore_id}/approve", response_model=ChoreClaimResponse)
def approve_chore(
    chore_id: str,
    request: ChoreApproveRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
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
    points_with_multiplier = int(points * kid.points_multiplier)

    # Update claim
    claim.status = "approved"
    claim.approved_at = datetime.now(timezone.utc)
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
    chore.last_completed = datetime.now(timezone.utc)

    db.commit()
    db.refresh(claim)

    # Send push notification to kid (in background)
    background_tasks.add_task(
        notify_kid_chore_approved, db, kid.id, chore.name, points_with_multiplier
    )

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
    claim.approved_at = datetime.now(timezone.utc)
    claim.approved_by = request.parent_name

    db.commit()
    return {"message": "Chore disapproved"}
