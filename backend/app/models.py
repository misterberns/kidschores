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
    pin = Column(String(10), nullable=True)  # Optional PIN for approvals

    # Associated kids (list of kid IDs)
    associated_kids = Column(JSON, default=list)

    # Notifications
    enable_notifications = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)


class Chore(Base):
    """Chore definition model."""
    __tablename__ = "chores"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), default="mdi:broom")
    default_points = Column(Integer, default=10)

    # Assignment
    assigned_kids = Column(JSON, default=list)  # List of kid IDs
    shared_chore = Column(Boolean, default=False)

    # Scheduling
    recurring_frequency = Column(String(20), default="none")  # none, daily, weekly, biweekly, monthly, custom
    custom_interval = Column(Integer, nullable=True)
    custom_interval_unit = Column(String(10), nullable=True)  # days, weeks
    applicable_days = Column(JSON, default=list)  # [0-6] for days of week
    due_date = Column(DateTime, nullable=True)

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

    status = Column(String(20), default="pending")  # pending, claimed, approved, disapproved
    points_awarded = Column(Float, nullable=True)

    claimed_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(String(100), nullable=True)  # Parent name

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
