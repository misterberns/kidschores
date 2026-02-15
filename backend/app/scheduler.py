"""APScheduler configuration for KidsChores background jobs."""
import logging
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.executors.asyncio import AsyncIOExecutor

logger = logging.getLogger(__name__)

# Global scheduler instance
_scheduler: Optional[AsyncIOScheduler] = None


def get_scheduler() -> Optional[AsyncIOScheduler]:
    """Get the global scheduler instance."""
    return _scheduler


def create_scheduler() -> AsyncIOScheduler:
    """Create and configure the APScheduler instance."""
    global _scheduler

    jobstores = {
        'default': MemoryJobStore()
    }

    executors = {
        'default': AsyncIOExecutor()
    }

    job_defaults = {
        'coalesce': True,  # Combine missed runs into one
        'max_instances': 1,  # Only one instance of each job at a time
        'misfire_grace_time': 3600  # Allow 1 hour grace period for missed jobs
    }

    _scheduler = AsyncIOScheduler(
        jobstores=jobstores,
        executors=executors,
        job_defaults=job_defaults,
        timezone='America/Chicago'  # Central time for the homelab
    )

    return _scheduler


async def setup_scheduled_jobs(scheduler: AsyncIOScheduler):
    """Register all scheduled jobs."""
    from app.jobs.chore_reset import reset_recurring_chores
    from app.jobs.streak_calculation import calculate_daily_streaks
    from app.jobs.daily_summary import send_daily_summary_emails

    # Midnight chore reset - runs at 00:01 every day
    scheduler.add_job(
        reset_recurring_chores,
        'cron',
        hour=0,
        minute=1,
        id='reset_recurring_chores',
        name='Reset Recurring Chores',
        replace_existing=True
    )

    # Streak calculation - runs at 23:59 every day (before midnight reset)
    scheduler.add_job(
        calculate_daily_streaks,
        'cron',
        hour=23,
        minute=59,
        id='calculate_daily_streaks',
        name='Calculate Daily Streaks',
        replace_existing=True
    )

    # Daily summary emails - runs at 20:00 (8 PM) every day
    scheduler.add_job(
        send_daily_summary_emails,
        'cron',
        hour=20,
        minute=0,
        id='send_daily_summary_emails',
        name='Send Daily Summary Emails',
        replace_existing=True
    )

    logger.info("Scheduled jobs registered successfully")


async def start_scheduler():
    """Start the scheduler with all jobs."""
    global _scheduler

    if _scheduler is None:
        _scheduler = create_scheduler()

    await setup_scheduled_jobs(_scheduler)
    _scheduler.start()
    logger.info("Scheduler started")


async def shutdown_scheduler():
    """Gracefully shutdown the scheduler."""
    global _scheduler

    if _scheduler is not None:
        _scheduler.shutdown(wait=True)
        logger.info("Scheduler shutdown complete")
        _scheduler = None
