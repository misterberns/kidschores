"""Recurring chore reset job."""
import logging
from datetime import datetime, timedelta
import time

from sqlalchemy.orm import Session
from app.database import get_db_session
from app.models import Chore, ChoreClaim, ScheduledJobLog

logger = logging.getLogger(__name__)


def get_applicable_chores_for_today(db: Session) -> list:
    """Get all recurring chores that should be active today."""
    today = datetime.now()
    day_of_week = today.weekday()  # 0=Monday, 6=Sunday

    # Get all recurring chores
    chores = db.query(Chore).filter(
        Chore.recurring_frequency != "none",
        Chore.recurring_frequency.isnot(None)
    ).all()

    applicable_chores = []
    for chore in chores:
        # Check if chore applies to today
        if chore.recurring_frequency == "daily":
            applicable_chores.append(chore)
        elif chore.recurring_frequency == "weekly":
            # Check applicable_days - if empty, apply all days
            if not chore.applicable_days or day_of_week in chore.applicable_days:
                applicable_chores.append(chore)
        elif chore.recurring_frequency == "biweekly":
            # Check if we're in the right week
            week_number = today.isocalendar()[1]
            if week_number % 2 == 0:  # Even weeks
                if not chore.applicable_days or day_of_week in chore.applicable_days:
                    applicable_chores.append(chore)
        elif chore.recurring_frequency == "monthly":
            # First day of the month or specific day
            if today.day == 1:
                applicable_chores.append(chore)

    return applicable_chores


async def reset_recurring_chores():
    """
    Reset recurring chores at midnight.

    This job:
    1. Marks old pending/claimed statuses as 'expired' for recurring chores
    2. Updates last_reset_date on chores
    3. Logs the job execution
    """
    start_time = time.time()
    affected_records = 0
    error_message = None
    status = "success"

    try:
        db = next(get_db_session())

        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday = today - timedelta(days=1)

        # Get recurring chores
        recurring_chores = db.query(Chore).filter(
            Chore.recurring_frequency != "none",
            Chore.recurring_frequency.isnot(None)
        ).all()

        for chore in recurring_chores:
            # Mark old pending claims as expired (claims from before today)
            expired_count = db.query(ChoreClaim).filter(
                ChoreClaim.chore_id == chore.id,
                ChoreClaim.status.in_(["pending", "claimed"]),
                ChoreClaim.claimed_at < today
            ).update({"status": "expired"})

            affected_records += expired_count

            # Update last_reset_date
            chore.last_reset_date = today

        db.commit()

        logger.info(f"Reset {affected_records} chore claims for {len(recurring_chores)} recurring chores")

    except Exception as e:
        error_message = str(e)
        status = "failed"
        logger.error(f"Error resetting recurring chores: {e}")

    finally:
        # Log the job execution
        try:
            duration_ms = int((time.time() - start_time) * 1000)
            job_log = ScheduledJobLog(
                job_name="reset_recurring_chores",
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
