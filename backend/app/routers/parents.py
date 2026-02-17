"""Parents API endpoints."""
import os
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_admin
from ..models import Parent, ParentInvitation, User
from ..security import verify_pin, hash_pin
from ..schemas import (
    ParentCreate,
    ParentResponse,
    ParentCreateWithInvite,
    ParentInvitationCreate,
    ParentInvitationResponse,
)
from ..services.email_service import email_service

router = APIRouter()

# Base URL for invitation links (from settings)
from ..config import settings
APP_BASE_URL = settings.app_base_url


@router.get("", response_model=List[ParentResponse])
@router.get("/", response_model=List[ParentResponse], include_in_schema=False)
def list_parents(db: Session = Depends(get_db)):
    """List all parents."""
    return db.query(Parent).all()


async def _create_invitation(
    db: Session,
    parent: Parent,
    email: str,
) -> tuple[str, ParentInvitation]:
    """
    Create an invitation for a parent.

    Returns:
        Tuple of (plaintext_token, invitation_record)
    """
    # Generate secure token
    token = secrets.token_urlsafe(48)  # 64 characters
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    # Set expiration to 24 hours
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    # Delete any existing pending invitations for this parent
    db.query(ParentInvitation).filter(
        ParentInvitation.parent_id == parent.id,
        ParentInvitation.is_consumed == False
    ).delete()

    # Create new invitation
    invitation = ParentInvitation(
        email=email,
        token_hash=token_hash,
        parent_id=parent.id,
        expires_at=expires_at,
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    return token, invitation


@router.post("", response_model=ParentResponse)
@router.post("/", response_model=ParentResponse, include_in_schema=False)
async def create_parent(
    parent: ParentCreateWithInvite,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Create a new parent, optionally sending an email invitation."""
    # Extract invitation fields before creating parent
    email = parent.email
    send_invite = parent.send_invite

    # Create parent data without invitation fields
    parent_data = parent.model_dump(exclude={"email", "send_invite"})
    db_parent = Parent(**parent_data)
    db.add(db_parent)
    db.commit()
    db.refresh(db_parent)

    # Handle invitation if requested
    if send_invite and email:
        token, invitation = await _create_invitation(db, db_parent, email)

        # Build invitation link
        invite_link = f"{APP_BASE_URL}/accept-invitation?token={token}"

        # Send invitation email in background
        background_tasks.add_task(
            email_service.send_parent_invitation_email,
            to_email=email,
            parent_name=db_parent.name,
            invite_link=invite_link,
        )

    return db_parent


@router.get("/{parent_id}", response_model=ParentResponse)
def get_parent(parent_id: str, db: Session = Depends(get_db)):
    """Get parent by ID."""
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    return parent


@router.put("/{parent_id}", response_model=ParentResponse)
def update_parent(parent_id: str, parent_update: ParentCreate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    """Update parent."""
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")

    update_data = parent_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(parent, field, value)

    db.commit()
    db.refresh(parent)
    return parent


@router.delete("/{parent_id}")
def delete_parent(parent_id: str, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    """Delete parent."""
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")

    db.delete(parent)
    db.commit()
    return {"message": "Parent deleted"}


@router.post("/{parent_id}/verify-pin")
def verify_pin_endpoint(parent_id: str, pin: str, db: Session = Depends(get_db)):
    """Verify parent PIN for approval actions."""
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")

    # No PIN set — allow
    if not parent.pin_hash and not parent.pin:
        return {"valid": True, "message": "No PIN set"}

    # Try hashed PIN first
    if parent.pin_hash and verify_pin(pin, parent.pin_hash):
        return {"valid": True, "message": "PIN verified"}

    # Legacy plaintext PIN — verify and migrate to bcrypt
    if parent.pin and parent.pin == pin:
        parent.pin_hash = hash_pin(pin)
        parent.pin = None  # Remove plaintext
        db.commit()
        return {"valid": True, "message": "PIN verified"}

    raise HTTPException(status_code=401, detail="Invalid PIN")


@router.post("/{parent_id}/invite", response_model=ParentInvitationResponse)
async def send_parent_invitation(
    parent_id: str,
    invitation: ParentInvitationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Send an email invitation to an existing parent."""
    # Verify parent exists
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")

    # Check if parent already has a linked user account
    if parent.user_id:
        raise HTTPException(
            status_code=400,
            detail="Parent already has a linked account"
        )

    # Rate limiting: check for recent invitations to this email (max 5 per hour)
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    recent_invites = db.query(ParentInvitation).filter(
        ParentInvitation.email == invitation.email,
        ParentInvitation.created_at > one_hour_ago
    ).count()

    if recent_invites >= 5:
        raise HTTPException(
            status_code=429,
            detail="Too many invitations sent to this email. Please wait before trying again."
        )

    # Create the invitation
    token, inv_record = await _create_invitation(db, parent, invitation.email)

    # Build invitation link
    invite_link = f"{APP_BASE_URL}/accept-invitation?token={token}"

    # Send invitation email in background
    background_tasks.add_task(
        email_service.send_parent_invitation_email,
        to_email=invitation.email,
        parent_name=parent.name,
        invite_link=invite_link,
    )

    return ParentInvitationResponse(
        message=f"Invitation sent to {invitation.email}",
        invitation_sent=True,
        email=invitation.email,
    )
