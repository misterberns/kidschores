"""Streak calculation job."""
import logging
from datetime import datetime, timedelta
import time

from sqlalchemy.orm import Session
from app.database import get_db_session
from app.models import Kid, Chore, ChoreClaim, DailyMultiplier, ScheduledJobLog

logger = logging.getLogger(__name__)

# Streak milestones that trigger celebrations
STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 365]

# Bonus points for completing all daily chores
DAILY_COMPLETION_BONUS = 10


def get_todays_chores_for_kid(db: Session, kid_id: str) -> list:
    """Get all chores assigned to a kid for today."""
    today = datetime.now()
    day_of_week = today.weekday()

    # Get chores where kid is in assigned_kids
    all_chores = db.query(Chore).all()

    kid_chores = []
    for chore in all_chores:
        # Check if kid is assigned
        if kid_id not in (chore.assigned_kids or []):
            continue

        # Check if chore is applicable today
        if chore.recurring_frequency == "none" or chore.recurring_frequency is None:
            continue  # Skip non-recurring chores for streak calculation

        if chore.recurring_frequency == "daily":
            kid_chores.append(chore)
        elif chore.recurring_frequency == "weekly":
            if not chore.applicable_days or day_of_week in chore.applicable_days:
                kid_chores.append(chore)
        elif chore.recurring_frequency == "biweekly":
            week_number = today.isocalendar()[1]
            if week_number % 2 == 0:
                if not chore.applicable_days or day_of_week in chore.applicable_days:
                    kid_chores.append(chore)
        elif chore.recurring_frequency == "monthly":
            if today.day == 1:
                kid_chores.append(chore)

    return kid_chores


def get_completed_chores_today(db: Session, kid_id: str, chore_ids: list) -> list:
    """Get chores completed by kid today."""
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)

    completed = db.query(ChoreClaim).filter(
        ChoreClaim.kid_id == kid_id,
        ChoreClaim.chore_id.in_(chore_ids),
        ChoreClaim.status == "approved",
        ChoreClaim.claimed_at >= today,
        ChoreClaim.claimed_at < tomorrow
    ).all()

    return [c.chore_id for c in completed]


async def calculate_daily_streaks():
    """
    Calculate and update daily streaks for all kids.

    This job runs at 11:59 PM before midnight reset:
    1. Checks each kid's completion for today
    2. Updates overall streak (increment or reset)
    3. Updates individual chore streaks
    4. Records personal best if exceeded
    5. Awards daily completion bonus if all chores done
    """
    start_time = time.time()
    affected_records = 0
    error_message = None
    status = "success"

    try:
        db = next(get_db_session())

        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        kids = db.query(Kid).all()

        for kid in kids:
            todays_chores = get_todays_chores_for_kid(db, kid.id)

            if not todays_chores:
                continue  # Kid has no chores assigned for today

            chore_ids = [c.id for c in todays_chores]
            completed_ids = get_completed_chores_today(db, kid.id, chore_ids)

            total_chores = len(chore_ids)
            completed_count = len(completed_ids)
            all_completed = completed_count == total_chores and total_chores > 0

            # Update or create DailyMultiplier record
            daily_record = db.query(DailyMultiplier).filter(
                DailyMultiplier.kid_id == kid.id,
                DailyMultiplier.date == today
            ).first()

            if not daily_record:
                daily_record = DailyMultiplier(
                    kid_id=kid.id,
                    date=today,
                    total_chores_for_day=total_chores,
                    completed_chores=completed_count,
                    all_completed=all_completed
                )
                db.add(daily_record)
            else:
                daily_record.total_chores_for_day = total_chores
                daily_record.completed_chores = completed_count
                daily_record.all_completed = all_completed

            # Award daily completion bonus
            if all_completed and not daily_record.bonus_awarded:
                daily_record.bonus_awarded = True
                daily_record.bonus_points = DAILY_COMPLETION_BONUS
                daily_record.bonus_multiplier = 0.1  # 10% bonus
                kid.points += DAILY_COMPLETION_BONUS
                logger.info(f"Awarded {DAILY_COMPLETION_BONUS} bonus points to {kid.name}")

            # Update overall streak
            if all_completed:
                kid.overall_chore_streak += 1

                # Check for personal best
                if kid.overall_chore_streak > kid.longest_streak_ever:
                    kid.longest_streak_ever = kid.overall_chore_streak
                    logger.info(f"{kid.name} achieved new personal best streak: {kid.longest_streak_ever}")

                # Check for milestone
                if kid.overall_chore_streak in STREAK_MILESTONES:
                    logger.info(f"{kid.name} reached streak milestone: {kid.overall_chore_streak} days!")
                    # Future: Trigger celebration notification
            else:
                # Check if they can use a streak freeze
                if kid.streak_freeze_count > 0 and kid.overall_chore_streak > 0:
                    kid.streak_freeze_count -= 1
                    logger.info(f"{kid.name} used a streak freeze. {kid.streak_freeze_count} remaining.")
                else:
                    # Reset streak
                    if kid.overall_chore_streak > 0:
                        logger.info(f"{kid.name}'s streak of {kid.overall_chore_streak} days ended")
                    kid.overall_chore_streak = 0

            kid.last_chore_date = today

            # Update individual chore streaks
            chore_streaks = kid.chore_streaks or {}
            for chore_id in chore_ids:
                current_streak = chore_streaks.get(chore_id, 0)
                if chore_id in completed_ids:
                    chore_streaks[chore_id] = current_streak + 1
                else:
                    chore_streaks[chore_id] = 0
            kid.chore_streaks = chore_streaks

            affected_records += 1

        db.commit()
        logger.info(f"Calculated streaks for {affected_records} kids")

    except Exception as e:
        error_message = str(e)
        status = "failed"
        logger.error(f"Error calculating streaks: {e}")

    finally:
        # Log the job execution
        try:
            duration_ms = int((time.time() - start_time) * 1000)
            job_log = ScheduledJobLog(
                job_name="calculate_daily_streaks",
                status=status,
                error_message=error_message,
                affected_records=affected_records,
                duration_ms=duration_ms
            )
            db.add(job_log)
            db.commit()
        except Exception as log_error:
            logger.error(f"Error logging job execution: {log_error}")
        finally:
            db.close()
