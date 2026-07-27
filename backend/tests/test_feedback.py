"""In-app problem reports (v0.17.0): authz, daily cap, review flow, fan-out,
plus the other v0.17.0 API additions (enriched /approvals/pending names and
the versioned /api/health)."""
from unittest.mock import MagicMock

import app.routers.feedback as feedback_module
from app.database import SessionLocal
from app.models import Feedback

from conftest import auth, make_chore, make_kid, make_kid_account


def _post_report(client, token, message="Something is broken", **extra):
    return client.post(
        "/api/feedback",
        json={"message": message, "app_version": "0.17.0", "page_path": "/chores", **extra},
        headers=auth(token),
    )


class TestFeedbackCreate:
    def test_kid_report_gets_server_derived_role(self, client, parent_token):
        kid = make_kid(client, parent_token)
        kid_token = make_kid_account(kid["id"])

        res = _post_report(client, kid_token, message="Claim does nothing")
        assert res.status_code == 201, res.text
        body = res.json()
        assert body["role"] == "kid"
        assert body["reporter_name"] == kid["name"]
        assert body["status"] == "new"
        assert body["app_version"] == "0.17.0"
        assert body["page_path"] == "/chores"

    def test_parent_report_role_parent(self, client, parent_token):
        res = _post_report(client, parent_token)
        assert res.status_code == 201
        assert res.json()["role"] == "parent"

    def test_message_length_validated(self, client, parent_token):
        assert _post_report(client, parent_token, message="ab").status_code == 422
        assert _post_report(client, parent_token, message="x" * 1001).status_code == 422

    def test_daily_cap_429(self, client, parent_token):
        """6th same-day report from one user is rejected."""
        kid = make_kid(client, parent_token)
        kid_token = make_kid_account(kid["id"])
        for i in range(feedback_module.FEEDBACK_DAILY_CAP):
            assert _post_report(client, kid_token, message=f"report {i}").status_code == 201
        res = _post_report(client, kid_token, message="one too many")
        assert res.status_code == 429

    def test_unauthenticated_401(self, client):
        res = client.post("/api/feedback", json={"message": "no auth"})
        assert res.status_code == 401


class TestFeedbackListAndReview:
    def test_kid_cannot_list(self, client, parent_token):
        kid = make_kid(client, parent_token)
        kid_token = make_kid_account(kid["id"])
        assert client.get("/api/feedback", headers=auth(kid_token)).status_code == 403

    def test_parent_lists_newest_first_and_reviews(self, client, parent_token):
        first = _post_report(client, parent_token, message="older report zzz").json()
        second = _post_report(client, parent_token, message="newer report zzz").json()

        res = client.get("/api/feedback", headers=auth(parent_token))
        assert res.status_code == 200
        ids = [r["id"] for r in res.json()]
        assert ids.index(second["id"]) < ids.index(first["id"])

        rev = client.post(f"/api/feedback/{first['id']}/review", headers=auth(parent_token))
        assert rev.status_code == 200
        assert rev.json()["status"] == "reviewed"
        assert rev.json()["reviewed_by"]

        only_new = client.get("/api/feedback?status=new", headers=auth(parent_token)).json()
        assert first["id"] not in [r["id"] for r in only_new]


class TestFeedbackFanout:
    def test_submit_pushes_all_parents(self, client, parent_token, monkeypatch):
        """The fan-out is the first real caller of notify_all_parents."""
        push_mock = MagicMock()
        monkeypatch.setattr(feedback_module, "notify_all_parents", push_mock)
        monkeypatch.setattr(
            feedback_module.email_service, "is_configured", lambda: False
        )

        kid = make_kid(client, parent_token)
        kid_token = make_kid_account(kid["id"])
        res = _post_report(client, kid_token, message="push me please")
        assert res.status_code == 201

        # TestClient runs BackgroundTasks synchronously after the response.
        push_mock.assert_called_once()
        kwargs = push_mock.call_args.kwargs
        assert kid["name"] in kwargs["title"]
        assert kwargs["url"] == "/admin"


class TestV0170ApiAdditions:
    def test_approvals_pending_carries_names(self, client, parent_token):
        kid = make_kid(client, parent_token)
        chore = make_chore(client, parent_token, assigned_kids=[kid["id"]])
        assert client.post(
            f"/api/chores/{chore['id']}/claim",
            json={"kid_id": kid["id"]}, headers=auth(parent_token),
        ).status_code == 200

        res = client.get("/api/approvals/pending", headers=auth(parent_token))
        assert res.status_code == 200
        match = [c for c in res.json()["chores"] if c["chore_id"] == chore["id"]]
        assert match and match[0]["kid_name"] == kid["name"]
        assert match[0]["chore_name"] == chore["name"]

    def test_health_carries_version(self, client):
        res = client.get("/api/health")
        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "healthy"
        assert body["version"].count(".") == 2
