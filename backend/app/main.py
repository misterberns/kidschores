"""KidsChores Standalone Web App - FastAPI Backend."""
import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import settings
from .database import init_db, ensure_columns, ensure_indexes
from .observability import RequestIdMiddleware, configure_logging, init_sentry
from .routers import kids, chores, rewards, parents, approvals, auth, api_tokens, notifications, categories, allowance, history, badges, challenges, goals
from .scheduler import start_scheduler, shutdown_scheduler

# Configure logging (LOG_FORMAT=json switches to structured lines)
logging.basicConfig(level=logging.INFO)
configure_logging()
logger = logging.getLogger(__name__)

# Sentry ships dormant — activates only when SENTRY_DSN is set
if init_sentry():
    logger.info("Sentry error reporting enabled")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and scheduler on startup."""
    _placeholder_secrets = {
        "change-me-to-a-random-string",
        "your-secret-key-here-change-in-production",
        "changeme",
        "change-me",
        "secret",
    }
    _secret = (settings.jwt_secret_key or "").strip()
    if not _secret or _secret.lower() in _placeholder_secrets or len(_secret) < 16:
        raise RuntimeError(
            "JWT_SECRET_KEY must be set to a secure random value (>=16 chars, not a "
            "placeholder). Generate one with: "
            "python -c \"import secrets; print(secrets.token_urlsafe(32))\""
        )
    init_db()
    ensure_columns()
    ensure_indexes()
    logger.info("Database initialized")

    # Seed the default badge catalog (idempotent — slugs match the frontend)
    from .database import SessionLocal
    from .services.gamification import seed_default_badges
    from .migrations.icon_migration import migrate_icons
    _db = SessionLocal()
    try:
        seed_default_badges(_db)
        # v0.11: rewrite legacy emoji icons / mdi: prefixes / seeded category
        # colors to the design-system vocabulary (value-scan idempotent)
        migrate_icons(_db)
    finally:
        _db.close()

    # Start background scheduler
    await start_scheduler()
    logger.info("Scheduler started")

    yield

    # Shutdown scheduler gracefully
    await shutdown_scheduler()
    logger.info("Scheduler shutdown")


app = FastAPI(
    title="KidsChores",
    description="Family chore management with points and rewards",
    version="0.16.0",  # Keep in sync with VERSION file
    lifespan=lifespan,
    redirect_slashes=False,  # Prevent 307 redirects for /api/kids vs /api/kids/
)

# Request-ID middleware (accepts/echoes X-Request-ID, one access line per request)
app.add_middleware(RequestIdMiddleware)

# CORS middleware for frontend
_cors_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(api_tokens.router, prefix="/api/tokens", tags=["API Tokens"])
app.include_router(kids.router, prefix="/api/kids", tags=["Kids"])
app.include_router(parents.router, prefix="/api/parents", tags=["Parents"])
app.include_router(chores.router, prefix="/api/chores", tags=["Chores"])
app.include_router(rewards.router, prefix="/api/rewards", tags=["Rewards"])
app.include_router(approvals.router, prefix="/api/approvals", tags=["Approvals"])
app.include_router(notifications.router, prefix="/api", tags=["Notifications"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(allowance.router, prefix="/api/allowance", tags=["Allowance"])
app.include_router(history.router, prefix="/api/history", tags=["History"])
app.include_router(badges.router, prefix="/api/badges", tags=["Badges"])
app.include_router(challenges.router, prefix="/api/challenges", tags=["Challenges"])
app.include_router(goals.router, prefix="/api/goals", tags=["Savings Goals"])

# Test endpoints — mounted ONLY in explicit non-prod environments. Fail-closed:
# an unset or unrecognized ENVIRONMENT does NOT mount them, so a deploy that forgets
# to set ENVIRONMENT can never expose the destructive /api/test/reset in production.
_test_env = os.environ.get("ENVIRONMENT", "").strip().lower()
if _test_env in {"development", "dev", "test", "e2e"}:
    from .routers import test as test_router
    app.include_router(test_router.router, prefix="/api/test", tags=["Testing"])
    logger.warning("Test router mounted (ENVIRONMENT=%s) — must NOT be used in production", _test_env)


@app.get("/")
async def root():
    """Root endpoint - health check."""
    return {"status": "ok", "app": "KidsChores", "version": app.version}


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}
