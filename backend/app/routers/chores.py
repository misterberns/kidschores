"""Chores API endpoints."""
import logging
from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from ..database import get_db, SessionLocal
from ..deps import require_auth, require_parent, require_kid_access, assert_kid_access
from ..models import Chore, ChoreClaim, Kid, DailyMultiplier, PushSubscription, User, Parent
from ..timeutil import local_day_bounds_utc
from ..schemas import (
    ChoreCreate, ChoreUpdate, ChoreResponse, ChoreWithStatus,
    ChoreClaimRequest, ChoreApproveRequest, ChoreClaimResponse,
    TodaysChoreResponse, ApprovalWithStreakResponse, MessageResponse
)
from ..services.push_service import push_service
from ..services.gamification import evaluate_badges, evaluate_challenges
from ..services.email_service import email_service

logger = logging.getLogger(__name__)

# Streak milestones that trigger celebrations
STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 365]
DAILY_COMPLETION_BONUS = 10

router = APIRouter()


def notify_parents_chore_claimed(kid_name: str, chore_name: str):
    """Send push notification to all parent devices when a chore is claimed.

    Opens its OWN DB session — a background task runs AFTER the request's session
    is closed, so it must not reuse the request-scoped session.
    """
    db = SessionLocal()
    try:
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
                logger.error(f"Failed to send push notification: {e}")
    except Exception as e:
        logger.error(f"Background task notify_parents_chore_claimed failed: {e}")
    finally:
        db.close()


def notify_kid_chore_approved(kid_id: str, chore_name: str, points: int):
    """Send push notification to kid's devices when a chore is approved."""
    db = SessionLocal()
    try:
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
                logger.error(f"Failed to send push notification: {e}")
    except Exception as e:
        logger.error(f"Background task notify_kid_chore_approved failed: {e}")
    finally:
        db.close()


async def notify_kid_badges_unlocked(kid_id: str, badge_names: list):
    """Push a badge-unlock celebration to the kid (own DB session — background task)."""
    db = SessionLocal()
    try:
        subscriptions = db.query(PushSubscription).filter(
            PushSubscription.kid_id == kid_id
        ).all()
        names = ", ".join(badge_names)
        for sub in subscriptions:
            subscription_info = {
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh_key, "auth": sub.auth_key},
            }
            try:
                push_service.send_notification(
                    subscription_info,
                    title="New badge unlocked!",
                    body=f"You earned: {names}",
                    tag="badge-unlocked",
                    url="/",
                )
            except Exception as e:
                logger.error(f"Failed to send badge push: {e}")
    except Exception as e:
        logger.error(f"Background task notify_kid_badges_unlocked failed: {e}")
    finally:
        db.close()


async def email_notify_parents_chore_claimed(kid_id: str, kid_name: str, chore_name: str):
    """Email all parents associated with this kid when a chore is claimed."""
    db = SessionLocal()
    try:
        if not email_service.is_configured():
            return
        parents = db.query(Parent).all()
        for parent in parents:
            if kid_id in (parent.associated_kids or []):
                if parent.user_id:
                    user = db.query(User).filter(User.id == parent.user_id).first()
                    if user and user.email:
                        await email_service.send_chore_claimed_email(
                            to_email=user.email,
                            parent_name=parent.name,
                            kid_name=kid_name,
                            chore_name=chore_name,
                        )
    except Exception as e:
        logger.error(f"Background task email_notify_parents_chore_claimed failed: {e}")
    finally:
        db.close()


@router.get("", response_model=List[ChoreResponse])
@router.get("/", response_model=List[ChoreResponse], include_in_schema=False)
def list_chores(db: Session = Depends(get_db), _user: User = Depends(require_auth)):
    """List all chores."""
    return db.query(Chore).all()


@router.post("", response_model=ChoreResponse)
@router.post("/", response_model=ChoreResponse, include_in_schema=False)
def create_chore(chore: ChoreCreate, db: Session = Depends(get_db), _admin: User = Depends(require_parent)):
    """Create a new chore."""
    db_chore = Chore(**chore.model_dump())
    db.add(db_chore)
    db.commit()
    db.refresh(db_chore)
    return db_chore


@router.get("/{chore_id}", response_model=ChoreResponse)
def get_chore(chore_id: str, db: Session = Depends(get_db), _user: User = Depends(require_auth)):
    """Get chore by ID."""
    chore = db.query(Chore).filter(Chore.id == chore_id).first()
    if not chore:
        raise HTTPException(status_code=404, detail="Chore not found")
    return chore


@router.put("/{chore_id}", response_model=ChoreResponse)
def update_chore(chore_id: str, chore_update: ChoreUpdate, db: Session = Depends(get_db), _admin: User = Depends(require_parent)):
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
def delete_chore(chore_id: str, db: Session = Depends(get_db), _admin: User = Depends(require_parent)):
    """Delete chore."""
    chore = db.query(Chore).filter(Chore.id == chore_id).first()
    if not chore:
        raise HTTPException(status_code=404, detail="Chore not found")

    db.delete(chore)
    db.commit()
    return {"message": "Chore deleted"}


@router.get("/today/{kid_id}", response_model=List[TodaysChoreResponse])
def get_todays_chores(kid_id: str, db: Session = Depends(get_db), _user: User = Depends(require_kid_access)):
    """Get chores applicable for today for a specific kid."""
    kid = db.query(Kid).filter(Kid.id == kid_id).first()
    if not kid:
        raise HTTPException(status_code=404, detail="Kid not found")

    today = datetime.now()
    day_of_week = today.weekday()  # 0=Monday, 6=Sunday (local)
    # UTC bounds of the local calendar day, to match UTC-stored claimed_at.
    today_start, today_end = local_day_bounds_utc()

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
def get_chores_for_kid(kid_id: str, db: Session = Depends(get_db), _user: User = Depends(require_kid_access)):
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
    db: Session = Depends(get_db),
    user: User = Depends(require_auth),
):
    """Kid claims a chore."""
    # A kid-linked account may only claim chores for its own kid_id.
    assert_kid_access(db, user, request.kid_id)

    chore = db.query(Chore).filter(Chore.id == chore_id).first()
    if not chore:
        raise HTTPException(status_code=404, detail="Chore not found")

    kid = db.query(Kid).filter(Kid.id == request.kid_id).first()
    if not kid:
        raise HTTPException(status_code=404, detail="Kid not found")

    # Check if kid is assigned to this chore
    if request.kid_id not in (chore.assigned_kids or []):
        raise HTTPException(status_code=400, detail="Kid not assigned to this chore")

    # Check for existing claim TODAY if multiple claims not allowed. The window must
    # match the one get_todays_chores uses for status display, or the UI shows a Claim
    # button the guard then rejects (pre-v0.16.2: no window at all, so one approved
    # claim made the chore permanently unclaimable — approved rows are never expired).
    if not chore.allow_multiple_claims_per_day:
        day_start, day_end = local_day_bounds_utc()
        existing = db.query(ChoreClaim).filter(
            ChoreClaim.chore_id == chore_id,
            ChoreClaim.kid_id == request.kid_id,
            ChoreClaim.status.in_(["claimed", "approved"]),
            ChoreClaim.claimed_at >= day_start,
            ChoreClaim.claimed_at < day_end,
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

    # Send push notification to parents (in background — task opens its own session)
    background_tasks.add_task(notify_parents_chore_claimed, kid.name, chore.name)

    # Send email notification to parents (in background — task opens its own session)
    background_tasks.add_task(email_notify_parents_chore_claimed, kid.id, kid.name, chore.name)

    return claim


@router.post("/{chore_id}/approve", response_model=ChoreClaimResponse)
def approve_chore(
    chore_id: str,
    request: ChoreApproveRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(require_parent),
):
    """Parent approves a claimed chore."""
    # Find the pending claim. kid_id disambiguates when a shared chore has claims
    # from multiple kids — without it, .first() could credit the wrong kid. Legacy
    # callers omitting kid_id get the OLDEST claim (deterministic, was insertion luck).
    query = db.query(ChoreClaim).filter(
        ChoreClaim.chore_id == chore_id,
        ChoreClaim.status == "claimed"
    )
    if request.kid_id:
        query = query.filter(ChoreClaim.kid_id == request.kid_id)
    claim = query.order_by(ChoreClaim.claimed_at.asc()).first()

    if not claim:
        raise HTTPException(status_code=404, detail="No pending claim found for this chore")

    chore = db.query(Chore).filter(Chore.id == chore_id).first()
    kid = db.query(Kid).filter(Kid.id == claim.kid_id).first()

    # Calculate points. Use `is not None` so an intentional 0-point award is honored
    # (a falsy 0 was previously replaced by default_points); round rather than truncate.
    points = request.points_awarded if request.points_awarded is not None else chore.default_points
    points_with_multiplier = round(points * kid.points_multiplier)

    # Derive parent_name from JWT if not provided
    parent_name = request.parent_name
    if not parent_name:
        parent = db.query(Parent).filter(Parent.user_id == admin.id).first()
        parent_name = parent.name if parent else (admin.display_name or admin.email)

    # Update claim
    claim.status = "approved"
    claim.approved_at = datetime.now(timezone.utc)
    claim.approved_by = parent_name
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

    # Gamification: badge + challenge evaluation (same transaction as the award)
    new_badges = evaluate_badges(db, kid, context={"claim": claim})
    completed_challenges = evaluate_challenges(db, kid)

    db.commit()
    db.refresh(claim)

    # Send push notification to kid (in background — task opens its own session)
    background_tasks.add_task(
        notify_kid_chore_approved, kid.id, chore.name, points_with_multiplier
    )
    challenge_badges = [c["badge"] for c in completed_challenges if c.get("badge")]
    all_new_badges = new_badges + [b for b in challenge_badges if b not in new_badges]
    if all_new_badges:
        background_tasks.add_task(notify_kid_badges_unlocked, kid.id, all_new_badges)

    response = ChoreClaimResponse.model_validate(claim)
    response.new_badges = all_new_badges
    response.completed_challenges = [
        {"name": c["challenge"], "bonus_points": c["bonus_points"]} for c in completed_challenges
    ]
    return response


@router.post("/{chore_id}/disapprove", response_model=MessageResponse)
def disapprove_chore(chore_id: str, request: ChoreApproveRequest, db: Session = Depends(get_db), admin: User = Depends(require_parent)):
    """Parent disapproves a claimed chore."""
    query = db.query(ChoreClaim).filter(
        ChoreClaim.chore_id == chore_id,
        ChoreClaim.status == "claimed"
    )
    if request.kid_id:
        query = query.filter(ChoreClaim.kid_id == request.kid_id)
    claim = query.order_by(ChoreClaim.claimed_at.asc()).first()

    if not claim:
        raise HTTPException(status_code=404, detail="No pending claim found for this chore")

    # Derive parent_name from JWT if not provided
    parent_name = request.parent_name
    if not parent_name:
        parent = db.query(Parent).filter(Parent.user_id == admin.id).first()
        parent_name = parent.name if parent else (admin.display_name or admin.email)

    claim.status = "disapproved"
    claim.approved_at = datetime.now(timezone.utc)
    claim.approved_by = parent_name

    db.commit()
    return {"message": "Chore disapproved"}
