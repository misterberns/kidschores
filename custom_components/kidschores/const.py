# File: const.py
"""
Constants for the KidsChores integration.

This file centralizes configuration keys, defaults, labels, domain names,
event names, and platform identifiers for consistency across the integration.
It also supports localization by defining all labels and UI texts used in sensors,
services, and options flow.
"""

# Integration Domain and Logging
DOMAIN = "kidschores"  # Unique domain identifier for this integration
import logging

LOGGER = logging.getLogger(__package__)  # Logger for debugging

# Supported Platforms
PLATFORMS = [
    "sensor",
    "binary_sensor",
    "button",
]  # Active platforms used in the integration

# Storage and Versioning
STORAGE_KEY = "kidschores_data"  # Persistent storage key
STORAGE_VERSION = 1  # Version number for storage format (used during migrations)

# Configuration Keys
CONF_POINTS_LABEL = "points_label"  # Custom label for points
CONF_KIDS = "kids"  # Key for kids configuration
CONF_CHORES = "chores"  # Key for chores configuration
CONF_BADGES = "badges"  # Key for badges configuration
CONF_REWARDS = "rewards"  # Key for rewards configuration
CONF_PENALTIES = "penalties"  # Key for penalties configuration

# Update Interval
UPDATE_INTERVAL = 5  # Update interval for coordinator (in minutes)

# Default icons
DEFAULT_ICON = "mdi:star-outline"  # Default icon for general points display
DEFAULT_BADGE_BINARY_ICON = "mdi:shield-star-outline"  # For kid-has-any-badge sensor
DEFAULT_CHORE_APPROVE_ICON = "mdi:checkbox-marked-circle-outline"
DEFAULT_CHORE_BINARY_ICON = (
    "mdi:checkbox-blank-circle-outline"  # For chore status binary sensor
)
DEFAULT_CHORE_CLAIM_ICON = "mdi:clipboard-check-outline"
DEFAULT_CHORE_SENSOR_ICON = (
    "mdi:checkbox-blank-circle-outline"  # For chore status sensor
)
DEFAULT_REWARD_ICON = "mdi:gift-outline"  # Default icon for rewards
DEFAULT_PENALTY_ICON = "mdi:alert-outline"  # Default icon for penalties
DEFAULT_POINTS_ADJUST_PLUS_ICON = "mdi:plus-circle-outline"
DEFAULT_POINTS_ADJUST_MINUS_ICON = "mdi:minus-circle-outline"
DEFAULT_TROPHY_ICON = "mdi:trophy"  # For highest-badge sensor fallback
DEFAULT_TROPHY_OUTLINE = "mdi:trophy-outline"

# Default Values
DEFAULT_POINTS = 5  # Default points awarded for each chore
DEFAULT_REWARD_COST = 10  # Default cost for each reward
DEFAULT_PENALTY_POINTS = 2  # Default points deducted for each penalty
DEFAULT_BADGE_THRESHOLD = 50  # Default points threshold for badges
DEFAULT_PARTIAL_ALLOWED = False  # Partial points not allowed by default
DEFAULT_POINTS_LABEL = "Points"  # Default label for points displayed in UI
DEFAULT_DAILY_RESET_TIME = {
    "hour": 0,
    "minute": 0,
    "second": 0,
}  # Daily reset at midnight
DEFAULT_WEEKLY_RESET_DAY = 0  # Weekly reset on Monday (0 = Monday, 6 = Sunday)
DEFAULT_MONTHLY_RESET_DAY = 1  # Monthly reset on the 1st day

# Data Keys for Coordinator and Storage
DATA_KIDS = "kids"  # Key for storing kids data in storage
DATA_CHORES = "chores"  # Key for storing chores data
DATA_BADGES = "badges"  # Key for storing badges data
DATA_REWARDS = "rewards"  # Key for storing rewards data
DATA_PENALTIES = "penalties"  # Key for storing penalties data

# Chore States
CHORE_STATE_PENDING = "pending"  # Default state: chore pending approval
CHORE_STATE_CLAIMED = "claimed"  # Chore claimed by a kid
CHORE_STATE_APPROVED = "approved"  # Chore fully approved
CHORE_STATE_PARTIAL = "partial"  # Chore approved with partial points
CHORE_STATE_OVERDUE = "overdue"  # Chore not completed before the due date

# Badge Threshold Types
BADGE_THRESHOLD_TYPE_POINTS = "points"  # Badges awarded for reaching points
BADGE_THRESHOLD_TYPE_CHORE_COUNT = (
    "chore_count"  # Badges for completing a number of chores
)

# Event Names
EVENT_CHORE_COMPLETED = "kidschores_chore_completed"  # Event for chore completion
EVENT_REWARD_REDEEMED = "kidschores_reward_redeemed"  # Event for redeeming a reward

# Sensor Types
SENSOR_TYPE_POINTS = "points"  # Sensor tracking total points
SENSOR_TYPE_BADGES = "badges"  # Sensor tracking earned badges
SENSOR_TYPE_COMPLETED_DAILY = (
    "completed_daily"  # Sensor tracking daily chores completed
)
SENSOR_TYPE_COMPLETED_WEEKLY = (
    "completed_weekly"  # Sensor tracking weekly chores completed
)
SENSOR_TYPE_COMPLETED_MONTHLY = (
    "completed_monthly"  # Sensor tracking monthly chores completed
)

# Custom Services
SERVICE_CLAIM_CHORE = "claim_chore"  # Claim chore service
SERVICE_APPROVE_CHORE = "approve_chore"  # Approve chore service
SERVICE_REDEEM_REWARD = "redeem_reward"  # Redeem reward service
SERVICE_APPLY_PENALTY = "apply_penalty"  # Apply penalty service
SERVICE_APPROVE_REWARD = "approve_reward"  # Approve reward service

# Field Names (for consistency across services)
FIELD_KID_NAME = "kid_name"
FIELD_CHORE_NAME = "chore_name"
FIELD_PARENT_NAME = "parent_name"
FIELD_REWARD_NAME = "reward_name"
FIELD_PENALTY_NAME = "penalty_name"
FIELD_POINTS_AWARDED = "points_awarded"

# Reset Timings
RESET_HOURLY = {"hour": 0, "minute": 0, "second": 0}  # Reset chores daily at midnight
RESET_WEEKLY = 0  # Weekly reset day (Monday)
RESET_MONTHLY = 1  # Monthly reset on the 1st day

# Validation Keys
VALIDATION_PARTIAL_ALLOWED = "partial_allowed"  # Allow partial points in chores
VALIDATION_DUE_DATE = "due_date"  # Optional due date for chores
VALIDATION_THRESHOLD_TYPE = "threshold_type"  # Badge criteria type
VALIDATION_THRESHOLD_VALUE = "threshold_value"  # Badge criteria value

# Options Flow Management
OPTIONS_FLOW_KIDS = "manage_kids"  # Edit kids step
OPTIONS_FLOW_CHORES = "manage_chores"  # Edit chores step
OPTIONS_FLOW_BADGES = "manage_badges"  # Edit badges step
OPTIONS_FLOW_REWARDS = "manage_rewards"  # Edit rewards step
OPTIONS_FLOW_PENALTIES = "manage_penalties"  # Edit penalties step

# Labels for Sensors and UI
LABEL_POINTS = "Points"
LABEL_BADGES = "Badges"
LABEL_COMPLETED_DAILY = "Daily Completed Chores"
LABEL_COMPLETED_WEEKLY = "Weekly Completed Chores"
LABEL_COMPLETED_MONTHLY = "Monthly Completed Chores"

# Button Prefixes for Dynamic Creation
BUTTON_REWARD_PREFIX = "reward_button_"  # Prefix for dynamically created reward buttons
BUTTON_PENALTY_PREFIX = (
    "penalty_button_"  # Prefix for dynamically created penalty buttons
)

# Translations - Errors and Warnings
ERROR_KID_NOT_FOUND = "Kid not found."  # Error for non-existent kid
ERROR_CHORE_NOT_FOUND = "Chore not found."  # Error for missing chore
ERROR_INVALID_POINTS = "Invalid points."  # Error for invalid points input
ERROR_REWARD_NOT_FOUND = "Reward not found."  # Error for missing reward
ERROR_PENALTY_NOT_FOUND = "Penalty not found."  # Error for missing penalty
ERROR_USER_NOT_AUTHORIZED = (
    "User is not authorized to perform this action."  # Auth error
)

# Parent Approval Workflow
PARENT_APPROVAL_REQUIRED = True  # Enable parent approval for certain actions
HA_USERNAME_LINK_ENABLED = True  # Enable linking kids to HA usernames
