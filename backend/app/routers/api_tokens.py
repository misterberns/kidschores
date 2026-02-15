"""API token management endpoints."""
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_auth
from ..models import User, ApiToken
from ..security import generate_api_token, get_token_prefix

router = APIRouter()


# --- Request/Response Schemas ---

class CreateTokenRequest(BaseModel):
    name: str  # e.g., "Home Assistant"
    scopes: List[str] = []  # Future use
    expires_in_days: Optional[int] = None  # None = never expires


class TokenCreatedResponse(BaseModel):
    """Response when creating a token - includes the full token (shown only once)."""
    id: str
    name: str
    token: str  # Full token - only shown at creation!
    token_prefix: str
    scopes: List[str]
    expires_at: Optional[datetime]
    created_at: datetime


class TokenResponse(BaseModel):
    """Response for listing tokens - does NOT include full token."""
    id: str
    name: str
    token_prefix: str
    scopes: List[str]
    expires_at: Optional[datetime]
    last_used: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# --- Endpoints ---

@router.get("", response_model=List[TokenResponse])
async def list_tokens(
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """List all API tokens for the current user."""
    tokens = db.query(ApiToken).filter(ApiToken.user_id == user.id).all()
    return [TokenResponse.model_validate(t) for t in tokens]


@router.post("", response_model=TokenCreatedResponse)
async def create_token(
    request: CreateTokenRequest,
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Create a new API token.
    The full token is only returned once at creation - store it securely!
    """
    # Generate token
    full_token, token_hash = generate_api_token()
    prefix = get_token_prefix(full_token)

    # Calculate expiration
    expires_at = None
    if request.expires_in_days:
        from datetime import timedelta
        expires_at = datetime.now(timezone.utc) + timedelta(days=request.expires_in_days)

    # Create token record
    api_token = ApiToken(
        user_id=user.id,
        name=request.name,
        token_hash=token_hash,
        token_prefix=prefix,
        scopes=request.scopes,
        expires_at=expires_at,
    )
    db.add(api_token)
    db.commit()
    db.refresh(api_token)

    return TokenCreatedResponse(
        id=api_token.id,
        name=api_token.name,
        token=full_token,  # Only time the full token is returned!
        token_prefix=prefix,
        scopes=api_token.scopes or [],
        expires_at=api_token.expires_at,
        created_at=api_token.created_at,
    )


@router.delete("/{token_id}")
async def delete_token(
    token_id: str,
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Delete an API token."""
    token = db.query(ApiToken).filter(
        ApiToken.id == token_id,
        ApiToken.user_id == user.id
    ).first()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found"
        )

    db.delete(token)
    db.commit()

    return {"message": "Token deleted successfully"}


@router.get("/{token_id}", response_model=TokenResponse)
async def get_token(
    token_id: str,
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Get details of a specific API token."""
    token = db.query(ApiToken).filter(
        ApiToken.id == token_id,
        ApiToken.user_id == user.id
    ).first()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found"
        )

    return TokenResponse.model_validate(token)
