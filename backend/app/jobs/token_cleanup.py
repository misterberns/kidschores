"""Revoked-token denylist purge job (v0.15.0).

`revoked_tokens` rows exist so /auth/refresh can reject a logged-out device's
refresh token. Once a row's `expires_at` (the token's own exp) has passed, the
token could no longer authenticate anyway — the row is dead weight. This daily
job deletes those rows so the denylist stays tiny (family scale: a handful of
logouts per 14-day refresh window).
"""
import logging
import time
from datetime import datetime, timezone

from app.database import get_db_session
from app.models import RevokedToken, ScheduledJobLog

logger = logging.getLogger(__name__)


async def purge_expired_revoked_tokens():
    """Delete revoked-token rows whose underlying token has expired."""
    start_time = time.time()
    affected_records = 0
    error_message = None
    status = "success"

    db = next(get_db_session())
    try:
        # expires_at is stored naive-UTC (SQLite strips tzinfo) — compare naive.
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        affected_records = db.query(RevokedToken).filter(
            RevokedToken.expires_at < now
        ).delete()
        db.commit()
        if affected_records:
            logger.info(f"Purged {affected_records} expired revoked-token rows")

    except Exception as e:
        error_message = str(e)
        status = "failed"
        logger.error(f"Error purging revoked tokens: {e}")

    finally:
        try:
            duration_ms = int((time.time() - start_time) * 1000)
            job_log = ScheduledJobLog(
                job_name="purge_expired_revoked_tokens",
                status=status,
                error_message=error_message,
                affected_records=affected_records,
                duration_ms=duration_ms,
            )
            db.add(job_log)
            db.commit()
        except Exception as log_error:
            logger.error(f"Error logging job execution: {log_error}")
        finally:
            db.close()
