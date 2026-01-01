"""Pydantic schemas for request/response validation."""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


# --- Kid Schemas ---

class KidBase(BaseModel):
    name: str
    enable_notifications: bool = True


class KidCreate(KidBase):
    pass


class KidUpdate(BaseModel):
    name: Optional[str] = None
    enable_notifications: Optional[bool] = None


class KidResponse(KidBase):
    id: str
    points: float
    points_multiplier: float
    overall_chore_streak: int
    completed_chores_today: int
    completed_chores_weekly: int
    completed_chores_monthly: int
    completed_chores_total: int
    badges: List[str]
    created_at: datetime

    class Config:
        from_attributes = True


class KidStats(BaseModel):
    """Detailed kid statistics."""
    id: str
    name: str
    points: float
    points_multiplier: float
    overall_chore_streak: int
    completed_chores_today: int
    completed_chores_weekly: int
    completed_chores_monthly: int
    completed_chores_total: int
    badges: List[str]
    pending_chores: int
    claimed_chores: int


# --- Parent Schemas ---

class ParentBase(BaseModel):
    name: str
    pin: Optional[str] = None
    associated_kids: List[str] = []
    enable_notifications: bool = True


class ParentCreate(ParentBase):
    pass


class ParentResponse(ParentBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Chore Schemas ---

class ChoreBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: str = "mdi:broom"
    default_points: int = 10
    assigned_kids: List[str] = []
    shared_chore: bool = False
    recurring_frequency: str = "none"
    custom_interval: Optional[int] = None
    custom_interval_unit: Optional[str] = None
    applicable_days: List[int] = []
    due_date: Optional[datetime] = None
    allow_multiple_claims_per_day: bool = False
    partial_allowed: bool = False


class ChoreCreate(ChoreBase):
    pass


class ChoreUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    default_points: Optional[int] = None
    assigned_kids: Optional[List[str]] = None
    recurring_frequency: Optional[str] = None
    due_date: Optional[datetime] = None


class ChoreResponse(ChoreBase):
    id: str
    last_completed: Optional[datetime]
    last_claimed: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class ChoreWithStatus(ChoreResponse):
    """Chore with per-kid status."""
    status: str  # pending, claimed, approved, overdue
    claimed_by: Optional[str] = None


# --- Chore Claim Schemas ---

class ChoreClaimRequest(BaseModel):
    kid_id: str


class ChoreApproveRequest(BaseModel):
    parent_name: str
    points_awarded: Optional[float] = None


class ChoreClaimResponse(BaseModel):
    id: str
    kid_id: str
    chore_id: str
    status: str
    points_awarded: Optional[float]
    claimed_at: datetime
    approved_at: Optional[datetime]
    approved_by: Optional[str]

    class Config:
        from_attributes = True


# --- Reward Schemas ---

class RewardBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: str = "mdi:gift"
    cost: int = 100
    eligible_kids: List[str] = []
    requires_approval: bool = True


class RewardCreate(RewardBase):
    pass


class RewardResponse(RewardBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class RewardRedeemRequest(BaseModel):
    kid_id: str


class RewardApproveRequest(BaseModel):
    parent_name: str


class RewardClaimResponse(BaseModel):
    id: str
    kid_id: str
    reward_id: str
    status: str
    points_spent: Optional[int]
    requested_at: datetime
    approved_at: Optional[datetime]
    approved_by: Optional[str]

    class Config:
        from_attributes = True


# --- Badge Schemas ---

class BadgeBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: str = "mdi:medal"
    threshold_type: str = "points"
    threshold_value: int = 100
    points_multiplier_bonus: float = 0.0


class BadgeCreate(BadgeBase):
    pass


class BadgeResponse(BadgeBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Penalty/Bonus Schemas ---

class PenaltyBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: str = "mdi:alert"
    points_deduction: int = 10


class PenaltyCreate(PenaltyBase):
    pass


class PenaltyResponse(PenaltyBase):
    id: str

    class Config:
        from_attributes = True


class BonusBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: str = "mdi:star"
    points_bonus: int = 10


class BonusCreate(BonusBase):
    pass


class BonusResponse(BonusBase):
    id: str

    class Config:
        from_attributes = True


class ApplyPenaltyRequest(BaseModel):
    kid_id: str
    parent_name: str


class ApplyBonusRequest(BaseModel):
    kid_id: str
    parent_name: str


# --- Points Adjustment ---

class PointsAdjustRequest(BaseModel):
    points: float
    reason: Optional[str] = None


# --- Pending Approvals ---

class PendingApproval(BaseModel):
    type: str  # "chore" or "reward"
    id: str
    kid_id: str
    kid_name: str
    item_id: str
    item_name: str
    timestamp: datetime


class PendingApprovalsResponse(BaseModel):
    chores: List[ChoreClaimResponse]
    rewards: List[RewardClaimResponse]
