"""
Migration script: Add authentication to existing KidsChores data.

This script:
1. Creates User accounts for existing Parents
2. Hashes existing plaintext PINs
3. Links Parent.user_id to new User accounts

Run with: python -m app.migrations.migrate_auth
"""
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.models import Base, User, Parent
from app.security import hash_password, hash_pin
from app.config import settings


def run_migration():
    """Run the authentication migration."""
    print("Starting authentication migration...")

    # Create engine and session
    engine = create_engine(settings.database_url)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Check if users table exists, create if not
        with engine.connect() as conn:
            result = conn.execute(text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
            ))
            if not result.fetchone():
                print("Creating new tables (users, api_tokens)...")
                Base.metadata.create_all(engine)
            else:
                print("Tables already exist, proceeding with data migration...")

        # Get all parents without user_id
        parents_to_migrate = session.query(Parent).filter(
            Parent.user_id.is_(None)
        ).all()

        print(f"Found {len(parents_to_migrate)} parents to migrate")

        for parent in parents_to_migrate:
            # Generate email from name
            email = f"{parent.name.lower().replace(' ', '_')}@kidschores.local"

            # Check if user with this email already exists
            existing_user = session.query(User).filter(User.email == email).first()
            if existing_user:
                print(f"  - Linking existing user '{email}' to parent '{parent.name}'")
                parent.user_id = existing_user.id
            else:
                # Create new user
                print(f"  - Creating user '{email}' for parent '{parent.name}'")
                user = User(
                    email=email,
                    password_hash=hash_password("changeme123"),  # Default password
                    display_name=parent.name,
                )
                session.add(user)
                session.flush()  # Get the ID
                parent.user_id = user.id

            # Hash existing plaintext PIN if present
            if parent.pin and not parent.pin_hash:
                print(f"  - Hashing PIN for parent '{parent.name}'")
                parent.pin_hash = hash_pin(parent.pin)
                # Keep legacy pin for now (can remove after verification)

        session.commit()
        print(f"\nMigration complete!")
        print(f"  - {len(parents_to_migrate)} parents migrated")
        print(f"\nIMPORTANT: All migrated users have default password 'changeme123'")
        print(f"They should change their password on first login.")

    except Exception as e:
        session.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    run_migration()
