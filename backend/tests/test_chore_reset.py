"""Nightly reset job — stale-claim expiry regression tests (v0.16.2).

Pre-v0.16.2 the expiry step only touched RECURRING chores' claims, so a
non-recurring chore's unapproved claim lingered in the parent pending list
forever (and could be double-approved once the day-windowed guard landed).
"""
import asyncio
from datetime import timedelta

from app.database import SessionLocal
from app.jobs.chore_reset import reset_recurring_chores
from app.models import Chore, ChoreClaim

from conftest import auth, make_chore, make_kid


def _backdate(claim_id: str, days: int) -> None:
    db = SessionLocal()
    try:
        row = db.query(ChoreClaim).filter(ChoreClaim.id == claim_id).one()
        row.claimed_at = row.claimed_at - timedelta(days=days)
        db.commit()
    finally:
        db.close()


def _claim_id(client, token, chore_id, kid_id) -> str:
    res = client.post(
        f"/api/chores/{chore_id}/claim", json={"kid_id": kid_id}, headers=auth(token)
    )
    assert res.status_code == 200, res.text
    return res.json()["id"]


def test_reset_expires_stale_claims_including_nonrecurring(client, parent_token):
    kid = make_kid(client, parent_token)
    recurring = make_chore(client, parent_token, assigned_kids=[kid["id"]],
                           recurring_frequency="daily")
    oneshot = make_chore(client, parent_token, assigned_kids=[kid["id"]],
                         recurring_frequency="none")

    stale_recurring = _claim_id(client, parent_token, recurring["id"], kid["id"])
    stale_oneshot = _claim_id(client, parent_token, oneshot["id"], kid["id"])
    _backdate(stale_recurring, days=2)
    _backdate(stale_oneshot, days=2)

    # Fresh same-day claim on the recurring chore (allowed — the stale one is
    # now outside today's window) must survive the reset untouched.
    fresh = _claim_id(client, parent_token, recurring["id"], kid["id"])

    asyncio.run(reset_recurring_chores())

    db = SessionLocal()
    try:
        statuses = {
            c.id: c.status
            for c in db.query(ChoreClaim).filter(
                ChoreClaim.id.in_([stale_recurring, stale_oneshot, fresh])
            ).all()
        }
        assert statuses[stale_recurring] == "expired"
        assert statuses[stale_oneshot] == "expired"  # the v0.16.2 broadening
        assert statuses[fresh] == "claimed"

        # last_reset_date stays a recurring-only marker.
        oneshot_row = db.query(Chore).filter(Chore.id == oneshot["id"]).one()
        assert oneshot_row.last_reset_date is None
    finally:
        db.close()
