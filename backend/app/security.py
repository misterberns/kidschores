"""Security utilities for authentication."""
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

import bcrypt
from jose import JWTError, jwt

from .config import settings


# --- Password Hashing (bcrypt with SHA256 fallback for migration) ---

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash. Supports bcrypt and legacy SHA256."""
    if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"):
        # bcrypt hash
        return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())
    elif "$" in hashed_password:
        # Legacy SHA256+salt format: {salt}${hash}
        salt, stored_hash = hashed_password.split("$", 1)
        salted = f"{salt}{plain_password}{salt}"
        return hashlib.sha256(salted.encode()).hexdigest() == stored_hash
    return False


def needs_rehash(hashed_password: str) -> bool:
    """Check if a password hash needs upgrading from SHA256 to bcrypt."""
    return not (hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"))


# --- PIN Hashing ---

def hash_pin(pin: str) -> str:
    """Hash a PIN using bcrypt."""
    return hash_password(pin)


def verify_pin(plain_pin: str, hashed_pin: str) -> bool:
    """Verify a PIN against its hash."""
    return verify_password(plain_pin, hashed_pin)


# --- JWT Tokens ---

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(
    data: dict,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a JWT refresh token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError:
        return None


# --- API Tokens ---

def generate_api_token() -> Tuple[str, str]:
    """
    Generate a new API token.
    Returns (full_token, token_hash) - store hash, give full token to user once.
    """
    random_part = secrets.token_urlsafe(32)
    full_token = f"{settings.api_token_prefix}{random_part}"
    token_hash = hash_password(full_token)
    return full_token, token_hash


def verify_api_token(plain_token: str, hashed_token: str) -> bool:
    """Verify an API token against its hash."""
    return verify_password(plain_token, hashed_token)


def get_token_prefix(token: str) -> str:
    """Get the display prefix of an API token (first 12 chars)."""
    return token[:12] if len(token) >= 12 else token


# --- Password Reset Tokens ---

def generate_reset_token() -> Tuple[str, str]:
    """
    Generate a secure password reset token.
    Returns (plain_token, token_hash) - store hash, send plain token to user.
    """
    token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    return token, token_hash


def verify_reset_token(plain_token: str, token_hash: str) -> bool:
    """Verify a password reset token against its stored hash."""
    return hashlib.sha256(plain_token.encode()).hexdigest() == token_hash
