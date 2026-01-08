"""Authentication endpoints."""
from datetime import datetime, timedelta
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import get_current_user, require_auth
from ..models import User, Parent, Kid, PasswordResetToken
from ..schemas import (
    PasswordResetRequest,
    PasswordResetVerify,
    PasswordResetResponse,
    PasswordResetTokenStatus,
)
from ..security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
    hash_pin,
    verify_pin,
    generate_reset_token,
    verify_reset_token,
)
from ..services.email_service import email_service

router = APIRouter()


# --- Request/Response Schemas ---

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str
    pin: Optional[str] = None  # Optional 4-digit PIN


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class GoogleAuthRequest(BaseModel):
    code: str  # Authorization code from Google


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str
    avatar_url: Optional[str]
    oauth_provider: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class KidSummary(BaseModel):
    id: str
    name: str
    points: float


class MeResponse(BaseModel):
    user: UserResponse
    parent: Optional[dict]  # Parent profile if exists
    kids: List[KidSummary]  # Associated kids


class VerifyPinRequest(BaseModel):
    pin: str


class VerifyPinResponse(BaseModel):
    valid: bool


# --- Endpoints ---

@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account."""
    # Check if email already exists
    existing = db.query(User).filter(User.email == request.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create user
    user = User(
        email=request.email.lower(),
        password_hash=hash_password(request.password),
        display_name=request.display_name,
    )
    db.add(user)
    db.flush()  # Get the ID

    # Create associated parent profile
    parent = Parent(
        name=request.display_name,
        user_id=user.id,
        pin_hash=hash_pin(request.pin) if request.pin else None,
    )
    db.add(parent)
    db.commit()

    # Generate tokens
    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login with email and password."""
    user = db.query(User).filter(User.email == request.email.lower()).first()

    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    # Generate tokens
    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: RefreshRequest, db: Session = Depends(get_db)):
    """Refresh access token using refresh token."""
    payload = decode_token(request.refresh_token)

    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    # Generate new tokens
    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/google", response_model=TokenResponse)
async def google_auth(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Exchange Google authorization code for tokens."""
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured"
        )

    # Exchange code for Google tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": request.code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
            },
        )

    if token_response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to exchange Google authorization code"
        )

    token_data = token_response.json()
    google_access_token = token_data.get("access_token")

    # Get user info from Google
    async with httpx.AsyncClient() as client:
        userinfo_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {google_access_token}"},
        )

    if userinfo_response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to get user info from Google"
        )

    google_user = userinfo_response.json()
    google_id = google_user.get("id")
    email = google_user.get("email", "").lower()
    name = google_user.get("name", email.split("@")[0])
    picture = google_user.get("picture")

    # Find or create user
    user = db.query(User).filter(
        (User.oauth_provider == "google") & (User.oauth_id == google_id)
    ).first()

    if not user:
        # Check if email exists (link accounts)
        user = db.query(User).filter(User.email == email).first()
        if user:
            # Link Google to existing account
            user.oauth_provider = "google"
            user.oauth_id = google_id
            user.avatar_url = picture
        else:
            # Create new user
            user = User(
                email=email,
                display_name=name,
                oauth_provider="google",
                oauth_id=google_id,
                avatar_url=picture,
            )
            db.add(user)
            db.flush()

            # Create parent profile
            parent = Parent(
                name=name,
                user_id=user.id,
            )
            db.add(parent)

    user.last_login = datetime.utcnow()
    db.commit()

    # Generate tokens
    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.get("/me", response_model=MeResponse)
async def get_me(user: User = Depends(require_auth), db: Session = Depends(get_db)):
    """Get current user profile with parent and kids."""
    # Get parent profile
    parent = db.query(Parent).filter(Parent.user_id == user.id).first()

    # Get associated kids
    kids = []
    if parent and parent.associated_kids:
        kids_query = db.query(Kid).filter(Kid.id.in_(parent.associated_kids)).all()
        kids = [
            KidSummary(id=k.id, name=k.name, points=k.points)
            for k in kids_query
        ]

    return MeResponse(
        user=UserResponse.model_validate(user),
        parent={
            "id": parent.id,
            "name": parent.name,
            "has_pin": bool(parent.pin_hash or parent.pin),
            "associated_kids": parent.associated_kids or [],
        } if parent else None,
        kids=kids,
    )


@router.post("/verify-pin", response_model=VerifyPinResponse)
async def verify_pin_endpoint(
    request: VerifyPinRequest,
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Verify parent PIN for protected actions."""
    parent = db.query(Parent).filter(Parent.user_id == user.id).first()

    if not parent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent profile not found"
        )

    # Check hashed PIN first, fall back to legacy plaintext
    if parent.pin_hash:
        valid = verify_pin(request.pin, parent.pin_hash)
    elif parent.pin:
        # Legacy plaintext comparison
        valid = request.pin == parent.pin
    else:
        # No PIN set - always valid (or you could require PIN)
        valid = True

    return VerifyPinResponse(valid=valid)


@router.post("/logout")
async def logout():
    """
    Logout endpoint.
    Note: JWT tokens are stateless, so this is handled client-side.
    This endpoint exists for consistency and future token blocklisting.
    """
    return {"message": "Logged out successfully"}


# --- Password Reset Endpoints ---

@router.post("/forgot-password", response_model=PasswordResetResponse)
async def forgot_password(request: PasswordResetRequest, db: Session = Depends(get_db)):
    """
    Request a password reset email.

    Security measures:
    - Returns same response for valid/invalid emails (prevents enumeration)
    - Rate limited to 3 requests per email per hour
    - Invalidates previous reset tokens for the same user
    """
    email = request.email.lower().strip()

    # Always return success message (prevent user enumeration)
    success_message = "If an account with that email exists, you will receive a password reset link."

    # Look up user
    user = db.query(User).filter(User.email == email).first()

    if not user:
        # User doesn't exist - return success anyway to prevent enumeration
        return PasswordResetResponse(message=success_message)

    if not user.is_active:
        # Inactive account - return success anyway
        return PasswordResetResponse(message=success_message)

    # OAuth-only users can't reset password
    if not user.password_hash and user.oauth_provider:
        return PasswordResetResponse(message=success_message)

    # Check rate limiting: count recent tokens for this user
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent_tokens = db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.created_at > one_hour_ago,
    ).count()

    if recent_tokens >= settings.reset_rate_limit_per_hour:
        # Rate limited - still return success to prevent enumeration
        return PasswordResetResponse(message=success_message)

    # Invalidate any existing unused tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
    ).delete()

    # Generate new reset token
    plain_token, token_hash = generate_reset_token()

    # Store hashed token in database
    reset_token = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.utcnow() + timedelta(minutes=settings.reset_token_expire_minutes),
    )
    db.add(reset_token)
    db.commit()

    # Build reset link (frontend URL with port 8443)
    reset_link = f"https://localhost:3103/reset-password?token={plain_token}"

    # Send email
    await email_service.send_password_reset_email(
        to_email=user.email,
        reset_link=reset_link,
        display_name=user.display_name,
    )

    return PasswordResetResponse(message=success_message)


@router.post("/reset-password", response_model=PasswordResetResponse)
async def reset_password(request: PasswordResetVerify, db: Session = Depends(get_db)):
    """
    Verify reset token and set new password.

    Security measures:
    - Token must be valid and not expired
    - Token is single-use (marked as used after successful reset)
    - Password must be at least 8 characters
    - User is NOT auto-logged in (must log in manually)
    - Confirmation email sent after successful reset
    """
    # Validate password length
    if len(request.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )

    # Find all unexpired, unused tokens
    now = datetime.utcnow()
    tokens = db.query(PasswordResetToken).filter(
        PasswordResetToken.expires_at > now,
        PasswordResetToken.used_at.is_(None),
    ).all()

    # Check each token (we store hash, so need to verify)
    valid_token = None
    for token in tokens:
        if verify_reset_token(request.token, token.token_hash):
            valid_token = token
            break

    if not valid_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link. Please request a new password reset."
        )

    # Get the user
    user = db.query(User).filter(User.id == valid_token.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset link"
        )

    # Update password
    user.password_hash = hash_password(request.new_password)

    # Mark token as used
    valid_token.used_at = now

    db.commit()

    # Send confirmation email
    await email_service.send_password_changed_email(
        to_email=user.email,
        display_name=user.display_name,
    )

    return PasswordResetResponse(
        message="Password has been reset successfully. Please log in with your new password."
    )


@router.get("/verify-reset-token", response_model=PasswordResetTokenStatus)
async def verify_reset_token_endpoint(token: str, db: Session = Depends(get_db)):
    """
    Check if a password reset token is valid.

    Used by frontend to validate token before showing password form.
    """
    # Find all unexpired, unused tokens
    now = datetime.utcnow()
    tokens = db.query(PasswordResetToken).filter(
        PasswordResetToken.expires_at > now,
        PasswordResetToken.used_at.is_(None),
    ).all()

    # Check each token
    for reset_token in tokens:
        if verify_reset_token(token, reset_token.token_hash):
            # Get user email for display
            user = db.query(User).filter(User.id == reset_token.user_id).first()
            if user:
                # Mask email for privacy (show only first 2 chars and domain)
                email_parts = user.email.split("@")
                masked_email = email_parts[0][:2] + "***@" + email_parts[1]
                return PasswordResetTokenStatus(valid=True, email=masked_email)

    return PasswordResetTokenStatus(valid=False)
