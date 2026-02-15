"""Add password_reset_tokens table for secure password recovery.

Revision ID: 20260107_000001
Revises: None (initial migration for existing database)
Create Date: 2026-01-07

This migration adds the password_reset_tokens table to support
the password reset feature with OWASP-compliant security:
- Cryptographically secure tokens (hashed with SHA256)
- Token expiration (1 hour default)
- Single-use tokens (tracked via used_at)
- Rate limiting support (via created_at timestamps)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260107_000001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create password_reset_tokens table."""
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('token_hash', sa.String(64), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )

    # Create index on user_id for faster lookups
    op.create_index(
        'ix_password_reset_tokens_user_id',
        'password_reset_tokens',
        ['user_id']
    )

    # Create index on expires_at for cleanup queries
    op.create_index(
        'ix_password_reset_tokens_expires_at',
        'password_reset_tokens',
        ['expires_at']
    )


def downgrade() -> None:
    """Drop password_reset_tokens table."""
    op.drop_index('ix_password_reset_tokens_expires_at', table_name='password_reset_tokens')
    op.drop_index('ix_password_reset_tokens_user_id', table_name='password_reset_tokens')
    op.drop_table('password_reset_tokens')
