"""Email notification service using aiosmtplib."""
import os
import asyncio
from typing import Optional, List
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import aiosmtplib

# Email configuration from environment
SMTP_HOST = os.getenv("SMTP_HOST", "localhost")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "noreply@kidschores.local")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "KidsChores")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"


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
            print("Email service not configured. Skipping email send.")
            print(f"  SMTP_HOST={self.host}, SMTP_USER={self.username}, HAS_PASSWORD={bool(self.password)}")
            return False

        print(f"Attempting to send email to {to_email} via {self.host}:{self.port}")
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email

            # Add plain text version
            if text_content:
                message.attach(MIMEText(text_content, "plain"))

            # Add HTML version
            message.attach(MIMEText(html_content, "html"))

            # Send email
            print(f"Connecting to SMTP: {self.host}:{self.port} with TLS={self.use_tls}")
            await aiosmtplib.send(
                message,
                hostname=self.host,
                port=self.port,
                username=self.username,
                password=self.password,
                start_tls=self.use_tls,
            )

            print(f"Email sent successfully to {to_email}")
            return True

        except Exception as e:
            print(f"Failed to send email to {to_email}: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            return False

    async def send_chore_claimed_email(
        self,
        to_email: str,
        parent_name: str,
        kid_name: str,
        chore_name: str,
    ) -> bool:
        """Send email when a chore is claimed."""
        subject = f"[KidsChores] {kid_name} claimed '{chore_name}'"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }}
                .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }}
                .highlight {{ background: #10b981; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold; display: inline-block; }}
                .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
                .btn {{ display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Chore Claimed!</h1>
                </div>
                <div class="content">
                    <p>Hi {parent_name},</p>
                    <p><span class="highlight">{kid_name}</span> has claimed the chore:</p>
                    <h2 style="color: #10b981;">"{chore_name}"</h2>
                    <p>The chore is now awaiting your approval. Once you verify it's complete, you can approve it to award points.</p>
                    <a href="#" class="btn">Review Now</a>
                </div>
                <div class="footer">
                    <p>This is an automated message from KidsChores.</p>
                    <p>To change your notification preferences, visit the app settings.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Hi {parent_name},

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
        subject = f"[KidsChores] Great job, {kid_name}! '{chore_name}' approved!"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #f59e0b, #ef4444); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }}
                .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; text-align: center; }}
                .points {{ font-size: 48px; font-weight: bold; color: #f59e0b; }}
                .star {{ font-size: 24px; }}
                .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Awesome Job!</h1>
                </div>
                <div class="content">
                    <p class="star">&#11088;&#11088;&#11088;</p>
                    <p>Great work, <strong>{kid_name}</strong>!</p>
                    <p>Your chore <strong>"{chore_name}"</strong> has been approved!</p>
                    <p class="points">+{points_awarded}</p>
                    <p>points earned!</p>
                    <p style="margin-top: 20px; color: #6b7280;">Keep up the great work!</p>
                </div>
                <div class="footer">
                    <p>This is an automated message from KidsChores.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Great work, {kid_name}!

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
        subject = "[KidsChores] Daily Summary"

        # Build summary HTML
        kids_html = ""
        for kid in kids_summary:
            kids_html += f"""
            <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #e5e7eb;">
                <h3 style="margin: 0 0 10px 0; color: #10b981;">{kid['name']}</h3>
                <p style="margin: 5px 0;">Chores completed: <strong>{kid['chores_completed']}</strong></p>
                <p style="margin: 5px 0;">Points earned today: <strong>{kid['points_today']}</strong></p>
                <p style="margin: 5px 0;">Current streak: <strong>{kid['streak']} days</strong></p>
                <p style="margin: 5px 0;">Total points: <strong>{kid['total_points']}</strong></p>
            </div>
            """

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #8b5cf6, #3b82f6); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }}
                .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }}
                .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Daily Summary</h1>
                </div>
                <div class="content">
                    <p>Hi {parent_name},</p>
                    <p>Here's how your kids did today:</p>
                    {kids_html}
                </div>
                <div class="footer">
                    <p>This is an automated message from KidsChores.</p>
                    <p>To change your notification preferences, visit the app settings.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Hi {parent_name},

        Here's how your kids did today:

        {"".join([f"{k['name']}: {k['chores_completed']} chores, {k['points_today']} points, {k['streak']} day streak" for k in kids_summary])}

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
        milestone_messages = {
            3: "Getting started! Keep it up!",
            7: "One full week! That's dedication!",
            14: "Two weeks strong! You're unstoppable!",
            30: "A whole month! Incredible commitment!",
            50: "50 days! You're a chore champion!",
            100: "100 DAYS! LEGENDARY!",
            365: "ONE YEAR! ULTIMATE CHAMPION!",
        }
        message = milestone_messages.get(streak_days, f"{streak_days} days! Amazing!")

        subject = f"[KidsChores] {kid_name} hit a {streak_days}-day streak!"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #f59e0b, #ef4444); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }}
                .streak {{ font-size: 64px; font-weight: bold; }}
                .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; text-align: center; }}
                .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <p class="streak">{streak_days}</p>
                    <h1>Day Streak!</h1>
                </div>
                <div class="content">
                    <h2>Congratulations, {kid_name}!</h2>
                    <p style="font-size: 18px; color: #f59e0b;">{message}</p>
                    <p style="font-size: 36px;">&#127942; &#11088; &#127881;</p>
                </div>
                <div class="footer">
                    <p>This is an automated message from KidsChores.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Congratulations, {kid_name}!

        You hit a {streak_days}-day streak!

        {message}

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
        subject = "[KidsChores] You're Invited!"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="referrer" content="no-referrer">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }}
                .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }}
                .btn {{ display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
                .highlight {{ background: #10b981; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold; display: inline-block; }}
                .info {{ background: #e0f2fe; border: 1px solid #0284c7; border-radius: 6px; padding: 12px; margin-top: 20px; font-size: 14px; }}
                .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
                .link-fallback {{ word-break: break-all; font-size: 12px; color: #6b7280; margin-top: 10px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to KidsChores!</h1>
                </div>
                <div class="content">
                    <p>Hi there!</p>
                    <p>You've been added as a parent <span class="highlight">{parent_name}</span> to help manage chores for your family.</p>
                    <p>Click the button below to set up your account:</p>
                    <p style="text-align: center;">
                        <a href="{invite_link}" class="btn">Accept Invitation</a>
                    </p>
                    <p class="link-fallback">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        {invite_link}
                    </p>
                    <div class="info">
                        <strong>What you'll be able to do:</strong>
                        <ul style="margin: 5px 0; padding-left: 20px;">
                            <li>Approve chores completed by kids</li>
                            <li>Award points and bonuses</li>
                            <li>Manage rewards and allowances</li>
                            <li>Track progress and streaks</li>
                        </ul>
                    </div>
                    <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
                        <strong>Note:</strong> This invitation expires in 24 hours.
                    </p>
                </div>
                <div class="footer">
                    <p>This is an automated message from KidsChores.</p>
                    <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
Hi there!

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
        subject = "[KidsChores] Reset Your Password"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="referrer" content="no-referrer">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #ef4444, #f97316); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }}
                .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }}
                .btn {{ display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
                .warning {{ background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin-top: 20px; font-size: 14px; }}
                .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
                .link-fallback {{ word-break: break-all; font-size: 12px; color: #6b7280; margin-top: 10px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Password Reset</h1>
                </div>
                <div class="content">
                    <p>Hi {display_name},</p>
                    <p>We received a request to reset your password for your KidsChores account.</p>
                    <p>Click the button below to create a new password:</p>
                    <p style="text-align: center;">
                        <a href="{reset_link}" class="btn">Reset Password</a>
                    </p>
                    <p class="link-fallback">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        {reset_link}
                    </p>
                    <div class="warning">
                        <strong>Important:</strong>
                        <ul style="margin: 5px 0; padding-left: 20px;">
                            <li>This link expires in 1 hour</li>
                            <li>If you didn't request this reset, you can safely ignore this email</li>
                            <li>Your password won't change until you create a new one</li>
                        </ul>
                    </div>
                </div>
                <div class="footer">
                    <p>This is an automated message from KidsChores.</p>
                    <p>If you didn't request a password reset, please ignore this email.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
Hi {display_name},

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
        subject = "[KidsChores] Your Password Has Been Changed"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }}
                .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }}
                .success-icon {{ font-size: 48px; text-align: center; }}
                .warning {{ background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin-top: 20px; font-size: 14px; }}
                .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Password Changed</h1>
                </div>
                <div class="content">
                    <p class="success-icon">&#9989;</p>
                    <p>Hi {display_name},</p>
                    <p>Your KidsChores password has been successfully changed.</p>
                    <p>You can now log in with your new password.</p>
                    <div class="warning">
                        <strong>Wasn't you?</strong><br>
                        If you didn't make this change, please contact support immediately as your account may have been compromised.
                    </div>
                </div>
                <div class="footer">
                    <p>This is an automated message from KidsChores.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
Hi {display_name},

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
        subject = f"[KidsChores] {kid_name} redeemed '{reward_name}'"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #f59e0b, #ef4444); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }}
                .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }}
                .highlight {{ background: #f59e0b; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold; display: inline-block; }}
                .points {{ font-size: 36px; font-weight: bold; color: #ef4444; text-align: center; }}
                .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
                .btn {{ display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Reward Redeemed!</h1>
                </div>
                <div class="content">
                    <p>Hi {parent_name},</p>
                    <p><span class="highlight">{kid_name}</span> has redeemed the reward:</p>
                    <h2 style="color: #f59e0b;">"{reward_name}"</h2>
                    <p class="points">-{points_spent} points</p>
                    <p>This reward may require your approval before it's granted.</p>
                    <a href="#" class="btn">Review Now</a>
                </div>
                <div class="footer">
                    <p>This is an automated message from KidsChores.</p>
                    <p>To change your notification preferences, visit the app settings.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Hi {parent_name},

        {kid_name} has redeemed the reward: "{reward_name}"

        Points spent: {points_spent}

        This reward may require your approval before it's granted.

        --
        KidsChores
        """

        return await self.send_email(to_email, subject, html_content, text_content)


# Singleton instance
email_service = EmailService()
