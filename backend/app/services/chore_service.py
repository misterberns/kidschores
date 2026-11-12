"""Chore rules shared by the chores router and the kiosk router.

Extracted in v0.18.0 so the kiosk endpoints apply exactly the same "which chores
are due today" and "may this kid claim it" rules as the main app, instead of a copy
that drifts.
"""
from datetime import datetime, timezone
from typing import Dict, Iterable, List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..models import Chore, ChoreClaim, Kid
from ..schemas import TodaysChoreResponse
from ..timeutil import local_day_bounds_utc


def is_applicable_today(chore: Chore, today: datetime) -> Tuple[bool, bool]:
    """Return (applicable_today, is_recurring) for a chore on the local date `today`."""
    day_of_week = today.weekday()  # 0=Monday, 6=Sunday (local)
    freq = chore.recurring_frequency
    if freq == "none" or freq is None:
        return True, False  # Non-recurring chores always show
    if freq == "daily":
        return True, True
    if freq == "weekly":
        return (not chore.applicable_days or day_of_week in chore.applicable_days), True
    if freq == "biweekly":
        week_number = today.isocalendar()[1]
        ok = week_number % 2 == 0 and (
            not chore.applicable_days or day_of_week in chore.applicable_days
        )
        return ok, True
    if freq == "monthly":
        return today.day == 1, True
    return False, False


def latest_claims_today(db: Session, kid_ids: Iterable[str]) -> Dict[Tuple[str, str], ChoreClaim]:
    """One query: the latest claim today for every (chore_id, kid_id) among `kid_ids`."""
    kid_ids = list(kid_ids)
    if not kid_ids:
        return {}
    day_start, day_end = local_day_bounds_utc()
    rows = (
        db.query(ChoreClaim)
        .filter(
            ChoreClaim.kid_id.in_(kid_ids),
            ChoreClaim.claimed_at >= day_start,
            ChoreClaim.claimed_at < day_end,
        )
        .order_by(ChoreClaim.claimed_at.asc())
        .all()
    )
    latest: Dict[Tuple[str, str], ChoreClaim] = {}
    for claim in rows:  # ascending, so the last write per key is the latest claim
        latest[(claim.chore_id, claim.kid_id)] = claim
    return latest


def todays_chores_for_kid(
    db: Session,
    kid: Kid,
    chores: Optional[List[Chore]] = None,
    claims_today: Optional[Dict[Tuple[str, str], ChoreClaim]] = None,
) -> List[TodaysChoreResponse]:
    """Chores applicable today for `kid`, with today's claim status and streak."""
    today = datetime.now()
    if chores is None:
        chores = db.query(Chore).all()
    if claims_today is None:
        claims_today = latest_claims_today(db, [kid.id])

    chore_streaks = kid.chore_streaks or {}
    result = []
    for chore in chores:
        if kid.id not in (chore.assigned_kids or []):
            continue
        applicable, is_recurring = is_applicable_today(chore, today)
        if not applicable:
            continue

        claim = claims_today.get((chore.id, kid.id))
        status = claim.status if claim else "pending"
        claimed_by = kid.name if claim else None

        result.append(TodaysChoreResponse(
            **{k: v for k, v in chore.__dict__.items() if not k.startswith('_')},
            status=status,
            claimed_by=claimed_by,
            streak_count=chore_streaks.get(chore.id, 0),
            is_recurring=is_recurring,
        ))
    return result


def claim_chore_for_kid(db: Session, chore_id: str, kid_id: str) -> Tuple[ChoreClaim, Kid, Chore]:
    """Create a claim after the assignment and once-per-day checks. Commits.

    Raises HTTPException(404/400) exactly as the chores router always has. The
    caller schedules notifications, so both entry points notify the same way.
    """
    chore = db.query(Chore).filter(Chore.id == chore_id).first()
    if not chore:
        raise HTTPException(status_code=404, detail="Chore not found")

    kid = db.query(Kid).filter(Kid.id == kid_id).first()
    if not kid:
        raise HTTPException(status_code=404, detail="Kid not found")

    if kid_id not in (chore.assigned_kids or []):
        raise HTTPException(status_code=400, detail="Kid not assigned to this chore")

    # The window must match the one todays_chores_for_kid uses for status display, or
    # the UI shows a Claim button the guard then rejects (pre-v0.16.2: no window at all,
    # so one approved claim made the chore permanently unclaimable).
    if not chore.allow_multiple_claims_per_day:
        day_start, day_end = local_day_bounds_utc()
        existing = db.query(ChoreClaim).filter(
            ChoreClaim.chore_id == chore_id,
            ChoreClaim.kid_id == kid_id,
            ChoreClaim.status.in_(["claimed", "approved"]),
            ChoreClaim.claimed_at >= day_start,
            ChoreClaim.claimed_at < day_end,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Chore already claimed today")

    claim = ChoreClaim(kid_id=kid_id, chore_id=chore_id, status="claimed")
    db.add(claim)
    chore.last_claimed = datetime.now(timezone.utc)
    db.commit()
    db.refresh(claim)
    return claim, kid, chore
