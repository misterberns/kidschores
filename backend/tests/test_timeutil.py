"""Guard: local-day bounds must bracket the current UTC instant at ANY server TZ.

Before v0.14.4, date-window queries computed "today" in naive LOCAL time and
compared it against UTC-stored timestamps (ChoreClaim.claimed_at / approved_at).
In the evening (server TZ behind UTC — e.g. the app's default America/Chicago
between 00:00 and 05:00 UTC) a just-made claim's UTC timestamp fell PAST the
naive-local "tomorrow midnight" and outside the window, so streaks reset, daily
progress undercounted, and the kid's claim button never hid.

local_day_bounds_utc() returns the local calendar day expressed in UTC, so a
UTC "now" always lands inside it. This test would FAIL against the old inline
naive-local logic during the evening window; it passes at any hour/TZ now.
"""
from datetime import datetime, timedelta, timezone

from app.timeutil import local_day_bounds_utc, local_day_start_utc


def _utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def test_bounds_bracket_utc_now():
    start, end = local_day_bounds_utc()
    now = _utc_now_naive()
    assert start <= now < end, f"UTC now {now} not within local day [{start}, {end})"


def test_bounds_are_24h_and_naive():
    start, end = local_day_bounds_utc()
    assert end - start == timedelta(days=1)
    assert start.tzinfo is None and end.tzinfo is None, "bounds must be naive UTC to match storage"


def test_start_matches_bounds_start():
    assert local_day_start_utc() == local_day_bounds_utc()[0]
