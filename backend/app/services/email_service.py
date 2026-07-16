"""Email notification service using aiosmtplib.

All transactional emails share a single branded wrapper (`_branded_wrapper`)
styled to the KidsChores v2 "Midnight + Electric" system: a dark #0B0E14 header
carrying the horizontal wordmark (embedded as an inline CID image, since
kidschores.mrberns.tech resolves to a LAN IP and a hosted <img src> is
unreachable to Gmail's image proxy / off-LAN recipients), a light card body,
an electric-cyan CTA, and dark points callouts with volt numerals (volt on
white fails contrast, so the celebratory numbers sit on a dark chip — the
flagship pairing). Per BRAND-GUIDELINES the redesign retired emoji-as-UI,
rainbow gradients and confetti, so the emails use restrained typographic
treatment instead.
"""
import html
import logging
import os
from typing import Optional, List
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
import aiosmtplib

logger = logging.getLogger(__name__)

# Email configuration from environment
SMTP_HOST = os.getenv("SMTP_HOST", "localhost")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "noreply@kidschores.local")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "KidsChores")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"

# v2 "Midnight + Electric" brand tokens (mirrors frontend/src/index.css)
BRAND_BASE = "#0B0E14"        # header / dark chips
BRAND_INK = "#F4F6FB"         # light text (on dark)
BRAND_MUTED_DARK = "#A7B0C0"  # secondary text on dark
BRAND_HERO = "#38E1FF"        # electric cyan — CTA, accents
BRAND_VOLT = "#B6F400"        # volt — positive points (on dark only)
BRAND_STREAK = "#FDBA74"      # streak flame amber (on dark)
BRAND_DANGER = "#FB7185"      # destructive / security
BODY_TEXT = "#334155"         # body copy on the white card
BODY_HEADING = "#0B0E14"      # headings on the white card
BODY_MUTED = "#8A93A6"        # captions / fine print
CARD_BG = "#FFFFFF"
PAGE_BG = "#EEF1F6"
FOOTER_BG = "#F5F7FA"
HAIRLINE = "#E2E8F0"

APP_TAGLINE = "Chores, points &amp; rewards for the whole family"

DISPLAY_FONT = "'Space Grotesk', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
BODY_FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

# Logo embedded inline (multipart/related) so it renders without a public host.
_LOGO_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets", "email-logo.png"))
_LOGO_CID = "kclogo"


def _load_logo_bytes() -> Optional[bytes]:
    """Return the email header logo bytes, or None if unavailable (never raises)."""
    try:
        with open(_LOGO_PATH, "rb") as fh:
            return fh.read()
    except OSError as exc:  # pragma: no cover - defensive
        logger.warning("email-logo.png unavailable (%s); sending without header logo", exc)
        return None


# --- body-content helpers (all inline styles — email clients strip <style>) ---

def _h2(text: str) -> str:
    return (
        f'<h2 style="margin:0 0 16px 0; font-family:{DISPLAY_FONT}; font-weight:700; '
        f'font-size:22px; line-height:1.25; color:{BODY_HEADING}; letter-spacing:-0.01em;">{text}</h2>'
    )


def _p(text: str, muted: bool = False) -> str:
    color = BODY_MUTED if muted else BODY_TEXT
    size = "14px" if muted else "15px"
    return f'<p style="margin:0 0 14px 0; color:{color}; font-size:{size}; line-height:1.6;">{text}</p>'


def _cta(url: str, label: str) -> str:
    """Electric-cyan CTA button (dark text on cyan), Outlook-safe table wrap."""
    return (
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" '
        'style="margin:24px auto;"><tr>'
        f'<td align="center" style="border-radius:10px; background:{BRAND_HERO};">'
        f'<a href="{url}" style="display:inline-block; padding:13px 30px; font-family:{DISPLAY_FONT}; '
        f'font-weight:700; font-size:15px; color:{BRAND_BASE}; text-decoration:none; border-radius:10px;">{label}</a>'
        '</td></tr></table>'
    )


def _callout(number: str, label: str, number_color: str) -> str:
    """Dark chip with a big display number (volt/amber/cyan) + uppercase label."""
    return (
        f'<div style="background:{BRAND_BASE}; border-radius:14px; padding:24px; text-align:center; margin:20px 0;">'
        f'<div style="font-family:{DISPLAY_FONT}; font-weight:700; font-size:44px; line-height:1; color:{number_color};">{number}</div>'
        f'<div style="color:{BRAND_MUTED_DARK}; font-size:12px; letter-spacing:0.06em; text-transform:uppercase; margin-top:10px;">{label}</div>'
        '</div>'
    )


def _link_fallback(url: str) -> str:
    return (
        f'<p style="word-break:break-all; font-size:12px; color:{BODY_MUTED}; margin:4px 0 0 0; line-height:1.5;">'
        f'If the button doesn\'t work, copy and paste this link into your browser:<br>{url}</p>'
    )


def _note_box(title: str, inner_html: str, accent: str) -> str:
    """Left-accent-bordered info/warning box on a subtle tint."""
    return (
        f'<div style="background:#F1F5F9; border-left:3px solid {accent}; border-radius:8px; '
        f'padding:14px 16px; margin-top:20px;">'
        f'<div style="font-family:{DISPLAY_FONT}; font-weight:700; font-size:14px; color:{BODY_HEADING}; margin-bottom:6px;">{title}</div>'
        f'<div style="font-size:14px; color:{BODY_TEXT}; line-height:1.6;">{inner_html}</div>'
        '</div>'
    )


def _bullets(items: List[str]) -> str:
    lis = "".join(f'<li style="margin:2px 0;">{it}</li>' for it in items)
    return f'<ul style="margin:0; padding-left:20px;">{lis}</ul>'


class EmailService:
    """Service for sending email notifications."""

    def __init__(self):
        self.host = SMTP_HOST
        self.port = SMTP_PORT
        self.username = SMTP_USER
        self.password = SMTP_PASSWORD
        self.from_email = SMTP_FROM_EMAIL
        self.from_name = SMTP_FROM_NAME
        self.use_tls = SMTP_USE_TLS
        self._is_configured = bool(SMTP_USER and SMTP_PASSWORD and SMTP_HOST)

    def is_configured(self) -> bool:
        """Check if email service is properly configured."""
        return self._is_configured

    def _branded_wrapper(self, body_html: str, preheader: str = "") -> str:
        """Wrap body HTML in the KidsChores v2 branded shell (dark header + CID logo)."""
        preheader_block = (
            f'<div style="display:none; max-height:0; overflow:hidden; opacity:0; '
            f'mso-hide:all;">{preheader}</div>'
            if preheader else ""
        )
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="referrer" content="no-referrer">
    <meta name="color-scheme" content="light">
</head>
<body style="margin:0; padding:0; background:{PAGE_BG}; font-family:{BODY_FONT};">
    {preheader_block}
    <div style="background:{PAGE_BG}; padding:24px 12px;">
        <div style="max-width:560px; margin:0 auto; background:{CARD_BG}; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(11,14,20,0.10);">
            <div style="background:{BRAND_BASE}; padding:28px 32px; text-align:center;">
                <img src="cid:{_LOGO_CID}" alt="KidsChores" width="196" style="width:196px; max-width:62%; height:auto; display:inline-block; border:0; outline:none; text-decoration:none;">
                <div style="color:{BRAND_MUTED_DARK}; font-size:13px; margin-top:10px; letter-spacing:0.01em;">{APP_TAGLINE}</div>
            </div>
            <div style="padding:32px;">
                {body_html}
            </div>
            <div style="background:{FOOTER_BG}; padding:20px 32px; text-align:center; color:{BODY_MUTED}; font-size:12px; line-height:1.5;">
                <p style="margin:0 0 4px 0;">This is an automated message from KidsChores.</p>
                <p style="margin:0;">Manage notifications anytime in the app settings.</p>
            </div>
        </div>
    </div>
</body>
</html>"""

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        """
        Send an email.

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML body
            text_content: Optional plain text body

        Returns:
            True if sent successfully, False otherwise
        """
        if not self._is_configured:
            logger.warning("Email service not configured, skipping send")
            logger.debug(f"SMTP_HOST={self.host}, SMTP_USER={self.username}, HAS_PASSWORD={bool(self.password)}")
            return False

        logger.info(f"Sending email to {to_email} via {self.host}:{self.port}")
        try:
            # multipart/related wraps the text+html alternative AND the inline logo
            message = MIMEMultipart("related")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email

            alternative = MIMEMultipart("alternative")
            if text_content:
                alternative.attach(MIMEText(text_content, "plain"))
            alternative.attach(MIMEText(html_content, "html"))
            message.attach(alternative)

            # Inline logo (CID). Missing file → send without it (never crash).
            logo_bytes = _load_logo_bytes()
            if logo_bytes is not None:
                logo_part = MIMEImage(logo_bytes, _subtype="png")
                logo_part.add_header("Content-ID", f"<{_LOGO_CID}>")
                logo_part.add_header("Content-Disposition", "inline", filename="kidschores.png")
                message.attach(logo_part)

            # Send email
            logger.debug(f"Connecting to SMTP: {self.host}:{self.port} TLS={self.use_tls}")
            await aiosmtplib.send(
                message,
                hostname=self.host,
                port=self.port,
                username=self.username,
                password=self.password,
                start_tls=self.use_tls,
            )

            logger.info(f"Email sent to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}", exc_info=True)
            return False

    async def send_chore_claimed_email(
        self,
        to_email: str,
        parent_name: str,
        kid_name: str,
        chore_name: str,
    ) -> bool:
        """Send email when a chore is claimed."""
        parent_name = html.escape(parent_name)
        kid_name = html.escape(kid_name)
        chore_name = html.escape(chore_name)
        subject = f"[KidsChores] {kid_name} claimed '{chore_name}'"

        body = (
            _h2("Chore claimed")
            + _p(f"Hi {parent_name},")
            + _p(f'<strong style="color:{BODY_HEADING};">{kid_name}</strong> just claimed '
                 f'<strong style="color:{BODY_HEADING};">&ldquo;{chore_name}&rdquo;</strong> '
                 "&mdash; it's now waiting for your approval.")
            + _p("Open KidsChores to verify it's done and award the points.", muted=True)
        )
        html_content = self._branded_wrapper(body, preheader=f"{kid_name} claimed {chore_name}")

        text_content = f"""Hi {parent_name},

{kid_name} has claimed the chore: "{chore_name}"

The chore is now awaiting your approval. Once you verify it's complete, you can approve it to award points.

--
KidsChores
"""
        return await self.send_email(to_email, subject, html_content, text_content)

    async def send_chore_approved_email(
        self,
        to_email: str,
        kid_name: str,
        chore_name: str,
        points_awarded: int,
    ) -> bool:
        """Send email when a chore is approved."""
        kid_name = html.escape(kid_name)
        chore_name = html.escape(chore_name)
        subject = f"[KidsChores] Great job, {kid_name}! '{chore_name}' approved!"

        body = (
            _h2(f"Nice work, {kid_name}!")
            + _p(f'Your chore <strong style="color:{BODY_HEADING};">&ldquo;{chore_name}&rdquo;</strong> was approved.')
            + _callout(f"+{points_awarded}", "points earned", BRAND_VOLT)
            + _p("Keep the streak going.", muted=True)
        )
        html_content = self._branded_wrapper(body, preheader=f"{chore_name} approved: +{points_awarded} points")

        text_content = f"""Great work, {kid_name}!

Your chore "{chore_name}" has been approved!

+{points_awarded} points earned!

Keep up the great work!

--
KidsChores
"""
        return await self.send_email(to_email, subject, html_content, text_content)

    async def send_daily_summary_email(
        self,
        to_email: str,
        parent_name: str,
        kids_summary: List[dict],
    ) -> bool:
        """Send daily summary email to parents."""
        parent_name = html.escape(parent_name)
        subject = "[KidsChores] Daily Summary"

        def _stat(label: str, value: str, accent: bool = False) -> str:
            vcolor = "#5C8A00" if accent else BODY_HEADING  # deepened volt reads AA on white
            return (
                '<tr>'
                f'<td style="padding:3px 0; color:{BODY_MUTED}; font-size:13px;">{label}</td>'
                f'<td align="right" style="padding:3px 0; color:{vcolor}; font-size:14px; font-weight:700;">{value}</td>'
                '</tr>'
            )

        kids_html = ""
        for kid in kids_summary:
            name = html.escape(str(kid.get('name', '')))
            kids_html += (
                f'<div style="border:1px solid {HAIRLINE}; border-radius:12px; padding:16px; margin:12px 0;">'
                f'<div style="font-family:{DISPLAY_FONT}; font-weight:700; font-size:17px; color:{BODY_HEADING}; margin-bottom:8px;">{name}</div>'
                '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
                + _stat("Chores completed", str(kid['chores_completed']))
                + _stat("Points earned today", f"+{kid['points_today']}", accent=True)
                + _stat("Current streak", f"{kid['streak']} days")
                + _stat("Total points", str(kid['total_points']))
                + '</table></div>'
            )

        body = (
            _h2("Daily summary")
            + _p(f"Hi {parent_name}, here's how today went:")
            + kids_html
        )
        html_content = self._branded_wrapper(body, preheader="Your family's daily chore summary")

        text_content = f"""Hi {parent_name},

Here's how your kids did today:

{"".join([f"{html.escape(str(k.get('name','')))}: {k['chores_completed']} chores, {k['points_today']} points, {k['streak']} day streak" + chr(10) for k in kids_summary])}
--
KidsChores
"""
        return await self.send_email(to_email, subject, html_content, text_content)

    async def send_streak_milestone_email(
        self,
        to_email: str,
        kid_name: str,
        streak_days: int,
    ) -> bool:
        """Send email for streak milestones."""
        kid_name = html.escape(kid_name)
        milestone_messages = {
            3: "Getting started! Keep it up!",
            7: "One full week! That's dedication!",
            14: "Two weeks strong! You're unstoppable!",
            30: "A whole month! Incredible commitment!",
            50: "50 days! You're a chore champion!",
            100: "100 days! Legendary!",
            365: "One year! Ultimate champion!",
        }
        message = html.escape(milestone_messages.get(streak_days, f"{streak_days} days! Amazing!"))

        subject = f"[KidsChores] {kid_name} hit a {streak_days}-day streak!"

        body = (
            _h2(f"Congratulations, {kid_name}!")
            + _callout(str(streak_days), "day streak", BRAND_STREAK)
            + _p(f'<span style="color:{BODY_HEADING}; font-weight:600;">{message}</span>')
        )
        html_content = self._branded_wrapper(body, preheader=f"{kid_name} reached a {streak_days}-day streak")

        text_content = f"""Congratulations, {kid_name}!

You hit a {streak_days}-day streak!

{milestone_messages.get(streak_days, f"{streak_days} days! Amazing!")}

--
KidsChores
"""
        return await self.send_email(to_email, subject, html_content, text_content)

    async def send_parent_invitation_email(
        self,
        to_email: str,
        parent_name: str,
        invite_link: str,
    ) -> bool:
        """Send parent invitation email with secure link to create account."""
        parent_name = html.escape(parent_name)
        invite_link = html.escape(invite_link)
        subject = "[KidsChores] You're Invited!"

        body = (
            _h2("Welcome to KidsChores!")
            + _p("Hi there!")
            + _p(f'You\'ve been added as a parent (<strong style="color:{BODY_HEADING};">{parent_name}</strong>) '
                 "to help manage chores for your family.")
            + _p("Set up your account to get started:")
            + _cta(invite_link, "Accept invitation")
            + _link_fallback(invite_link)
            + _note_box(
                "What you'll be able to do",
                _bullets([
                    "Approve chores completed by kids",
                    "Award points and bonuses",
                    "Manage rewards and allowances",
                    "Track progress and streaks",
                ]),
                BRAND_HERO,
            )
            + _p("This invitation expires in 24 hours.", muted=True)
        )
        html_content = self._branded_wrapper(body, preheader="You've been invited to KidsChores")

        text_content = f"""Hi there!

You've been added as a parent ({parent_name}) to help manage chores for your family in KidsChores.

Click the link below to set up your account:
{invite_link}

What you'll be able to do:
- Approve chores completed by kids
- Award points and bonuses
- Manage rewards and allowances
- Track progress and streaks

Note: This invitation expires in 24 hours.

--
KidsChores

If you didn't expect this invitation, you can safely ignore this email.
"""
        return await self.send_email(to_email, subject, html_content, text_content)

    async def send_password_reset_email(
        self,
        to_email: str,
        reset_link: str,
        display_name: str,
    ) -> bool:
        """Send password reset email with secure link."""
        display_name = html.escape(display_name)
        reset_link = html.escape(reset_link)
        subject = "[KidsChores] Reset Your Password"

        body = (
            _h2("Reset your password")
            + _p(f"Hi {display_name},")
            + _p("We received a request to reset the password for your KidsChores account. "
                 "Click below to create a new one:")
            + _cta(reset_link, "Reset password")
            + _link_fallback(reset_link)
            + _note_box(
                "Good to know",
                _bullets([
                    "This link expires in 1 hour",
                    "If you didn't request this, you can safely ignore this email",
                    "Your password won't change until you create a new one",
                ]),
                BRAND_HERO,
            )
        )
        html_content = self._branded_wrapper(body, preheader="Reset your KidsChores password")

        text_content = f"""Hi {display_name},

We received a request to reset your password for your KidsChores account.

Click the link below to create a new password:
{reset_link}

Important:
- This link expires in 1 hour
- If you didn't request this reset, you can safely ignore this email
- Your password won't change until you create a new one

--
KidsChores
"""
        return await self.send_email(to_email, subject, html_content, text_content)

    async def send_password_changed_email(
        self,
        to_email: str,
        display_name: str,
    ) -> bool:
        """Send confirmation email after password has been changed."""
        display_name = html.escape(display_name)
        subject = "[KidsChores] Your Password Has Been Changed"

        body = (
            _h2("Password changed")
            + _p(f"Hi {display_name},")
            + _p("Your KidsChores password has been successfully changed. "
                 "You can now log in with your new password.")
            + _note_box(
                "Wasn't you?",
                "If you didn't make this change, please contact support immediately &mdash; "
                "your account may have been compromised.",
                BRAND_DANGER,
            )
        )
        html_content = self._branded_wrapper(body, preheader="Your KidsChores password was changed")

        text_content = f"""Hi {display_name},

Your KidsChores password has been successfully changed.

You can now log in with your new password.

Wasn't you?
If you didn't make this change, please contact support immediately as your account may have been compromised.

--
KidsChores
"""
        return await self.send_email(to_email, subject, html_content, text_content)

    async def send_reward_redeemed_email(
        self,
        to_email: str,
        parent_name: str,
        kid_name: str,
        reward_name: str,
        points_spent: int,
    ) -> bool:
        """Send email when a kid redeems a reward."""
        parent_name = html.escape(parent_name)
        kid_name = html.escape(kid_name)
        reward_name = html.escape(reward_name)
        subject = f"[KidsChores] {kid_name} redeemed '{reward_name}'"

        body = (
            _h2("Reward redeemed")
            + _p(f"Hi {parent_name},")
            + _p(f'<strong style="color:{BODY_HEADING};">{kid_name}</strong> redeemed '
                 f'<strong style="color:{BODY_HEADING};">&ldquo;{reward_name}&rdquo;</strong>.')
            + _callout(f"-{points_spent}", "points redeemed", BRAND_HERO)
            + _p("This reward may need your approval before it's granted. "
                 "Open KidsChores to review.", muted=True)
        )
        html_content = self._branded_wrapper(body, preheader=f"{kid_name} redeemed {reward_name}")

        text_content = f"""Hi {parent_name},

{kid_name} has redeemed the reward: "{reward_name}"

Points spent: {points_spent}

This reward may require your approval before it's granted.

--
KidsChores
"""
        return await self.send_email(to_email, subject, html_content, text_content)


# Singleton instance
email_service = EmailService()
