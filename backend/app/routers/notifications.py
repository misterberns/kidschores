"""Push notification subscription endpoints."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from ..models import PushSubscription, NotificationPreference, Kid, Parent
from ..services.push_service import push_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


# Request/Response models
class PushSubscriptionCreate(BaseModel):
    """Push subscription from the browser."""
    endpoint: str
    keys: dict  # Contains p256dh and auth


class NotificationPreferenceUpdate(BaseModel):
    """Update notification preferences."""
    email_chore_claimed: Optional[bool] = None
    email_chore_approved: Optional[bool] = None
    email_daily_summary: Optional[bool] = None
    push_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None


class VapidKeyResponse(BaseModel):
    """VAPID public key for client subscription."""
    public_key: str


# Endpoints
@router.get("/vapid-key", response_model=VapidKeyResponse)
def get_vapid_key():
    """Get the VAPID public key for push subscription."""
    public_key = push_service.get_public_key()
    if not public_key:
        raise HTTPException(
            status_code=503,
            detail="Push notifications not configured"
        )
    return {"public_key": public_key}


@router.post("/subscribe")
def subscribe(
    subscription: PushSubscriptionCreate,
    user_id: Optional[str] = None,
    kid_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Subscribe to push notifications."""
    # Check if subscription already exists
    existing = db.query(PushSubscription).filter(
        PushSubscription.endpoint == subscription.endpoint
    ).first()

    if existing:
        # Update existing subscription
        existing.p256dh_key = subscription.keys.get("p256dh", "")
        existing.auth_key = subscription.keys.get("auth", "")
        db.commit()
        return {"status": "updated", "id": existing.id}

    # Create new subscription
    new_sub = PushSubscription(
        user_id=user_id,
        kid_id=kid_id,
        endpoint=subscription.endpoint,
        p256dh_key=subscription.keys.get("p256dh", ""),
        auth_key=subscription.keys.get("auth", ""),
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)

    return {"status": "subscribed", "id": new_sub.id}


@router.delete("/unsubscribe")
def unsubscribe(
    endpoint: str,
    db: Session = Depends(get_db),
):
    """Unsubscribe from push notifications."""
    subscription = db.query(PushSubscription).filter(
        PushSubscription.endpoint == endpoint
    ).first()

    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    db.delete(subscription)
    db.commit()

    return {"status": "unsubscribed"}


@router.post("/test")
def send_test_notification(
    endpoint: str,
    db: Session = Depends(get_db),
):
    """Send a test push notification."""
    subscription = db.query(PushSubscription).filter(
        PushSubscription.endpoint == endpoint
    ).first()

    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    subscription_info = {
        "endpoint": subscription.endpoint,
        "keys": {
            "p256dh": subscription.p256dh_key,
            "auth": subscription.auth_key,
        }
    }

    success = push_service.send_notification(
        subscription_info=subscription_info,
        title="Test Notification",
        body="Push notifications are working!",
        tag="test",
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to send notification")

    return {"status": "sent"}


# Notification preferences endpoints
@router.get("/preferences/{user_id}")
def get_preferences(
    user_id: str,
    db: Session = Depends(get_db),
):
    """Get notification preferences for a user."""
    prefs = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == user_id
    ).first()

    if not prefs:
        # Return defaults if not set
        return {
            "email_chore_claimed": True,
            "email_chore_approved": True,
            "email_daily_summary": False,
            "push_enabled": True,
            "quiet_hours_start": None,
            "quiet_hours_end": None,
        }

    return {
        "email_chore_claimed": prefs.email_chore_claimed,
        "email_chore_approved": prefs.email_chore_approved,
        "email_daily_summary": prefs.email_daily_summary,
        "push_enabled": prefs.push_enabled,
        "quiet_hours_start": prefs.quiet_hours_start,
        "quiet_hours_end": prefs.quiet_hours_end,
    }


@router.put("/preferences/{user_id}")
def update_preferences(
    user_id: str,
    updates: NotificationPreferenceUpdate,
    db: Session = Depends(get_db),
):
    """Update notification preferences for a user."""
    prefs = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == user_id
    ).first()

    if not prefs:
        # Create new preferences
        prefs = NotificationPreference(user_id=user_id)
        db.add(prefs)

    # Update only provided fields
    update_data = updates.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(prefs, key, value)

    db.commit()
    db.refresh(prefs)

    return {
        "email_chore_claimed": prefs.email_chore_claimed,
        "email_chore_approved": prefs.email_chore_approved,
        "email_daily_summary": prefs.email_daily_summary,
        "push_enabled": prefs.push_enabled,
        "quiet_hours_start": prefs.quiet_hours_start,
        "quiet_hours_end": prefs.quiet_hours_end,
    }


# Helper function to send notifications to all subscribers
def notify_all_parents(db: Session, title: str, body: str, tag: str = None, url: str = None):
    """Send push notification to all parent subscribers."""
    subscriptions = db.query(PushSubscription).filter(
        PushSubscription.kid_id.is_(None)  # Parent subscriptions don't have kid_id
    ).all()

    for sub in subscriptions:
        subscription_info = {
            "endpoint": sub.endpoint,
            "keys": {
                "p256dh": sub.p256dh_key,
                "auth": sub.auth_key,
            }
        }
        try:
            push_service.send_notification(
                subscription_info=subscription_info,
                title=title,
                body=body,
                tag=tag,
                url=url,
            )
        except Exception as e:
            print(f"Failed to send notification to {sub.endpoint}: {e}")


def notify_kid(db: Session, kid_id: str, title: str, body: str, tag: str = None, url: str = None):
    """Send push notification to a specific kid's device."""
    subscriptions = db.query(PushSubscription).filter(
        PushSubscription.kid_id == kid_id
    ).all()

    for sub in subscriptions:
        subscription_info = {
            "endpoint": sub.endpoint,
            "keys": {
                "p256dh": sub.p256dh_key,
                "auth": sub.auth_key,
            }
        }
        try:
            push_service.send_notification(
                subscription_info=subscription_info,
                title=title,
                body=body,
                tag=tag,
                url=url,
            )
        except Exception as e:
            print(f"Failed to send notification to {sub.endpoint}: {e}")
