"""Claim-guard day-window + kid-targeted approval regression tests (v0.16.2).

The headline bug: the duplicate-claim guard had NO date window, so one approved
claim made a chore permanently unclaimable ("Chore already claimed today"
forever — approved rows are never expired). These tests pin the day-scoped
guard and the kid_id-disambiguated approve/disapprove.
"""
from datetime import datetime, timedelta, timezone

from app.database import SessionLocal
from app.models import ChoreClaim

from conftest import auth, make_chore, make_kid


def _backdate_claims(chore_id: str, days: int) -> int:
    """Shift claimed_at (and approved_at when set) back by N days for all of a
    chore's claims. Returns the number of rows touched."""
    db = SessionLocal()
    try:
        rows = db.query(ChoreClaim).filter(ChoreClaim.chore_id == chore_id).all()
        for row in rows:
            row.claimed_at = row.claimed_at - timedelta(days=days)
            if row.approved_at is not None:
                row.approved_at = row.approved_at - timedelta(days=days)
        db.commit()
        return len(rows)
    finally:
        db.close()


def _claim(client, token, chore_id, kid_id):
    return client.post(
        f"/api/chores/{chore_id}/claim", json={"kid_id": kid_id}, headers=auth(token)
    )


def _approve(client, token, chore_id, **body):
    return client.post(
        f"/api/chores/{chore_id}/approve", json={"parent_name": "Tester", **body},
        headers=auth(token),
    )


class TestClaimDayWindow:
    def test_claim_allowed_after_prior_day_approval(self, client, parent_token):
        """The v0.16.2 headline regression: yesterday's APPROVED claim must not
        block today's claim."""
        kid = make_kid(client, parent_token)
        chore = make_chore(client, parent_token, assigned_kids=[kid["id"]])

        assert _claim(client, parent_token, chore["id"], kid["id"]).status_code == 200
        assert _approve(client, parent_token, chore["id"]).status_code == 200
        assert _backdate_claims(chore["id"], days=2) == 1

        res = _claim(client, parent_token, chore["id"], kid["id"])
        assert res.status_code == 200, res.text

    def test_same_day_duplicate_claim_rejected(self, client, parent_token):
        kid = make_kid(client, parent_token)
        chore = make_chore(client, parent_token, assigned_kids=[kid["id"]])

        assert _claim(client, parent_token, chore["id"], kid["id"]).status_code == 200
        res = _claim(client, parent_token, chore["id"], kid["id"])
        assert res.status_code == 400
        assert "already claimed" in res.json()["detail"].lower()

    def test_same_day_claim_after_approval_rejected(self, client, parent_token):
        kid = make_kid(client, parent_token)
        chore = make_chore(client, parent_token, assigned_kids=[kid["id"]])

        assert _claim(client, parent_token, chore["id"], kid["id"]).status_code == 200
        assert _approve(client, parent_token, chore["id"]).status_code == 200
        res = _claim(client, parent_token, chore["id"], kid["id"])
        assert res.status_code == 400


class TestApproveKidTargeting:
    def test_approve_with_kid_id_credits_correct_kid(self, client, parent_token):
        """Shared chore, both kids claimed: kid_id must pick the right claim."""
        kid1 = make_kid(client, parent_token)
        kid2 = make_kid(client, parent_token)
        chore = make_chore(client, parent_token, assigned_kids=[kid1["id"], kid2["id"]],
                           allow_multiple_claims_per_day=True)

        assert _claim(client, parent_token, chore["id"], kid1["id"]).status_code == 200
        assert _claim(client, parent_token, chore["id"], kid2["id"]).status_code == 200

        res = _approve(client, parent_token, chore["id"], kid_id=kid2["id"])
        assert res.status_code == 200
        assert res.json()["kid_id"] == kid2["id"]

        db = SessionLocal()
        try:
            kid1_claim = db.query(ChoreClaim).filter(
                ChoreClaim.chore_id == chore["id"], ChoreClaim.kid_id == kid1["id"]
            ).one()
            assert kid1_claim.status == "claimed"  # untouched
        finally:
            db.close()

    def test_approve_without_kid_id_backward_compat(self, client, parent_token):
        """Legacy callers (no kid_id) still approve when one claim is pending."""
        kid = make_kid(client, parent_token)
        chore = make_chore(client, parent_token, assigned_kids=[kid["id"]])

        assert _claim(client, parent_token, chore["id"], kid["id"]).status_code == 200
        res = _approve(client, parent_token, chore["id"])
        assert res.status_code == 200
        assert res.json()["kid_id"] == kid["id"]

    def test_disapprove_with_kid_id_targets_correct_claim(self, client, parent_token):
        kid1 = make_kid(client, parent_token)
        kid2 = make_kid(client, parent_token)
        chore = make_chore(client, parent_token, assigned_kids=[kid1["id"], kid2["id"]],
                           allow_multiple_claims_per_day=True)

        assert _claim(client, parent_token, chore["id"], kid1["id"]).status_code == 200
        assert _claim(client, parent_token, chore["id"], kid2["id"]).status_code == 200

        res = client.post(
            f"/api/chores/{chore['id']}/disapprove",
            json={"parent_name": "Tester", "kid_id": kid1["id"]},
            headers=auth(parent_token),
        )
        assert res.status_code == 200

        db = SessionLocal()
        try:
            statuses = {
                c.kid_id: c.status
                for c in db.query(ChoreClaim).filter(ChoreClaim.chore_id == chore["id"]).all()
            }
            assert statuses[kid1["id"]] == "disapproved"
            assert statuses[kid2["id"]] == "claimed"
        finally:
            db.close()


class TestChoreDelete:
    def test_delete_chore_with_claims_succeeds(self, client, parent_token):
        """v0.17.0 regression: deleting an ever-claimed chore 500'd (SQLAlchemy
        nulled chore_claims.chore_id — NOT NULL, no cascade). Claims must be
        removed with the chore."""
        kid = make_kid(client, parent_token)
        chore = make_chore(client, parent_token, assigned_kids=[kid["id"]])

        assert _claim(client, parent_token, chore["id"], kid["id"]).status_code == 200
        assert _approve(client, parent_token, chore["id"]).status_code == 200

        res = client.delete(f"/api/chores/{chore['id']}", headers=auth(parent_token))
        assert res.status_code == 200, res.text

        db = SessionLocal()
        try:
            remaining = db.query(ChoreClaim).filter(
                ChoreClaim.chore_id == chore["id"]
            ).count()
            assert remaining == 0
        finally:
            db.close()


class TestTodaysChoresWeekdayConvention:
    def test_weekly_chore_uses_python_weekday_indices(self, client, parent_token):
        """Pins applicable_days as Python weekday() indices (0=Monday). The
        frontend DAY_NAMES array must stay aligned with this (utils/days.ts)."""
        kid = make_kid(client, parent_token)
        today_idx = datetime.now().weekday()
        other_idx = (today_idx + 3) % 7

        chore_today = make_chore(
            client, parent_token, assigned_kids=[kid["id"]],
            recurring_frequency="weekly", applicable_days=[today_idx],
        )
        chore_other = make_chore(
            client, parent_token, assigned_kids=[kid["id"]],
            recurring_frequency="weekly", applicable_days=[other_idx],
        )

        res = client.get(f"/api/chores/today/{kid['id']}", headers=auth(parent_token))
        assert res.status_code == 200
        ids = {c["id"] for c in res.json()}
        assert chore_today["id"] in ids
        assert chore_other["id"] not in ids
