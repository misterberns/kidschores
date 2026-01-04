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
            return False

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
            await aiosmtplib.send(
                message,
                hostname=self.host,
                port=self.port,
                username=self.username,
                password=self.password,
                start_tls=self.use_tls,
            )

            return True

        except Exception as e:
            print(f"Failed to send email: {e}")
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


# Singleton instance
email_service = EmailService()
