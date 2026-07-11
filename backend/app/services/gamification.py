"""Badges & challenges engine (UX-REVIEW-2026-07 §5a — Tier 2.5).

The Badge table (previously orphaned) is the award CATALOG. Rows are seeded
with slug ids matching the frontend's badge definitions, so `Kid.badges`
(a JSON list of slugs) renders through the existing BadgeDisplay components.
Parent-created custom badges (uuid ids) flow through the same engine and get
a generic fallback visual on the frontend.

Award evaluation is a pure-ish function called from the chore-approve path,
the reward-redeem path, and the nightly streak job. Challenges are time-boxed
goals whose progress is computed live from approved ChoreClaims in the window
(no progress table); completion awards a linked badge and/or bonus points,
idempotently via Challenge.completed_kids.
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from ..models import Badge, Challenge, Chore, ChoreClaim, Kid

logger = logging.getLogger(__name__)

# Threshold semantics understood by the engine. "special" rows are never
# auto-awarded (manual parent grant only).
AUTO_THRESHOLD_TYPES = {
    "points",             # kid.max_points_ever >= value
    "chore_count",        # kid.completed_chores_total >= value
    "streak",             # max(current, longest-ever) streak >= value
    "shared_chore_count", # approved claims on shared chores >= value
    "early_bird",         # context: a claim made before <value> o'clock local
    "first_redemption",   # context: kid just redeemed a reward
}

# Seeded catalog — ids MUST match frontend/src/components/gamification/BadgeDisplay.tsx
DEFAULT_BADGES = [
    # (id, name, description, icon, threshold_type, threshold_value, multiplier_bonus)
    ("first_chore", "First Steps", "Completed your first chore!", "star", "chore_count", 1, 0.0),
    ("streak_3", "On Fire", "3-day chore streak", "flame", "streak", 3, 0.0),
    ("streak_7", "Week Warrior", "7-day chore streak", "zap", "streak", 7, 0.0),
    ("streak_30", "Monthly Master", "30-day chore streak", "crown", "streak", 30, 0.1),
    ("early_bird", "Early Bird", "Completed a chore before 8 AM", "clock", "early_bird", 8, 0.0),
    ("perfectionist", "Perfectionist", "Completed all chores for a week", "check-circle", "special", 0, 0.0),
    ("team_player", "Team Player", "Helped with 10 shared chores", "award", "shared_chore_count", 10, 0.0),
    ("goal_crusher", "Goal Crusher", "Reached 1000 total points", "target", "points", 1000, 0.0),
    ("superstar", "Superstar", "Earned 50 points in one day", "sparkles", "special", 0, 0.0),
    ("champion", "Champion", "Redeemed your first reward", "medal", "first_redemption", 1, 0.0),
    ("rocket_start", "Rocket Start", "Completed 5 chores on your first day", "rocket", "special", 0, 0.0),
    ("legend", "Legend", "Reached Level 5", "trophy", "points", 2500, 0.1),
]


def seed_default_badges(db: Session) -> int:
    """Idempotently insert the default badge catalog. Returns rows added."""
    existing = {row[0] for row in db.query(Badge.id).all()}
    added = 0
    for bid, name, desc, icon, ttype, tval, bonus in DEFAULT_BADGES:
        if bid in existing:
            continue
        db.add(Badge(
            id=bid, name=name, description=desc, icon=icon,
            threshold_type=ttype, threshold_value=tval,
            points_multiplier_bonus=bonus,
        ))
        added += 1
    if added:
        db.commit()
        logger.info("Seeded %d default badges", added)
    return added


def _shared_chore_approvals(db: Session, kid_id: str) -> int:
    return (
        db.query(ChoreClaim)
        .join(Chore, Chore.id == ChoreClaim.chore_id)
        .filter(
            ChoreClaim.kid_id == kid_id,
            ChoreClaim.status == "approved",
            Chore.shared_chore.is_(True),
        )
        .count()
    )


def _meets_threshold(db: Session, badge: Badge, kid: Kid, context: dict) -> bool:
    t = badge.threshold_type
    v = badge.threshold_value or 0
    if t == "points":
        return (kid.max_points_ever or 0) >= v
    if t == "chore_count":
        return (kid.completed_chores_total or 0) >= v
    if t == "streak":
        return max(kid.overall_chore_streak or 0, kid.longest_streak_ever or 0) >= v
    if t == "shared_chore_count":
        return _shared_chore_approvals(db, kid.id) >= v
    if t == "early_bird":
        claim = context.get("claim")
        if claim is None or claim.claimed_at is None:
            return False
        # claimed_at is stored naive-UTC; compare in server-local time (TZ env)
        claimed = claim.claimed_at
        if claimed.tzinfo is None:
            claimed = claimed.replace(tzinfo=timezone.utc)
        return claimed.astimezone().hour < (v or 8)
    if t == "first_redemption":
        return bool(context.get("redeemed"))
    return False  # "special" and unknown types: manual grant only


def grant_badge(db: Session, kid: Kid, badge: Badge) -> bool:
    """Add a badge to a kid (idempotent). Returns True if newly granted.

    NOTE: assigns a NEW list to kid.badges — SQLAlchemy JSON columns do not
    detect in-place mutation, so append() would silently never persist.
    """
    earned = list(kid.badges or [])
    if badge.id in earned:
        return False
    kid.badges = earned + [badge.id]
    if badge.points_multiplier_bonus:
        kid.points_multiplier = round((kid.points_multiplier or 1.0) + badge.points_multiplier_bonus, 2)
    logger.info("Badge '%s' awarded to %s", badge.id, kid.name)
    return True


def evaluate_badges(db: Session, kid: Kid, context: Optional[dict] = None) -> list[str]:
    """Evaluate all auto-awardable badges for a kid; returns newly-earned ids.
    Caller commits."""
    context = context or {}
    # SessionLocal runs autoflush=False — flush pending mutations (the claim just
    # approved in this transaction) so count/sum queries below can see them.
    db.flush()
    earned = set(kid.badges or [])
    new: list[str] = []
    for badge in db.query(Badge).all():
        if badge.id in earned or badge.threshold_type not in AUTO_THRESHOLD_TYPES:
            continue
        if _meets_threshold(db, badge, kid, context):
            if grant_badge(db, kid, badge):
                new.append(badge.id)
    return new


# --- Challenges ---

def challenge_progress(db: Session, challenge: Challenge, kid_id: str) -> float:
    """Current progress for a kid within the challenge window (live query)."""
    q = db.query(ChoreClaim).filter(
        ChoreClaim.kid_id == kid_id,
        ChoreClaim.status == "approved",
        ChoreClaim.approved_at >= challenge.start_date,
        ChoreClaim.approved_at <= challenge.end_date,
    )
    if challenge.target_type == "points_earned":
        total = 0.0
        for claim in q.all():
            total += claim.points_awarded or 0
        return total
    return float(q.count())  # chore_count


def evaluate_challenges(db: Session, kid: Kid) -> list[dict]:
    """Check the kid's active challenges; award completions idempotently.
    Returns [{'challenge': name, 'badge': id|None, 'bonus_points': n}]. Caller commits."""
    db.flush()  # autoflush=False session — make this transaction's approvals visible
    now = datetime.now(timezone.utc).replace(tzinfo=None)  # columns are naive-UTC
    completed: list[dict] = []
    challenges = db.query(Challenge).filter(
        Challenge.start_date <= now,
        Challenge.end_date >= now,
    ).all()
    for ch in challenges:
        scope = ch.kid_ids or []
        if scope and kid.id not in scope:
            continue
        done = list(ch.completed_kids or [])
        if kid.id in done:
            continue
        if challenge_progress(db, ch, kid.id) >= ch.target_value:
            ch.completed_kids = done + [kid.id]  # new list (JSON column)
            result = {"challenge": ch.name, "badge": None, "bonus_points": ch.bonus_points or 0}
            if ch.badge_id:
                badge = db.query(Badge).filter(Badge.id == ch.badge_id).first()
                if badge and grant_badge(db, kid, badge):
                    result["badge"] = badge.id
            if ch.bonus_points:
                kid.points += ch.bonus_points
                if kid.points > (kid.max_points_ever or 0):
                    kid.max_points_ever = kid.points
            completed.append(result)
            logger.info("Challenge '%s' completed by %s", ch.name, kid.name)
    return completed
