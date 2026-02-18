"""Pydantic schemas for request/response validation."""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr


# --- Kid Schemas ---

class KidBase(BaseModel):
    name: str
    enable_notifications: bool = True
    google_email: Optional[str] = None


class KidCreate(KidBase):
    pass


class KidUpdate(BaseModel):
    name: Optional[str] = None
    enable_notifications: Optional[bool] = None
    points_multiplier: Optional[float] = None
    google_email: Optional[str] = None


class KidResponse(KidBase):
    id: str
    points: float
    points_multiplier: float
    overall_chore_streak: int
    longest_streak_ever: int = 0
    streak_freeze_count: int = 0
    completed_chores_today: int
    completed_chores_weekly: int
    completed_chores_monthly: int
    completed_chores_total: int
    badges: List[str]
    created_at: datetime

    class Config:
        from_attributes = True


class LinkGoogleRequest(BaseModel):
    """Request to link a Google email to a kid."""
    email: EmailStr


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


class ParentResponse(BaseModel):
    id: str
    name: str
    associated_kids: List[str] = []
    enable_notifications: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


# --- Chore Schemas ---

class ChoreBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: str = "🧹"
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
    shared_chore: Optional[bool] = None
    recurring_frequency: Optional[str] = None
    custom_interval: Optional[int] = None
    custom_interval_unit: Optional[str] = None
    applicable_days: Optional[List[int]] = None
    due_date: Optional[datetime] = None
    allow_multiple_claims_per_day: Optional[bool] = None
    partial_allowed: Optional[bool] = None


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
    parent_name: Optional[str] = None  # Derived from JWT if not provided
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


class RewardUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    cost: Optional[int] = None
    eligible_kids: Optional[List[str]] = None
    requires_approval: Optional[bool] = None


class RewardResponse(RewardBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class RewardRedeemRequest(BaseModel):
    kid_id: str


class RewardApproveRequest(BaseModel):
    parent_name: Optional[str] = None  # Derived from JWT if not provided


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


# --- Streak Schemas ---

class StreakInfo(BaseModel):
    """Detailed streak information for a kid."""
    overall_streak: int
    longest_streak_ever: int
    streak_freeze_count: int
    chore_streaks: dict  # {chore_id: streak_count}
    is_streak_at_risk: bool = False
    next_milestone: Optional[int] = None
    days_to_next_milestone: Optional[int] = None


class DailyProgressResponse(BaseModel):
    """Daily chore completion progress."""
    kid_id: str
    date: datetime
    total_chores: int
    completed_chores: int
    completion_percentage: float
    all_completed: bool
    bonus_eligible: bool
    bonus_awarded: bool
    bonus_points: int
    multiplier: float


class TodaysChoreResponse(ChoreWithStatus):
    """Chore applicable for today with additional streak info."""
    streak_count: int = 0
    is_recurring: bool = False


class ApprovalWithStreakResponse(ChoreClaimResponse):
    """Approval response with streak info."""
    new_streak: int
    is_milestone: bool = False
    milestone_reached: Optional[int] = None
    bonus_awarded: int = 0


# --- Category Schemas ---

class ChoreCategoryBase(BaseModel):
    name: str
    icon: str = "📁"
    color: str = "#6366f1"
    sort_order: int = 0


class ChoreCategoryCreate(ChoreCategoryBase):
    pass


class ChoreCategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    sort_order: Optional[int] = None


class ChoreCategoryResponse(ChoreCategoryBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Allowance Schemas ---

class AllowanceSettingsBase(BaseModel):
    points_per_dollar: int = 100
    auto_payout: bool = False
    payout_day: int = 0
    minimum_payout: float = 1.0


class AllowanceSettingsUpdate(BaseModel):
    points_per_dollar: Optional[int] = None
    auto_payout: Optional[bool] = None
    payout_day: Optional[int] = None
    minimum_payout: Optional[float] = None


class AllowanceSettingsResponse(AllowanceSettingsBase):
    id: str
    kid_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AllowanceConvertRequest(BaseModel):
    points: int
    payout_method: str = "cash"
    notes: Optional[str] = None


class AllowancePayoutResponse(BaseModel):
    id: str
    kid_id: str
    points_converted: int
    dollar_amount: float
    payout_method: str
    status: str
    notes: Optional[str]
    requested_at: datetime
    paid_at: Optional[datetime]
    paid_by: Optional[str]

    class Config:
        from_attributes = True


class AllowanceSummaryResponse(BaseModel):
    kid_id: str
    kid_name: str
    current_points: float
    current_dollar_value: float
    lifetime_payouts: int
    lifetime_amount: float
    pending_payouts: int
    pending_amount: float


# --- Notification Schemas ---

class PushSubscriptionCreate(BaseModel):
    endpoint: str
    p256dh_key: str
    auth_key: str


class NotificationPreferenceUpdate(BaseModel):
    email_chore_claimed: Optional[bool] = None
    email_chore_approved: Optional[bool] = None
    email_daily_summary: Optional[bool] = None
    email_weekly_summary: Optional[bool] = None
    push_enabled: Optional[bool] = None
    push_chore_claimed: Optional[bool] = None
    push_chore_approved: Optional[bool] = None
    push_streak_milestone: Optional[bool] = None
    push_reward_redeemed: Optional[bool] = None
    quiet_hours_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None


class NotificationPreferenceResponse(BaseModel):
    id: str
    user_id: str
    email_chore_claimed: bool
    email_chore_approved: bool
    email_daily_summary: bool
    email_weekly_summary: bool
    push_enabled: bool
    push_chore_claimed: bool
    push_chore_approved: bool
    push_streak_milestone: bool
    push_reward_redeemed: bool
    quiet_hours_enabled: bool
    quiet_hours_start: str
    quiet_hours_end: str

    class Config:
        from_attributes = True


# --- Password Reset Schemas ---

class PasswordResetRequest(BaseModel):
    """Request to initiate password reset."""
    email: str


class PasswordResetVerify(BaseModel):
    """Request to verify token and set new password."""
    token: str
    new_password: str


class PasswordResetResponse(BaseModel):
    """Response for password reset operations."""
    message: str


class PasswordResetTokenStatus(BaseModel):
    """Response for token validation check."""
    valid: bool
    email: Optional[str] = None  # Only included if valid


# --- Parent Invitation Schemas ---

class ParentInvitationCreate(BaseModel):
    """Request to send an invitation to a parent."""
    email: EmailStr


class ParentInvitationAccept(BaseModel):
    """Request to accept an invitation and create account."""
    token: str
    password: str
    display_name: Optional[str] = None


class ParentInvitationResponse(BaseModel):
    """Response for invitation operations."""
    message: str
    invitation_sent: bool = False
    email: Optional[str] = None


class ParentInvitationTokenStatus(BaseModel):
    """Response for invitation token validation."""
    valid: bool
    email: Optional[str] = None
    parent_name: Optional[str] = None
    expires_at: Optional[datetime] = None


class ParentCreateWithInvite(ParentBase):
    """Extended parent creation with optional email invitation."""
    email: Optional[EmailStr] = None
    send_invite: bool = False


# --- Generic Response Schemas ---

class MessageResponse(BaseModel):
    """Generic message response."""
    message: str


class PendingCountResponse(BaseModel):
    """Count of pending approvals."""
    chores: int
    rewards: int
    total: int


class ApprovalHistoryItem(BaseModel):
    """A single item in the approval history."""
    type: str
    id: str
    kid_name: str
    item_name: str
    status: str
    points: Optional[float] = None
    approved_by: Optional[str] = None
    timestamp: Optional[datetime] = None
