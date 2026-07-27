"""Every transactional email must render through the v2 branded wrapper.

v0.14.4 replaced 8 hand-inlined legacy green/amber/purple gradient templates
with a single ``_branded_wrapper()`` (dark #0B0E14 header + inline CID logo +
electric-cyan CTA, the "Midnight + Electric" system). These guards fail CI if
any builder regresses to the retired palette or drops the embedded logo.

No DB / event loop needed — the builders are exercised with ``asyncio.run`` and
``send_email`` patched to capture the rendered HTML.
"""
import asyncio
from email.message import Message
from pathlib import Path

import pytest

from app.services import email_service as es
from app.services.email_service import EmailService

MODULE_SRC = Path(es.__file__).read_text(encoding="utf-8")

# One representative call per builder -> (label, coroutine factory)
BUILDERS = [
    ("password_reset", lambda s: s.send_password_reset_email("r@e.com", "https://x/reset?t=1", "Robin")),
    ("password_changed", lambda s: s.send_password_changed_email("r@e.com", "Robin")),
    ("parent_invitation", lambda s: s.send_parent_invitation_email("r@e.com", "Robin", "https://x/invite?t=1")),
    ("chore_claimed", lambda s: s.send_chore_claimed_email("r@e.com", "Robin", "Ava", "Dishes")),
    ("chore_approved", lambda s: s.send_chore_approved_email("r@e.com", "Ava", "Dishes", 15)),
    ("reward_redeemed", lambda s: s.send_reward_redeemed_email("r@e.com", "Robin", "Leo", "Screen time", 100)),
    ("streak_milestone", lambda s: s.send_streak_milestone_email("r@e.com", "Ava", 7)),
    ("daily_summary", lambda s: s.send_daily_summary_email(
        "r@e.com", "Robin",
        [{"name": "Ava", "chores_completed": 4, "points_today": 35, "streak": 6, "total_points": 420}],
    )),
    ("bug_report", lambda s: s.send_bug_report_email(
        "r@e.com", "Robin", "Ava", "kid", "It <b>broke</b> & nothing happened", "0.17.0", "/chores",
    )),
]

# The retired pre-v2 palette — must not survive anywhere in the module or output.
LEGACY_MARKERS = [
    "#10b981",  # legacy green CTA/highlight
    "linear-gradient(135deg, #10b981",
    "linear-gradient(135deg, #f59e0b",
    "linear-gradient(135deg, #8b5cf6",
    "linear-gradient(135deg, #ef4444",
]


def _capture(factory) -> dict:
    """Run a builder with send_email patched; return the captured send args."""
    svc = EmailService()
    box: dict = {}

    async def _cap(to_email, subject, html_content, text_content=None):
        box.update(to=to_email, subject=subject, html=html_content, text=text_content)
        return True

    svc.send_email = _cap  # type: ignore[assignment]
    asyncio.run(factory(svc))
    return box


def test_email_logo_asset_exists_and_is_png():
    p = Path(es._LOGO_PATH)
    assert p.is_file(), f"email header logo missing at {p}"
    assert p.read_bytes()[:8] == b"\x89PNG\r\n\x1a\n", "email-logo.png is not a valid PNG"


def test_branded_wrapper_has_dark_header_and_cid_logo():
    html = EmailService()._branded_wrapper("<p>BODY-MARKER</p>", preheader="PRE-MARKER")
    assert 'src="cid:kclogo"' in html          # embedded logo, not a hosted URL
    assert "#0B0E14" in html                    # dark header
    assert "<p>BODY-MARKER</p>" in html         # body injected
    assert "PRE-MARKER" in html                 # preheader injected


def test_no_legacy_palette_in_source():
    for marker in LEGACY_MARKERS:
        assert marker not in MODULE_SRC, f"legacy palette marker {marker!r} still in email_service.py"


@pytest.mark.parametrize("label,factory", BUILDERS, ids=[b[0] for b in BUILDERS])
def test_builder_routes_through_branded_wrapper(label, factory):
    box = _capture(factory)
    html = box["html"]
    assert 'src="cid:kclogo"' in html, f"{label}: embedded logo missing"
    assert "#0B0E14" in html, f"{label}: not routed through the branded wrapper"
    for marker in ("#10b981", "linear-gradient"):
        assert marker not in html, f"{label}: legacy marker {marker!r} present"
    assert box["text"] and "KidsChores" in box["text"], f"{label}: plain-text alternative missing"


def test_send_email_builds_related_multipart_with_inline_logo(monkeypatch):
    captured: dict = {}

    async def _fake_send(message, **kwargs):
        captured["msg"] = message

    monkeypatch.setattr(es.aiosmtplib, "send", _fake_send)

    svc = EmailService()
    svc._is_configured = True
    svc.username, svc.password, svc.host = "u", "p", "localhost"

    ok = asyncio.run(svc.send_email("r@e.com", "subj", "<p>x</p>", "text body"))
    assert ok is True

    msg: Message = captured["msg"]
    assert msg.get_content_type() == "multipart/related"
    content_types = [part.get_content_type() for part in msg.walk()]
    assert "multipart/alternative" in content_types
    assert "image/png" in content_types
    cids = [part.get("Content-ID") for part in msg.walk() if part.get("Content-ID")]
    assert "<kclogo>" in cids, "inline logo not attached with the cid the HTML references"


def test_unconfigured_send_returns_false_without_raising():
    svc = EmailService()
    svc._is_configured = False
    assert asyncio.run(svc.send_email("r@e.com", "s", "<p>x</p>")) is False
