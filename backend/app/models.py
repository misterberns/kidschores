"""SQLAlchemy models for KidsChores standalone app."""
from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    """User account model for authentication."""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)  # Null for OAuth-only users
    display_name = Column(String(100), nullable=False)

    # OAuth fields
    oauth_provider = Column(String(50), nullable=True)  # 'google' or null
    oauth_id = Column(String(255), nullable=True)  # External provider user ID
    avatar_url = Column(String(500), nullable=True)

    # Account status
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)  # For future admin features

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    # Relationships
    parent = relationship("Parent", back_populates="user", uselist=False)
    api_tokens = relationship("ApiToken", back_populates="user")
    reset_tokens = relationship("PasswordResetToken", back_populates="user")


class PasswordResetToken(Base):
    """Password reset token for secure password recovery."""
    __tablename__ = "password_reset_tokens"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    token_hash = Column(String(64), nullable=False)  # SHA256 hash of token
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)  # Set when token is used
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="reset_tokens")


class ApiToken(Base):
    """API token for external integrations (e.g., Home Assistant)."""
    __tablename__ = "api_tokens"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)

    name = Column(String(100), nullable=False)  # e.g., "Home Assistant"
    token_hash = Column(String(255), nullable=False)  # bcrypt hash
    token_prefix = Column(String(12), nullable=False)  # For display (e.g., "kc_abc123...")

    # Scopes for fine-grained permissions (future use)
    scopes = Column(JSON, default=list)

    # Expiration (null = never expires)
    expires_at = Column(DateTime, nullable=True)
    last_used = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="api_tokens")


class Kid(Base):
    """Kid profile model."""
    __tablename__ = "kids"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    points = Column(Float, default=0.0)
    points_multiplier = Column(Float, default=1.0)
    max_points_ever = Column(Float, default=0.0)

    # Streak tracking
    overall_chore_streak = Column(Integer, default=0)
    last_chore_date = Column(DateTime, nullable=True)
    chore_streaks = Column(JSON, default=dict)  # {chore_id: streak_count}
    longest_streak_ever = Column(Integer, default=0)
    streak_freeze_count = Column(Integer, default=0)  # Freezes available to preserve streak

    # Completion counters
    completed_chores_today = Column(Integer, default=0)
    completed_chores_weekly = Column(Integer, default=0)
    completed_chores_monthly = Column(Integer, default=0)
    completed_chores_total = Column(Integer, default=0)

    # Badges earned (list of badge IDs)
    badges = Column(JSON, default=list)

    # Notifications
    enable_notifications = Column(Boolean, default=True)

    # Relationships
    chore_claims = relationship("ChoreClaim", back_populates="kid")
    reward_claims = relationship("RewardClaim", back_populates="kid")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Parent(Base):
    """Parent profile model."""
    __tablename__ = "parents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)

    # Link to User account (nullable for migration)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)

    # PIN for approvals (hashed with bcrypt)
    pin = Column(String(10), nullable=True)  # Legacy plaintext - will be migrated
    pin_hash = Column(String(255), nullable=True)  # New hashed PIN

    # Associated kids (list of kid IDs)
    associated_kids = Column(JSON, default=list)

    # Notifications
    enable_notifications = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="parent")


class ChoreCategory(Base):
    """Category for organizing chores."""
    __tablename__ = "chore_categories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    icon = Column(String(50), default="📁")
    color = Column(String(20), default="#6366f1")  # Hex color
    sort_order = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    chores = relationship("Chore", back_populates="category")


class Chore(Base):
    """Chore definition model."""
    __tablename__ = "chores"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), default="🧹")
    default_points = Column(Integer, default=10)

    # Assignment
    assigned_kids = Column(JSON, default=list)  # List of kid IDs
    shared_chore = Column(Boolean, default=False)

    # Category
    category_id = Column(String(36), ForeignKey("chore_categories.id"), nullable=True)
    category = relationship("ChoreCategory", back_populates="chores")

    # Scheduling
    recurring_frequency = Column(String(20), default="none")  # none, daily, weekly, biweekly, monthly, custom
    custom_interval = Column(Integer, nullable=True)
    custom_interval_unit = Column(String(10), nullable=True)  # days, weeks
    applicable_days = Column(JSON, default=list)  # [0-6] for days of week
    due_date = Column(DateTime, nullable=True)
    last_reset_date = Column(DateTime, nullable=True)  # When the chore was last reset
    reset_time = Column(String(5), default="00:00")  # Time to reset (HH:MM)

    # Options
    allow_multiple_claims_per_day = Column(Boolean, default=False)
    partial_allowed = Column(Boolean, default=False)

    # Tracking
    last_completed = Column(DateTime, nullable=True)
    last_claimed = Column(DateTime, nullable=True)

    # Notifications
    notify_on_claim = Column(Boolean, default=True)
    notify_on_approval = Column(Boolean, default=True)
    notify_on_disapproval = Column(Boolean, default=True)

    # Relationships
    claims = relationship("ChoreClaim", back_populates="chore")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ChoreClaim(Base):
    """Chore claim/approval tracking."""
    __tablename__ = "chore_claims"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    kid_id = Column(String(36), ForeignKey("kids.id"), nullable=False)
    chore_id = Column(String(36), ForeignKey("chores.id"), nullable=False)

    status = Column(String(20), default="pending")  # pending, claimed, approved, disapproved, expired
    points_awarded = Column(Float, nullable=True)

    claimed_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(String(100), nullable=True)  # Parent name

    # Optional details
    notes = Column(Text, nullable=True)  # Notes from kid about completion
    photo_url = Column(String(500), nullable=True)  # Proof photo URL

    # Relationships
    kid = relationship("Kid", back_populates="chore_claims")
    chore = relationship("Chore", back_populates="claims")


class Reward(Base):
    """Reward definition model."""
    __tablename__ = "rewards"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), default="mdi:gift")
    cost = Column(Integer, default=100)  # Points required

    # Eligibility
    eligible_kids = Column(JSON, default=list)  # Empty = all kids
    requires_approval = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)


class RewardClaim(Base):
    """Reward redemption tracking."""
    __tablename__ = "reward_claims"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    kid_id = Column(String(36), ForeignKey("kids.id"), nullable=False)
    reward_id = Column(String(36), ForeignKey("rewards.id"), nullable=False)

    status = Column(String(20), default="pending")  # pending, approved, disapproved
    points_spent = Column(Integer, nullable=True)

    requested_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(String(100), nullable=True)

    # Relationships
    kid = relationship("Kid", back_populates="reward_claims")
    reward = relationship("Reward")


class Badge(Base):
    """Badge/achievement definition."""
    __tablename__ = "badges"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), default="mdi:medal")

    # Threshold for earning
    threshold_type = Column(String(30), default="points")  # points, chore_count
    threshold_value = Column(Integer, default=100)

    # Bonus for earning
    points_multiplier_bonus = Column(Float, default=0.0)  # Added to multiplier when earned

    created_at = Column(DateTime, default=datetime.utcnow)


class Penalty(Base):
    """Penalty definition."""
    __tablename__ = "penalties"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), default="mdi:alert")
    points_deduction = Column(Integer, default=10)

    created_at = Column(DateTime, default=datetime.utcnow)


class Bonus(Base):
    """Bonus definition."""
    __tablename__ = "bonuses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), default="mdi:star")
    points_bonus = Column(Integer, default=10)

    created_at = Column(DateTime, default=datetime.utcnow)


# ============================================
# Phase 1: Scheduler & Feature Models
# ============================================

class ScheduledJobLog(Base):
    """Log of scheduled job executions."""
    __tablename__ = "scheduled_job_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    job_name = Column(String(100), nullable=False)
    executed_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20), default="success")  # success, failed
    error_message = Column(Text, nullable=True)
    affected_records = Column(Integer, default=0)
    duration_ms = Column(Integer, nullable=True)


class DailyMultiplier(Base):
    """Track daily chore completion for multiplier bonuses."""
    __tablename__ = "daily_multipliers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    kid_id = Column(String(36), ForeignKey("kids.id"), nullable=False)
    date = Column(DateTime, nullable=False)  # Date only (midnight)

    base_multiplier = Column(Float, default=1.0)
    bonus_multiplier = Column(Float, default=0.0)  # Additional bonus for completion
    total_chores_for_day = Column(Integer, default=0)
    completed_chores = Column(Integer, default=0)
    all_completed = Column(Boolean, default=False)
    bonus_awarded = Column(Boolean, default=False)
    bonus_points = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    kid = relationship("Kid")


# ============================================
# Phase 2: Notification Models
# ============================================

class PushSubscription(Base):
    """Browser push notification subscriptions."""
    __tablename__ = "push_subscriptions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    kid_id = Column(String(36), ForeignKey("kids.id"), nullable=True)

    endpoint = Column(Text, nullable=False)
    p256dh_key = Column(String(255), nullable=False)
    auth_key = Column(String(255), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    last_used = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User")
    kid = relationship("Kid")


class NotificationPreference(Base):
    """User notification preferences."""
    __tablename__ = "notification_preferences"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)

    # Email notifications
    email_chore_claimed = Column(Boolean, default=True)
    email_chore_approved = Column(Boolean, default=True)
    email_daily_summary = Column(Boolean, default=False)
    email_weekly_summary = Column(Boolean, default=True)

    # Push notifications
    push_enabled = Column(Boolean, default=True)
    push_chore_claimed = Column(Boolean, default=True)
    push_chore_approved = Column(Boolean, default=True)
    push_streak_milestone = Column(Boolean, default=True)
    push_reward_redeemed = Column(Boolean, default=True)

    # Quiet hours (don't send notifications during these times)
    quiet_hours_enabled = Column(Boolean, default=False)
    quiet_hours_start = Column(String(5), default="22:00")  # HH:MM
    quiet_hours_end = Column(String(5), default="08:00")  # HH:MM

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")


# ============================================
# Phase 4: Allowance Models
# ============================================

class AllowanceSettings(Base):
    """Allowance configuration for each kid."""
    __tablename__ = "allowance_settings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    kid_id = Column(String(36), ForeignKey("kids.id"), nullable=False, unique=True)

    points_per_dollar = Column(Integer, default=100)  # 100 points = $1.00
    auto_payout = Column(Boolean, default=False)
    payout_day = Column(Integer, default=0)  # 0=Sunday, 6=Saturday
    minimum_payout = Column(Float, default=1.0)  # Minimum $1.00

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    kid = relationship("Kid")


class AllowancePayout(Base):
    """Record of allowance payouts."""
    __tablename__ = "allowance_payouts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    kid_id = Column(String(36), ForeignKey("kids.id"), nullable=False)

    points_converted = Column(Integer, nullable=False)
    dollar_amount = Column(Float, nullable=False)
    payout_method = Column(String(50), default="cash")  # cash, bank, gift_card
    status = Column(String(20), default="pending")  # pending, paid, cancelled
    notes = Column(Text, nullable=True)

    requested_at = Column(DateTime, default=datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)
    paid_by = Column(String(100), nullable=True)

    # Relationships
    kid = relationship("Kid")
