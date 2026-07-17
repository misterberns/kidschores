"""Application configuration settings."""
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_path: str = "./data/kidschores.db"

    # JWT Settings
    jwt_secret_key: str  # REQUIRED — app fails to start without it
    jwt_algorithm: str = "HS256"
    # 30 min (was 24h pre-v0.15.0): the frontend's 401→refresh interceptor
    # renews transparently, and a short access TTL bounds how long a revoked
    # device's access token keeps working after logout. Must stay ≥15 min —
    # the e2e cached-auth fixture reuses tokens for up to 10 minutes.
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 14  # shortened from 30 (2026-07 hardening)

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
