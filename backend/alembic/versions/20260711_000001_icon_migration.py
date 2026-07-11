"""v0.11 icon migration: emoji -> lucide names, mdi: prefix strip, brand
category colors.

Revision ID: 20260711_000001
Revises: 20260109_000001
Create Date: 2026-07-11

Data-only migration (no schema change). The same logic runs as an idempotent
startup hook (app/migrations/icon_migration.py) because dev/prod SQLite DBs
are created by create_all and startup does not invoke Alembic; this revision
keeps the documented `alembic upgrade head` flow equivalent.
"""
from typing import Sequence, Union

from alembic import op

from app.migrations.icon_migration import migrate_icons

# revision identifiers, used by Alembic.
revision: str = "20260711_000001"
down_revision: Union[str, None] = "20260109_000001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from sqlalchemy.orm import Session

    bind = op.get_bind()
    with Session(bind=bind) as session:
        migrate_icons(session)


def downgrade() -> None:
    # Data-only, lossy in reverse (emoji originals are not retained).
    # Restore from a DB backup to revert.
    pass
