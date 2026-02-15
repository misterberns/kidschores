"""FastAPI dependencies for authentication."""
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from .database import get_db
from .models import User, ApiToken
from .security import decode_token, verify_api_token, get_token_prefix

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
        # Use token_prefix for narrowed lookup instead of scanning all tokens
        prefix = get_token_prefix(token)
        candidates = db.query(ApiToken).filter(ApiToken.token_prefix == prefix).all()
        for api_token in candidates:
            if verify_api_token(token, api_token.token_hash):
                api_token.last_used = datetime.now(timezone.utc)
                db.commit()

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


async def require_admin(
    user: User = Depends(require_auth)
) -> User:
    """
    Require admin privileges - raises 403 if not admin.
    """
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
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
