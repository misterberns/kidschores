"""Timezone helpers for date-window queries.

Every timestamp COLUMN is stored in UTC — the model defaults use
``datetime.now(timezone.utc)``, which SQLAlchemy persists (SQLite ``DateTime``)
as the naive UTC wall-clock. But "today" for a family is their LOCAL calendar
day. So when a query filters a UTC-stored timestamp (``ChoreClaim.claimed_at`` /
``approved_at``) by "today", the day bounds MUST be the local calendar day
expressed in UTC — otherwise, in the evening (when the server's local date is
still behind the UTC date), a just-made claim's UTC timestamp lands past the
naive-local "tomorrow midnight" and falls OUTSIDE the window.

That silently broke streaks + daily progress every night in the window where
UTC has rolled over but local time hasn't (roughly 00:00–05:00 UTC for a
US-Central server, 00:00–04:00/05:00 for US-Eastern): a chore claimed in the
evening didn't count toward "today", so streaks reset and the kid's chore card
still showed the claim button. See CHANGE-2026-07-15-KidsChores-Email-Branding
+ ``test_streak_timezone.py``.

The server's local timezone is whatever ``TZ`` the process runs in (the
container ``TZ`` env). These helpers follow it automatically — set ``TZ`` to the
family's timezone to move the day boundary.

Day-key MARKERS (``DailyMultiplier.date``, ``Kid.last_chore_date``) are a
separate concern: they are only ever compared writer-to-reader (never against a
UTC timestamp), so they stay naive-local-midnight and are NOT computed here.
"""
from datetime import datetime, timedelta, timezone


def local_day_start_utc(now_local: datetime | None = None) -> datetime:
    """Midnight of the server-local calendar day, as a naive UTC datetime.

    Matches the naive-UTC wall-clock SQLAlchemy stores for timestamp columns, so
    it can be compared directly against ``ChoreClaim.claimed_at`` etc.
    """
    aware_local = (now_local or datetime.now()).astimezone()  # aware, server-local
    local_midnight = aware_local.replace(hour=0, minute=0, second=0, microsecond=0)
    return local_midnight.astimezone(timezone.utc).replace(tzinfo=None)


def local_day_bounds_utc(now_local: datetime | None = None) -> tuple[datetime, datetime]:
    """(start, end) naive-UTC bounds of the server-local calendar day.

    ``start <= ts < end`` selects UTC-stored timestamps that fall on the local
    calendar day, at any hour of the day.
    """
    start = local_day_start_utc(now_local)
    return start, start + timedelta(days=1)
