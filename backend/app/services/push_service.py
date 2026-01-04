"""Push notification service using pywebpush."""
import os
import json
from typing import Optional
from pywebpush import webpush, WebPushException

# VAPID keys should be set as environment variables
# Generate with: npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_CLAIMS = {
    "sub": os.getenv("VAPID_CLAIMS_EMAIL", "mailto:admin@kidschores.local")
}


class PushNotificationService:
    """Service for sending push notifications."""

    def __init__(self):
        self.private_key = VAPID_PRIVATE_KEY
        self.public_key = VAPID_PUBLIC_KEY
        self.vapid_claims = VAPID_CLAIMS

    def get_public_key(self) -> str:
        """Return the VAPID public key for client subscription."""
        return self.public_key

    def send_notification(
        self,
        subscription_info: dict,
        title: str,
        body: str,
        icon: Optional[str] = None,
        tag: Optional[str] = None,
        data: Optional[dict] = None,
        url: Optional[str] = None,
    ) -> bool:
        """
        Send a push notification to a single subscription.

        Args:
            subscription_info: The push subscription object from the client
            title: Notification title
            body: Notification body text
            icon: Optional icon URL
            tag: Optional tag for notification grouping
            data: Optional additional data
            url: Optional URL to open when notification is clicked

        Returns:
            True if notification was sent successfully, False otherwise
        """
        if not self.private_key or not self.public_key:
            print("VAPID keys not configured. Push notifications disabled.")
            return False

        payload = {
            "title": title,
            "body": body,
            "icon": icon or "/icons/icon-192x192.png",
            "badge": "/icons/badge-72x72.png",
            "tag": tag,
            "data": data or {},
            "url": url or "/",
        }

        try:
            webpush(
                subscription_info=subscription_info,
                data=json.dumps(payload),
                vapid_private_key=self.private_key,
                vapid_claims=self.vapid_claims,
            )
            return True
        except WebPushException as e:
            print(f"Push notification failed: {e}")
            # If subscription is expired or invalid, return False
            # The caller should delete the subscription
            if e.response and e.response.status_code in [404, 410]:
                return False
            raise

    def send_chore_claimed(
        self,
        subscription_info: dict,
        kid_name: str,
        chore_name: str,
    ) -> bool:
        """Send notification when a chore is claimed."""
        return self.send_notification(
            subscription_info=subscription_info,
            title="Chore Claimed!",
            body=f"{kid_name} claimed '{chore_name}'",
            tag=f"chore-claimed",
            url="/admin",
        )

    def send_chore_approved(
        self,
        subscription_info: dict,
        chore_name: str,
        points: int,
    ) -> bool:
        """Send notification when a chore is approved."""
        return self.send_notification(
            subscription_info=subscription_info,
            title="Chore Approved!",
            body=f"'{chore_name}' was approved. +{points} points!",
            tag=f"chore-approved",
            url="/",
        )

    def send_streak_milestone(
        self,
        subscription_info: dict,
        kid_name: str,
        streak_days: int,
    ) -> bool:
        """Send notification for streak milestones."""
        milestone_messages = {
            3: "Getting started!",
            7: "One week strong!",
            14: "Two weeks of consistency!",
            30: "A whole month! Amazing!",
            50: "Halfway to 100!",
            100: "LEGENDARY!",
            365: "ONE YEAR CHAMPION!",
        }
        message = milestone_messages.get(streak_days, f"{streak_days} days!")

        return self.send_notification(
            subscription_info=subscription_info,
            title=f"{kid_name}: {streak_days} Day Streak!",
            body=message,
            tag=f"streak-milestone",
            url="/",
        )

    def send_streak_at_risk(
        self,
        subscription_info: dict,
        kid_name: str,
    ) -> bool:
        """Send notification when a streak is at risk."""
        return self.send_notification(
            subscription_info=subscription_info,
            title="Streak at Risk!",
            body=f"{kid_name}'s streak is at risk. Complete a chore today!",
            tag=f"streak-risk",
            url="/chores",
        )

    def send_daily_reminder(
        self,
        subscription_info: dict,
        kid_name: str,
        pending_count: int,
    ) -> bool:
        """Send daily reminder about pending chores."""
        return self.send_notification(
            subscription_info=subscription_info,
            title="Daily Chores Reminder",
            body=f"{kid_name} has {pending_count} chore{'s' if pending_count != 1 else ''} left today!",
            tag=f"daily-reminder",
            url="/chores",
        )


# Singleton instance
push_service = PushNotificationService()
