"""Database connection and session management."""
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from .models import Base

DATABASE_PATH = os.environ.get("DATABASE_PATH", "./data/kidschores.db")

# Ensure data directory exists
os.makedirs(os.path.dirname(DATABASE_PATH) if os.path.dirname(DATABASE_PATH) else ".", exist_ok=True)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}  # Needed for SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Initialize database tables.

    For development: Uses create_all() which creates missing tables.
    For production: Use Alembic migrations instead:
        cd backend && alembic upgrade head

    Note: create_all() is safe - it only creates tables that don't exist.
    It won't modify existing tables or drop data.
    """
    Base.metadata.create_all(bind=engine)


def ensure_indexes():
    """Create indexes on existing tables (create_all only handles new tables)."""
    indexes = [
        "CREATE INDEX IF NOT EXISTS ix_chore_claims_status ON chore_claims (status)",
        "CREATE INDEX IF NOT EXISTS ix_chore_claims_kid_id ON chore_claims (kid_id)",
        "CREATE INDEX IF NOT EXISTS ix_chore_claims_chore_id ON chore_claims (chore_id)",
        "CREATE INDEX IF NOT EXISTS ix_chore_claims_claimed_at ON chore_claims (claimed_at)",
        "CREATE INDEX IF NOT EXISTS ix_reward_claims_status ON reward_claims (status)",
        "CREATE INDEX IF NOT EXISTS ix_reward_claims_kid_id ON reward_claims (kid_id)",
        "CREATE INDEX IF NOT EXISTS ix_allowance_payouts_kid_id ON allowance_payouts (kid_id)",
        "CREATE INDEX IF NOT EXISTS ix_allowance_payouts_status ON allowance_payouts (status)",
        "CREATE INDEX IF NOT EXISTS ix_push_subscriptions_kid_id ON push_subscriptions (kid_id)",
    ]
    with engine.connect() as conn:
        for sql in indexes:
            conn.execute(text(sql))
        conn.commit()


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_db_session():
    """Get a database session for background jobs."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
