"""
Database migration for KidsChores v2 features.
Adds new columns and tables for: streaks, categories, notifications, allowance.

Run via: python -m app.migrations.v2_features
"""
import sqlite3
import sys
from pathlib import Path


def get_db_path() -> str:
    """Get the database path from environment or default."""
    import os
    return os.environ.get("DATABASE_URL", "sqlite:///./kidschores.db").replace("sqlite:///", "")


def column_exists(cursor: sqlite3.Cursor, table: str, column: str) -> bool:
    """Check if a column exists in a table."""
    cursor.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in cursor.fetchall()]
    return column in columns


def table_exists(cursor: sqlite3.Cursor, table: str) -> bool:
    """Check if a table exists."""
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
    return cursor.fetchone() is not None


def migrate(db_path: str = None):
    """Run database migration."""
    if db_path is None:
        db_path = get_db_path()

    print(f"Running migration on database: {db_path}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    changes_made = 0

    try:
        # ============================================
        # Kids table - new columns for streaks
        # ============================================
        kids_columns = [
            ("longest_streak_ever", "INTEGER DEFAULT 0"),
            ("streak_freeze_count", "INTEGER DEFAULT 0"),
            ("last_chore_date", "DATETIME"),
            ("chore_streaks", "TEXT DEFAULT '{}'"),  # JSON stored as TEXT in SQLite
        ]

        for col_name, col_type in kids_columns:
            if not column_exists(cursor, "kids", col_name):
                print(f"  Adding column: kids.{col_name}")
                cursor.execute(f"ALTER TABLE kids ADD COLUMN {col_name} {col_type}")
                changes_made += 1
            else:
                print(f"  Column exists: kids.{col_name}")

        # ============================================
        # Chores table - new columns for categories/scheduling
        # ============================================
        chores_columns = [
            ("category_id", "VARCHAR(36)"),
            ("last_reset_date", "DATETIME"),
            ("reset_time", "VARCHAR(5) DEFAULT '00:00'"),
        ]

        for col_name, col_type in chores_columns:
            if not column_exists(cursor, "chores", col_name):
                print(f"  Adding column: chores.{col_name}")
                cursor.execute(f"ALTER TABLE chores ADD COLUMN {col_name} {col_type}")
                changes_made += 1
            else:
                print(f"  Column exists: chores.{col_name}")

        # ============================================
        # Chore claims table - new columns
        # ============================================
        claims_columns = [
            ("notes", "TEXT"),
            ("photo_url", "VARCHAR(500)"),
        ]

        for col_name, col_type in claims_columns:
            if not column_exists(cursor, "chore_claims", col_name):
                print(f"  Adding column: chore_claims.{col_name}")
                cursor.execute(f"ALTER TABLE chore_claims ADD COLUMN {col_name} {col_type}")
                changes_made += 1
            else:
                print(f"  Column exists: chore_claims.{col_name}")

        # ============================================
        # Create new tables
        # ============================================

        # Chore Categories
        if not table_exists(cursor, "chore_categories"):
            print("  Creating table: chore_categories")
            cursor.execute("""
                CREATE TABLE chore_categories (
                    id VARCHAR(36) PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    icon VARCHAR(50) DEFAULT '📁',
                    color VARCHAR(20) DEFAULT '#6366f1',
                    sort_order INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            changes_made += 1
        else:
            print("  Table exists: chore_categories")

        # Scheduled Job Logs
        if not table_exists(cursor, "scheduled_job_logs"):
            print("  Creating table: scheduled_job_logs")
            cursor.execute("""
                CREATE TABLE scheduled_job_logs (
                    id VARCHAR(36) PRIMARY KEY,
                    job_name VARCHAR(100) NOT NULL,
                    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    status VARCHAR(20) DEFAULT 'success',
                    error_message TEXT,
                    affected_records INTEGER DEFAULT 0,
                    duration_ms INTEGER
                )
            """)
            changes_made += 1
        else:
            print("  Table exists: scheduled_job_logs")

        # Daily Multipliers
        if not table_exists(cursor, "daily_multipliers"):
            print("  Creating table: daily_multipliers")
            cursor.execute("""
                CREATE TABLE daily_multipliers (
                    id VARCHAR(36) PRIMARY KEY,
                    kid_id VARCHAR(36) NOT NULL,
                    date DATETIME NOT NULL,
                    base_multiplier FLOAT DEFAULT 1.0,
                    bonus_multiplier FLOAT DEFAULT 0.0,
                    total_chores_for_day INTEGER DEFAULT 0,
                    completed_chores INTEGER DEFAULT 0,
                    all_completed BOOLEAN DEFAULT 0,
                    bonus_awarded BOOLEAN DEFAULT 0,
                    bonus_points INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (kid_id) REFERENCES kids(id)
                )
            """)
            changes_made += 1
        else:
            print("  Table exists: daily_multipliers")

        # Push Subscriptions
        if not table_exists(cursor, "push_subscriptions"):
            print("  Creating table: push_subscriptions")
            cursor.execute("""
                CREATE TABLE push_subscriptions (
                    id VARCHAR(36) PRIMARY KEY,
                    user_id VARCHAR(36),
                    kid_id VARCHAR(36),
                    endpoint TEXT NOT NULL,
                    p256dh_key VARCHAR(255) NOT NULL,
                    auth_key VARCHAR(255) NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_used DATETIME,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (kid_id) REFERENCES kids(id)
                )
            """)
            changes_made += 1
        else:
            print("  Table exists: push_subscriptions")

        # Notification Preferences
        if not table_exists(cursor, "notification_preferences"):
            print("  Creating table: notification_preferences")
            cursor.execute("""
                CREATE TABLE notification_preferences (
                    id VARCHAR(36) PRIMARY KEY,
                    user_id VARCHAR(36) NOT NULL,
                    email_chore_claimed BOOLEAN DEFAULT 1,
                    email_chore_approved BOOLEAN DEFAULT 1,
                    email_daily_summary BOOLEAN DEFAULT 0,
                    email_weekly_summary BOOLEAN DEFAULT 1,
                    push_enabled BOOLEAN DEFAULT 1,
                    push_chore_claimed BOOLEAN DEFAULT 1,
                    push_chore_approved BOOLEAN DEFAULT 1,
                    push_streak_milestone BOOLEAN DEFAULT 1,
                    push_reward_redeemed BOOLEAN DEFAULT 1,
                    quiet_hours_enabled BOOLEAN DEFAULT 0,
                    quiet_hours_start VARCHAR(5) DEFAULT '22:00',
                    quiet_hours_end VARCHAR(5) DEFAULT '08:00',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            changes_made += 1
        else:
            print("  Table exists: notification_preferences")

        # Allowance Settings
        if not table_exists(cursor, "allowance_settings"):
            print("  Creating table: allowance_settings")
            cursor.execute("""
                CREATE TABLE allowance_settings (
                    id VARCHAR(36) PRIMARY KEY,
                    kid_id VARCHAR(36) NOT NULL UNIQUE,
                    points_per_dollar INTEGER DEFAULT 100,
                    auto_payout BOOLEAN DEFAULT 0,
                    payout_day INTEGER DEFAULT 0,
                    minimum_payout FLOAT DEFAULT 1.0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (kid_id) REFERENCES kids(id)
                )
            """)
            changes_made += 1
        else:
            print("  Table exists: allowance_settings")

        # Allowance Payouts
        if not table_exists(cursor, "allowance_payouts"):
            print("  Creating table: allowance_payouts")
            cursor.execute("""
                CREATE TABLE allowance_payouts (
                    id VARCHAR(36) PRIMARY KEY,
                    kid_id VARCHAR(36) NOT NULL,
                    points_converted INTEGER NOT NULL,
                    dollar_amount FLOAT NOT NULL,
                    payout_method VARCHAR(50) DEFAULT 'cash',
                    status VARCHAR(20) DEFAULT 'pending',
                    notes TEXT,
                    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    paid_at DATETIME,
                    paid_by VARCHAR(100),
                    FOREIGN KEY (kid_id) REFERENCES kids(id)
                )
            """)
            changes_made += 1
        else:
            print("  Table exists: allowance_payouts")

        # ============================================
        # Add default categories if table is empty
        # ============================================
        cursor.execute("SELECT COUNT(*) FROM chore_categories")
        if cursor.fetchone()[0] == 0:
            print("  Inserting default categories...")
            import uuid
            default_categories = [
                ("🛏️", "Bedroom", "#8B5CF6", 1),
                ("🍳", "Kitchen", "#F59E0B", 2),
                ("🚿", "Bathroom", "#06B6D4", 3),
                ("🛋️", "Living Room", "#10B981", 4),
                ("🌳", "Outdoor", "#22C55E", 5),
                ("📚", "School", "#3B82F6", 6),
                ("🐾", "Pet Care", "#EC4899", 7),
            ]
            for icon, name, color, order in default_categories:
                cat_id = str(uuid.uuid4())
                cursor.execute(
                    "INSERT INTO chore_categories (id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?)",
                    (cat_id, name, icon, color, order)
                )
            changes_made += len(default_categories)

        conn.commit()
        print(f"\nMigration complete! {changes_made} changes applied.")

    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    # Allow passing database path as argument
    db_path = sys.argv[1] if len(sys.argv) > 1 else None
    migrate(db_path)
