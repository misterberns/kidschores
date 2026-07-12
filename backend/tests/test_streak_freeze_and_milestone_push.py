"""Streak-freeze earning + milestone push (v0.14.0).

Streak freezes were previously spend-only (no grant path anywhere — the count
was permanently 0) and `push_service.send_streak_milestone` had zero callers.
The nightly job now awards +1 freeze at every milestone >= 7 days (capped at
MAX_STREAK_FREEZES) and fires the milestone push to the kid's + parents'
subscriptions. These tests drive the REAL `calculate_daily_streaks` job
against the test DB.
"""
import asyncio
import uuid
from unittest.mock import MagicMock

from conftest import auth, make_chore, make_kid

from app.database import SessionLocal
from app.jobs import streak_calculation
from app.jobs.streak_calculation import (
    MAX_STREAK_FREEZES,
    STREAK_FREEZE_MILESTONES,
    calculate_daily_streaks,
)
from app.models import Kid, PushSubscription


def _set_streak(kid_id: str, streak: int, freezes: int = 0) -> None:
    db = SessionLocal()
    try:
        kid = db.query(Kid).filter(Kid.id == kid_id).first()
        kid.overall_chore_streak = streak
        kid.streak_freeze_count = freezes
        db.commit()
    finally:
        db.close()


def _get_kid_row(kid_id: str) -> tuple[int, int]:
    db = SessionLocal()
    try:
        kid = db.query(Kid).filter(Kid.id == kid_id).first()
        return kid.overall_chore_streak, kid.streak_freeze_count
    finally:
        db.close()


def _complete_all_today(client, parent_token, kid_id) -> None:
    """Give the kid one daily chore and approve it, so tonight = 100% complete."""
    chore = make_chore(client, parent_token, points=5, assigned_kids=[kid_id])
    res = client.post(f"/api/chores/{chore['id']}/claim", json={"kid_id": kid_id}, headers=auth(parent_token))
    assert res.status_code == 200, res.text
    res = client.post(f"/api/chores/{chore['id']}/approve", json={}, headers=auth(parent_token))
    assert res.status_code == 200, res.text


def test_freeze_awarded_at_7_day_milestone(client, parent_token, monkeypatch):
    monkeypatch.setattr(streak_calculation, "push_service", MagicMock())
    kid = make_kid(client, parent_token)
    _complete_all_today(client, parent_token, kid["id"])
    _set_streak(kid["id"], streak=6, freezes=0)

    asyncio.run(calculate_daily_streaks())

    streak, freezes = _get_kid_row(kid["id"])
    assert streak == 7
    assert freezes == 1


def test_no_freeze_at_3_day_milestone(client, parent_token, monkeypatch):
    """3 is a celebration milestone but below the freeze-earning floor."""
    assert 3 not in STREAK_FREEZE_MILESTONES
    monkeypatch.setattr(streak_calculation, "push_service", MagicMock())
    kid = make_kid(client, parent_token)
    _complete_all_today(client, parent_token, kid["id"])
    _set_streak(kid["id"], streak=2, freezes=0)

    asyncio.run(calculate_daily_streaks())

    streak, freezes = _get_kid_row(kid["id"])
    assert streak == 3
    assert freezes == 0


def test_freeze_stockpile_capped(client, parent_token, monkeypatch):
    monkeypatch.setattr(streak_calculation, "push_service", MagicMock())
    kid = make_kid(client, parent_token)
    _complete_all_today(client, parent_token, kid["id"])
    _set_streak(kid["id"], streak=13, freezes=MAX_STREAK_FREEZES)

    asyncio.run(calculate_daily_streaks())

    streak, freezes = _get_kid_row(kid["id"])
    assert streak == 14
    assert freezes == MAX_STREAK_FREEZES  # not exceeded


def test_milestone_push_sent_to_kid_and_parent_subs(client, parent_token, monkeypatch):
    mock_push = MagicMock()
    monkeypatch.setattr(streak_calculation, "push_service", mock_push)
    kid = make_kid(client, parent_token)
    _complete_all_today(client, parent_token, kid["id"])
    _set_streak(kid["id"], streak=6, freezes=0)

    db = SessionLocal()
    try:
        db.add(PushSubscription(
            kid_id=kid["id"],
            endpoint=f"https://push.example/{uuid.uuid4().hex}",
            p256dh_key="k1", auth_key="a1",
        ))
        db.add(PushSubscription(  # a parent subscription (no kid_id)
            kid_id=None,
            endpoint=f"https://push.example/{uuid.uuid4().hex}",
            p256dh_key="k2", auth_key="a2",
        ))
        db.commit()
    finally:
        db.close()

    asyncio.run(calculate_daily_streaks())

    calls = [c for c in mock_push.send_streak_milestone.call_args_list
             if c.args[1] == kid["name"] and c.args[2] == 7]
    assert len(calls) == 2, "expected the kid's sub AND the parent sub to be pushed"


def test_no_push_below_milestone(client, parent_token, monkeypatch):
    mock_push = MagicMock()
    monkeypatch.setattr(streak_calculation, "push_service", mock_push)
    kid = make_kid(client, parent_token)
    _complete_all_today(client, parent_token, kid["id"])
    _set_streak(kid["id"], streak=8, freezes=0)  # 8 -> 9, not a milestone

    asyncio.run(calculate_daily_streaks())

    for c in mock_push.send_streak_milestone.call_args_list:
        assert c.args[1] != kid["name"]
