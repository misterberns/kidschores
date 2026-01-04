"""Daily summary email job."""
import logging
from datetime import datetime

from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import Parent, Kid, NotificationPreference, User
from ..services.email_service import email_service

logger = logging.getLogger(__name__)


async def send_daily_summary_emails():
    """Send daily summary emails to parents who have it enabled."""
    if not email_service.is_configured():
        logger.info("Email service not configured, skipping daily summary")
        return

    db: Session = SessionLocal()
    try:
        # Get all parents with linked user accounts
        parents = db.query(Parent).filter(Parent.user_id.isnot(None)).all()

        for parent in parents:
            # Get the linked user to get email
            user = db.query(User).filter(User.id == parent.user_id).first()
            if not user or not user.email:
                continue

            # Check notification preferences
            prefs = db.query(NotificationPreference).filter(
                NotificationPreference.user_id == user.id
            ).first()

            # Default: daily summary is off unless explicitly enabled
            if not prefs or not prefs.email_daily_summary:
                continue

            # Get kids associated with this parent
            associated_kids = parent.associated_kids or []
            if not associated_kids:
                continue

            kids_summary = []
            for kid_id in associated_kids:
                kid = db.query(Kid).filter(Kid.id == kid_id).first()
                if kid:
                    kids_summary.append({
                        "name": kid.name,
                        "chores_completed": kid.completed_chores_today,
                        "points_today": 0,  # Would need to calculate from claims
                        "streak": kid.overall_chore_streak,
                        "total_points": kid.points,
                    })

            if kids_summary:
                try:
                    await email_service.send_daily_summary_email(
                        to_email=user.email,
                        parent_name=parent.name,
                        kids_summary=kids_summary,
                    )
                    logger.info(f"Sent daily summary to {user.email}")
                except Exception as e:
                    logger.error(f"Failed to send daily summary to {user.email}: {e}")

    except Exception as e:
        logger.error(f"Error in daily summary job: {e}")
    finally:
        db.close()
