"""Add parent_invitations table for email-based parent onboarding.

Revision ID: 20260109_000001
Revises: 20260107_000001
Create Date: 2026-01-09

This migration adds the parent_invitations table to support
the parent email invitation feature with OWASP-compliant security:
- Cryptographically secure tokens (hashed with SHA256)
- Token expiration (24 hours default)
- Single-use tokens (tracked via is_consumed, consumed_at)
- Rate limiting support (via created_at timestamps and email index)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260109_000001'
down_revision: Union[str, None] = '20260107_000001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create parent_invitations table."""
    op.create_table(
        'parent_invitations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('token_hash', sa.String(64), nullable=False, unique=True),
        sa.Column('parent_id', sa.String(36), sa.ForeignKey('parents.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('is_consumed', sa.Boolean(), default=False, nullable=False),
        sa.Column('consumed_at', sa.DateTime(), nullable=True),
    )

    # Create index on email for rate limiting queries
    op.create_index(
        'ix_parent_invitations_email',
        'parent_invitations',
        ['email']
    )

    # Create index on token_hash for fast token lookups
    op.create_index(
        'ix_parent_invitations_token_hash',
        'parent_invitations',
        ['token_hash']
    )

    # Create index on expires_at for cleanup queries
    op.create_index(
        'ix_parent_invitations_expires_at',
        'parent_invitations',
        ['expires_at']
    )


def downgrade() -> None:
    """Drop parent_invitations table."""
    op.drop_index('ix_parent_invitations_expires_at', table_name='parent_invitations')
    op.drop_index('ix_parent_invitations_token_hash', table_name='parent_invitations')
    op.drop_index('ix_parent_invitations_email', table_name='parent_invitations')
    op.drop_table('parent_invitations')
