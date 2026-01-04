"""FastAPI dependencies for authentication."""
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from .database import get_db
from .models import User, ApiToken
from .security import decode_token, verify_api_token

# Security scheme for JWT Bearer tokens
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Get the current authenticated user from JWT or API token.
    Returns None if no valid authentication provided.
    """
    if not credentials:
        return None

    token = credentials.credentials

    # Try JWT token first
    payload = decode_token(token)
    if payload and payload.get("type") in ("access", "refresh"):
        user_id = payload.get("sub")
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
            if user and user.is_active:
                return user

    # Try API token (starts with prefix)
    if token.startswith("kc_"):
        # Find token by checking hash against all tokens
        # In production, you'd want to use a prefix lookup first
        api_tokens = db.query(ApiToken).all()
        for api_token in api_tokens:
            if verify_api_token(token, api_token.token_hash):
                # Update last used timestamp
                from datetime import datetime
                api_token.last_used = datetime.utcnow()
                db.commit()

                # Get user
                user = db.query(User).filter(User.id == api_token.user_id).first()
                if user and user.is_active:
                    return user

    return None


async def require_auth(
    user: Optional[User] = Depends(get_current_user)
) -> User:
    """
    Require authentication - raises 401 if not authenticated.
    """
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_optional_user(
    user: Optional[User] = Depends(get_current_user)
) -> Optional[User]:
    """
    Get current user if authenticated, None otherwise.
    Does not raise an error if not authenticated.
    """
    return user
