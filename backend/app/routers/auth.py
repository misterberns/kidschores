"""Authentication endpoints."""
from datetime import datetime
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import get_current_user, require_auth
from ..models import User, Parent, Kid
from ..security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
    hash_pin,
    verify_pin,
)

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
