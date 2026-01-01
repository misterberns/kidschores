"""Database connection and session management."""
import os
from sqlalchemy import create_engine
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
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
