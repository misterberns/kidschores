#!/usr/bin/env python3
"""Render every branded transactional email to a single browsable HTML file.

Runs each of the 8 `EmailService` builders through the REAL `_branded_wrapper()`
with representative sample data (patching `send_email` to capture the HTML
instead of sending), then writes an `email-preview.html` gallery — one iframe
per email — so the operator can eyeball them in a browser before anything ships.

The inline CID logo (`cid:kclogo`) is swapped to a base64 data-URI FOR PREVIEW
ONLY — real sends still embed it as a multipart/related CID attachment (data
URIs are Gmail-blocked; CID is what actually renders in a mail client).

Usage (in the backend image, backend/ bind-mounted at /app):
    python scripts/preview_emails.py [output.html]
Default output: scripts/email-preview.html (a build artifact — gitignored).
"""
import asyncio
import base64
import html
import sys
from pathlib import Path

sys.path.insert(0, "/app")  # app package root inside the image

from app.services import email_service as es  # noqa: E402

SAMPLES = [
    # (label, coroutine-factory) — password reset first (the one the operator flagged)
    ("Password reset", lambda svc: svc.send_password_reset_email(
        to_email="robin@example.com",
        reset_link="https://kidschores.mrberns.tech:8443/reset-password?token=demo-reset-token-abc123",
        display_name="Robin",
    )),
    ("Password changed", lambda svc: svc.send_password_changed_email(
        to_email="robin@example.com",
        display_name="Robin",
    )),
    ("Parent invitation", lambda svc: svc.send_parent_invitation_email(
        to_email="robin@example.com",
        parent_name="Robin",
        invite_link="https://kidschores.mrberns.tech:8443/accept-invite?token=demo-invite-token-xyz789",
    )),
    ("Chore claimed", lambda svc: svc.send_chore_claimed_email(
        to_email="robin@example.com",
        parent_name="Robin",
        kid_name="Ava",
        chore_name="Take out the recycling",
    )),
    ("Chore approved", lambda svc: svc.send_chore_approved_email(
        to_email="robin@example.com",
        kid_name="Ava",
        chore_name="Take out the recycling",
        points_awarded=15,
    )),
    ("Reward redeemed", lambda svc: svc.send_reward_redeemed_email(
        to_email="robin@example.com",
        parent_name="Robin",
        kid_name="Leo",
        reward_name="30 min extra screen time",
        points_spent=100,
    )),
    ("Streak milestone", lambda svc: svc.send_streak_milestone_email(
        to_email="robin@example.com",
        kid_name="Ava",
        streak_days=7,
    )),
    ("Daily summary", lambda svc: svc.send_daily_summary_email(
        to_email="robin@example.com",
        parent_name="Robin",
        kids_summary=[
            {"name": "Ava", "chores_completed": 4, "points_today": 35, "streak": 6, "total_points": 420},
            {"name": "Leo", "chores_completed": 2, "points_today": 20, "streak": 0, "total_points": 180},
        ],
    )),
]


def _logo_data_uri() -> str:
    try:
        b = Path(es._LOGO_PATH).read_bytes()
        return "data:image/png;base64," + base64.b64encode(b).decode("ascii")
    except OSError:
        return ""


async def _collect() -> list[tuple[str, str]]:
    svc = es.EmailService()
    captured: dict[str, str] = {}

    async def _capture(to_email, subject, html_content, text_content=None):
        captured["subject"] = subject
        captured["html"] = html_content
        return True

    svc.send_email = _capture  # type: ignore[assignment]

    out = []
    data_uri = _logo_data_uri()
    for label, factory in SAMPLES:
        captured.clear()
        await factory(svc)
        rendered = captured["html"].replace(f'src="cid:{es._LOGO_CID}"', f'src="{data_uri}"')
        out.append((f"{label}  —  {captured['subject']}", rendered))
    return out


def _build_gallery(emails: list[tuple[str, str]]) -> str:
    cards = []
    for i, (label, email_html) in enumerate(emails):
        srcdoc = html.escape(email_html)
        cards.append(f"""
      <section class="card">
        <h2>{html.escape(label)}</h2>
        <iframe id="f{i}" srcdoc="{srcdoc}" onload="fit(this)" scrolling="no"></iframe>
      </section>""")
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>KidsChores email preview</title>
<style>
  :root {{ color-scheme: light dark; }}
  body {{ margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
          background:#1B2230; color:#F4F6FB; }}
  header {{ padding:20px 24px; border-bottom:1px solid #262E3D; }}
  header h1 {{ margin:0 0 6px 0; font-size:20px; }}
  header p {{ margin:0; color:#A7B0C0; font-size:13px; }}
  .grid {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(560px,1fr)); gap:20px; padding:24px; }}
  .card {{ background:#141922; border:1px solid #262E3D; border-radius:12px; padding:14px; }}
  .card h2 {{ margin:0 0 10px 0; font-size:14px; color:#38E1FF; font-weight:600; }}
  iframe {{ width:100%; border:0; border-radius:8px; background:#EEF1F6; display:block; }}
</style></head><body>
<header>
  <h1>KidsChores — branded transactional emails (preview)</h1>
  <p>All 8 emails rendered through the real <code>_branded_wrapper()</code>. The header logo shows here via a
     base64 data-URI <strong>for preview only</strong>; real sends embed it as an inline CID attachment
     (so it renders in Gmail, which blocks data-URIs). Nothing sends or ships until you OK it.</p>
</header>
<div class="grid">{''.join(cards)}</div>
<script>
  function fit(f) {{
    try {{ f.style.height = (f.contentWindow.document.body.scrollHeight + 4) + 'px'; }}
    catch (e) {{ f.style.height = '760px'; }}
  }}
  window.addEventListener('load', () => document.querySelectorAll('iframe').forEach(fit));
</script>
</body></html>"""


async def main():
    out_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/app/scripts/email-preview.html")
    emails = await _collect()
    out_path.write_text(_build_gallery(emails), encoding="utf-8")
    print(f"Wrote {out_path} ({len(emails)} emails)")


if __name__ == "__main__":
    asyncio.run(main())
