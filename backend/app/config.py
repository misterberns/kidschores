"""Application configuration settings."""
import secrets
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_path: str = "./data/kidschores.db"

    # JWT Settings (home network - longer expiry for convenience)
    jwt_secret_key: str = secrets.token_urlsafe(32)  # Auto-generate if not set
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours
    refresh_token_expire_days: int = 30

    # Google OAuth (optional)
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    google_redirect_uri: str = "http://localhost:3103/auth/google/callback"

    # API Tokens
    api_token_prefix: str = "kc_"  # Prefix for API tokens

    # Password Reset
    reset_token_expire_minutes: int = 60  # 1 hour expiration
    reset_rate_limit_per_hour: int = 3  # Max reset requests per email per hour

    # App Base URL (used for password reset links, invitation links)
    app_base_url: str = "http://localhost:3103"

    # CORS Origins (comma-separated list or "*")
    cors_origins: str = "http://localhost:3103"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Singleton instance
settings = Settings()
