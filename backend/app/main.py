"""KidsChores Standalone Web App - FastAPI Backend."""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import settings
from .database import init_db
from .routers import kids, chores, rewards, parents, approvals, auth, api_tokens, notifications, categories, allowance, history
from .scheduler import start_scheduler, shutdown_scheduler

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and scheduler on startup."""
    init_db()
    logger.info("Database initialized")

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
    version="0.6.1",  # Keep in sync with VERSION file
    lifespan=lifespan,
    redirect_slashes=False,  # Prevent 307 redirects for /api/kids vs /api/kids/
)

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


@app.get("/")
async def root():
    """Root endpoint - health check."""
    return {"status": "ok", "app": "KidsChores", "version": app.version}


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}
