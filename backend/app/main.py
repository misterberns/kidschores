"""KidsChores Standalone Web App - FastAPI Backend."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .database import init_db
from .routers import kids, chores, rewards, parents, approvals


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    init_db()
    yield


app = FastAPI(
    title="KidsChores",
    description="Family chore management with points and rewards",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,  # Prevent 307 redirects for /api/kids vs /api/kids/
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(kids.router, prefix="/api/kids", tags=["Kids"])
app.include_router(parents.router, prefix="/api/parents", tags=["Parents"])
app.include_router(chores.router, prefix="/api/chores", tags=["Chores"])
app.include_router(rewards.router, prefix="/api/rewards", tags=["Rewards"])
app.include_router(approvals.router, prefix="/api/approvals", tags=["Approvals"])


@app.get("/")
async def root():
    """Root endpoint - health check."""
    return {"status": "ok", "app": "KidsChores", "version": "1.0.0"}


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}
