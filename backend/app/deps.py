"""FastAPI dependencies for authentication."""
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from .database import get_db
from .models import User, ApiToken, Kid
from .security import decode_token, verify_api_token, get_token_prefix

# Security scheme for JWT Bearer tokens
bearer_scheme = HTTPBearer(auto_error=False)


KIOSK_SCOPE = "kiosk"
# Scopes a token may carry. Anything else is rejected at creation (the column was
# stored but never read before v0.18.0, so a "scoped" token used to be a full one).
KNOWN_SCOPES = {KIOSK_SCOPE}


def match_api_token(db: Session, token: str) -> Optional[ApiToken]:
    """Return the unexpired ApiToken matching a raw `kc_...` token, else None.

    Updates last_used on a match.
    """
    if not token.startswith("kc_"):
        return None
    # Use token_prefix for narrowed lookup instead of scanning all tokens
    prefix = get_token_prefix(token)
    candidates = db.query(ApiToken).filter(ApiToken.token_prefix == prefix).all()
    for api_token in candidates:
        if verify_api_token(token, api_token.token_hash):
            # Enforce expiry — a bcrypt match uniquely identifies this token, so
            # an expired match must NOT authenticate (expires_at is stored naive-UTC).
            if api_token.expires_at is not None:
                expires_at = api_token.expires_at
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if expires_at < datetime.now(timezone.utc):
                    return None
            api_token.last_used = datetime.now(timezone.utc)
            db.commit()
            return api_token
    return None



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
    if payload and payload.get("type") == "access":
        user_id = payload.get("sub")
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
            # Session-revocation epoch: the token's `tv` claim must match the
            # user's current token_version (missing claim ≡ 0 so pre-v0.15.0
            # tokens stay valid until the user's first revocation event).
            # Zero extra queries — the user row is loaded here anyway.
            if (
                user
                and user.is_active
                and payload.get("tv", 0) == (user.token_version or 0)
            ):
                return user

    # Try API token (starts with prefix)
    api_token = match_api_token(db, token)
    if api_token is not None:
        # A SCOPED token is not a user session. It authenticates only through the
        # dependency for its own scope (e.g. require_kiosk on /api/kiosk/*), so it is
        # rejected here, which keeps it out of every other route by default (fail
        # closed). Empty scopes = a legacy full-access token (Home Assistant).
        if api_token.scopes:
            return None
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


# --- Role / object-level authorization ---

def get_user_kid(db: Session, user: User) -> Optional[Kid]:
    """Return the Kid profile linked to this user account, or None for parents."""
    return db.query(Kid).filter(Kid.user_id == user.id).first()


def assert_kid_access(db: Session, user: User, kid_id: str) -> None:
    """
    Raise 403 if `user` is a kid-linked account trying to act on a DIFFERENT kid.
    Parents (no linked Kid profile) are unrestricted in this single-family model.
    Call this from endpoints whose kid_id arrives in the request BODY.
    """
    kid = get_user_kid(db, user)
    if kid is not None and kid.id != kid_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own data",
        )


async def require_parent(
    user: User = Depends(require_auth),
    db: Session = Depends(get_db),
) -> User:
    """
    Require a parent-role account for management actions. Any authenticated user
    whose account is NOT linked to a Kid profile is a parent (single-family model),
    so ANY parent can manage the family — not just the first-registered admin.
    Kid-linked accounts are rejected. Returns the acting parent user.
    """
    if get_user_kid(db, user) is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Parent access required",
        )
    return user


async def require_kid_access(
    kid_id: str,
    user: User = Depends(require_auth),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency for endpoints with a `kid_id` PATH parameter. Parents are
    unrestricted; a kid-linked account may only touch its own kid_id.
    Returns the acting user.
    """
    assert_kid_access(db, user, kid_id)
    return user


async def require_kiosk(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> ApiToken:
    """Authenticate a kiosk device: an API token carrying the `kiosk` scope whose
    owning parent account is still active. Returns the token row."""
    api_token = match_api_token(db, credentials.credentials) if credentials else None
    if api_token is not None and KIOSK_SCOPE in (api_token.scopes or []):
        owner = db.query(User).filter(User.id == api_token.user_id).first()
        if owner and owner.is_active:
            return api_token
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Kiosk session not valid",
        headers={"WWW-Authenticate": "Bearer"},
    )
