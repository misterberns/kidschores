# File: coordinator.py
"""
Coordinator for the KidsChores integration.

Handles data synchronization, chore claiming and approval, badge tracking,
reward redemption, penalty application, and recurring chore handling.
Manages entities primarily using internal_id for consistency.
"""

import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.event import async_track_time_change
from homeassistant.helpers.storage import Store
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import (
    LOGGER,
    DOMAIN,
    STORAGE_KEY,
    STORAGE_VERSION,
    DATA_KIDS,
    DATA_CHORES,
    DATA_BADGES,
    DATA_REWARDS,
    DATA_PENALTIES,
    CONF_KIDS,
    CONF_CHORES,
    CONF_BADGES,
    CONF_REWARDS,
    CONF_PENALTIES,
    CHORE_STATE_PENDING,
    CHORE_STATE_CLAIMED,
    CHORE_STATE_APPROVED,
    CHORE_STATE_PARTIAL,
    CHORE_STATE_OVERDUE,
    EVENT_CHORE_COMPLETED,
    EVENT_REWARD_REDEEMED,
    BADGE_THRESHOLD_TYPE_POINTS,
    BADGE_THRESHOLD_TYPE_CHORE_COUNT,
    DEFAULT_POINTS,
    DEFAULT_PARTIAL_ALLOWED,
    DEFAULT_BADGE_THRESHOLD,
    DEFAULT_REWARD_COST,
    DEFAULT_PENALTY_POINTS,
    DEFAULT_ICON,
    DEFAULT_PENALTY_ICON,
    DEFAULT_REWARD_ICON,
    DEFAULT_MONTHLY_RESET_DAY,
    DEFAULT_WEEKLY_RESET_DAY,
    UPDATE_INTERVAL,
    RESET_WEEKLY,
    RESET_MONTHLY,
    FIELD_KID_NAME,
    FIELD_CHORE_NAME,
    FIELD_PARENT_NAME,
    FIELD_REWARD_NAME,
    FIELD_PENALTY_NAME,
)


class KidsChoresDataCoordinator(DataUpdateCoordinator):
    """
    Coordinator for KidsChores integration.
    Manages data primarily using internal_id for entities.
    """

    def __init__(
        self,
        hass: HomeAssistant,
        config_entry: ConfigEntry,
        storage_manager,
    ):
        """Initialize the KidsChoresDataCoordinator."""
        super().__init__(
            hass,
            LOGGER,
            name=f"{DOMAIN}_coordinator",
            update_interval=timedelta(minutes=UPDATE_INTERVAL),
        )
        self.config_entry = config_entry
        self.storage_manager = storage_manager
        self._data: Dict[str, Any] = {}

    async def _async_update_data(self):
        """
        Periodic update:
        - Checks overdue chores
        - Handles recurring resets
        - Notifies entities
        """
        try:
            self._handle_scheduled_tasks()
            self.async_update_listeners()
            return self._data
        except Exception as err:
            raise UpdateFailed(f"Error updating KidsChores data: {err}") from err

    async def async_config_entry_first_refresh(self):
        """Initial load from storage + merging config options."""
        stored_data = self.storage_manager.get_data()
        self._data = (
            stored_data
            if stored_data
            else {
                DATA_KIDS: {},
                DATA_CHORES: {},
                DATA_BADGES: {},
                DATA_REWARDS: {},
                DATA_PENALTIES: {},
            }
        )

        # Register daily/weekly/monthly resets
        async_track_time_change(
            self.hass, self._reset_daily_count, hour=0, minute=0, second=0
        )
        async_track_time_change(
            self.hass, self._reset_weekly_count, hour=0, minute=0, second=0
        )
        async_track_time_change(
            self.hass, self._reset_monthly_count, hour=0, minute=0, second=0
        )

        self._initialize_data_from_config()
        self._persist()
        await super().async_config_entry_first_refresh()

    def _initialize_data_from_config(self):
        """Merge config_entry options with stored data structures using internal_id."""
        options = self.config_entry.options

        kids_dict = options.get(CONF_KIDS, {})
        chores_dict = options.get(CONF_CHORES, {})
        badges_dict = options.get(CONF_BADGES, {})
        rewards_dict = options.get(CONF_REWARDS, {})
        penalties_dict = options.get(CONF_PENALTIES, {})

        # Ensure minimal structure
        self._data.setdefault(DATA_KIDS, {})
        self._data.setdefault(DATA_CHORES, {})
        self._data.setdefault(DATA_BADGES, {})
        self._data.setdefault(DATA_REWARDS, {})
        self._data.setdefault(DATA_PENALTIES, {})

        # --- Kids ---
        # Remove kids not present in options
        existing_kids = set(self._data[DATA_KIDS].keys())
        option_kids = set(kids_dict.keys())
        kids_to_remove = existing_kids - option_kids
        for kid_id in kids_to_remove:
            del self._data[DATA_KIDS][kid_id]
            LOGGER.debug(
                "Removed kid with ID '%s' as it's no longer in configuration.", kid_id
            )

        # Add or update kids from options
        for kid_id, kid_data in kids_dict.items():
            if kid_id not in self._data[DATA_KIDS]:
                # Add new kid
                self._data[DATA_KIDS][kid_id] = {
                    "name": kid_data.get("name", ""),
                    "points": kid_data.get("points", 0),
                    "badges": kid_data.get("badges", []),
                    "claimed_chores": kid_data.get("claimed_chores", []),
                    "approved_chores": kid_data.get("approved_chores", []),  # New Field
                    "completed_chores_today": kid_data.get("completed_chores_today", 0),
                    "completed_chores_weekly": kid_data.get(
                        "completed_chores_weekly", 0
                    ),
                    "completed_chores_monthly": kid_data.get(
                        "completed_chores_monthly", 0
                    ),
                    "ha_user_id": kid_data.get("ha_user_id"),
                    "internal_id": kid_id,
                }
                LOGGER.debug(
                    "Added new kid '%s' with ID: %s",
                    self._data[DATA_KIDS][kid_id]["name"],
                    kid_id,
                )
            else:
                # Update existing kid's editable fields
                existing = self._data[DATA_KIDS][kid_id]
                existing["name"] = kid_data.get("name", existing["name"])
                existing["ha_user_id"] = kid_data.get(
                    "ha_user_id", existing["ha_user_id"]
                )
                # Initialize 'approved_chores' if missing
                existing.setdefault(
                    "approved_chores", kid_data.get("approved_chores", [])
                )
                # Points and other historical data should not be overwritten

        # --- Chores ---
        existing_chores = set(self._data[DATA_CHORES].keys())
        option_chores = set(chores_dict.keys())
        chores_to_remove = existing_chores - option_chores
        for chore_id in chores_to_remove:
            del self._data[DATA_CHORES][chore_id]
            LOGGER.debug(
                "Removed chore with ID '%s' as it's no longer in configuration.",
                chore_id,
            )

        # Add or update chores from options
        for chore_id, chore_data in chores_dict.items():
            if chore_id not in self._data[DATA_CHORES]:
                # Add new chore
                assigned_kids_names = chore_data.get("assigned_kids", [])
                assigned_kids_ids = []
                for kid_name in assigned_kids_names:
                    kid_id = self._get_kid_id_by_name(self, kid_name)
                    if kid_id:
                        assigned_kids_ids.append(kid_id)
                    else:
                        LOGGER.warning(
                            "Chore '%s': Kid name '%s' not found. Skipping assignment.",
                            chore_data.get("name", chore_id),
                            kid_name,
                        )

                self._data[DATA_CHORES][chore_id] = {
                    "name": chore_data.get("name", ""),
                    "state": chore_data.get("state", CHORE_STATE_PENDING),
                    "assigned_to": chore_data.get("assigned_to"),
                    "default_points": chore_data.get("default_points", DEFAULT_POINTS),
                    "partial_allowed": chore_data.get(
                        "partial_allowed", DEFAULT_PARTIAL_ALLOWED
                    ),
                    "description": chore_data.get("description", ""),
                    "icon": chore_data.get("icon", DEFAULT_ICON),
                    "shared_chore": chore_data.get("shared_chore", False),
                    "assigned_kids": assigned_kids_ids,  # Store kid_ids
                    "recurring_frequency": chore_data.get(
                        "recurring_frequency", "none"
                    ),
                    "due_date": chore_data.get("due_date"),
                    "last_completed": chore_data.get("last_completed"),
                    "internal_id": chore_id,
                }
                LOGGER.debug(
                    "Added new chore '%s' with ID: %s",
                    self._data[DATA_CHORES][chore_id]["name"],
                    chore_id,
                )
            else:
                # Update existing chore's editable fields
                existing = self._data[DATA_CHORES][chore_id]
                existing["name"] = chore_data.get("name", existing["name"])
                existing["state"] = chore_data.get("state", existing["state"])
                existing["assigned_to"] = chore_data.get(
                    "assigned_to", existing["assigned_to"]
                )
                existing["default_points"] = chore_data.get(
                    "default_points", existing["default_points"]
                )
                existing["partial_allowed"] = chore_data.get(
                    "partial_allowed", existing["partial_allowed"]
                )
                existing["description"] = chore_data.get(
                    "description", existing["description"]
                )
                existing["icon"] = chore_data.get("icon", existing["icon"])
                existing["shared_chore"] = chore_data.get(
                    "shared_chore", existing["shared_chore"]
                )

                # Update assigned_kids to internal_ids
                assigned_kids_names = chore_data.get("assigned_kids", [])
                assigned_kids_ids = []
                for kid_name in assigned_kids_names:
                    kid_id = self._get_kid_id_by_name(kid_name)
                    if kid_id:
                        assigned_kids_ids.append(kid_id)
                    else:
                        LOGGER.warning(
                            "Chore '%s': Kid name '%s' not found. Skipping assignment.",
                            chore_data.get("name", chore_id),
                            kid_name,
                        )
                existing["assigned_kids"] = assigned_kids_ids

                existing["recurring_frequency"] = chore_data.get(
                    "recurring_frequency", existing["recurring_frequency"]
                )
                existing["due_date"] = chore_data.get("due_date", existing["due_date"])
                existing["last_completed"] = chore_data.get(
                    "last_completed", existing["last_completed"]
                )
                # Preserve internal_id and historical data

        # --- Badges ---
        existing_badges = set(self._data[DATA_BADGES].keys())
        option_badges = set(badges_dict.keys())
        badges_to_remove = existing_badges - option_badges
        for badge_id in badges_to_remove:
            del self._data[DATA_BADGES][badge_id]
            LOGGER.debug(
                "Removed badge with ID '%s' as it's no longer in configuration.",
                badge_id,
            )

        # Add or update badges from options
        for badge_id, badge_data in badges_dict.items():
            if badge_id not in self._data[DATA_BADGES]:
                # Add new badge
                self._data[DATA_BADGES][badge_id] = {
                    "name": badge_data.get("name", ""),
                    "threshold_type": badge_data.get(
                        "threshold_type", BADGE_THRESHOLD_TYPE_POINTS
                    ),
                    "threshold_value": badge_data.get(
                        "threshold_value", DEFAULT_BADGE_THRESHOLD
                    ),
                    "earned_by": badge_data.get("earned_by", []),
                    "icon": badge_data.get("icon", DEFAULT_ICON),
                    "description": badge_data.get("description", ""),
                    "internal_id": badge_id,
                }
                LOGGER.debug(
                    "Added new badge '%s' with ID: %s",
                    self._data[DATA_BADGES][badge_id]["name"],
                    badge_id,
                )
            else:
                # Update existing badge's editable fields
                existing = self._data[DATA_BADGES][badge_id]
                existing["name"] = badge_data.get("name", existing["name"])
                existing["threshold_type"] = badge_data.get(
                    "threshold_type", existing["threshold_type"]
                )
                existing["threshold_value"] = badge_data.get(
                    "threshold_value", existing["threshold_value"]
                )
                existing["icon"] = badge_data.get("icon", existing["icon"])
                existing["description"] = badge_data.get(
                    "description", existing["description"]
                )
                # Preserve earned_by and internal_id

        # --- Rewards ---
        existing_rewards = set(self._data[DATA_REWARDS].keys())
        option_rewards = set(rewards_dict.keys())
        rewards_to_remove = existing_rewards - option_rewards
        for reward_id in rewards_to_remove:
            del self._data[DATA_REWARDS][reward_id]
            LOGGER.debug(
                "Removed reward with ID '%s' as it's no longer in configuration.",
                reward_id,
            )

        # Add or update rewards from options
        for reward_id, reward_data in rewards_dict.items():
            if reward_id not in self._data[DATA_REWARDS]:
                # Add new reward
                self._data[DATA_REWARDS][reward_id] = {
                    "name": reward_data.get("name", ""),
                    "cost": reward_data.get("cost", DEFAULT_REWARD_COST),
                    "description": reward_data.get("description", ""),
                    "icon": reward_data.get("icon", DEFAULT_REWARD_ICON),
                    "internal_id": reward_id,
                }
                LOGGER.debug(
                    "Added new reward '%s' with ID: %s",
                    self._data[DATA_REWARDS][reward_id]["name"],
                    reward_id,
                )
            else:
                # Update existing reward's editable fields
                existing = self._data[DATA_REWARDS][reward_id]
                existing["name"] = reward_data.get("name", existing["name"])
                existing["cost"] = reward_data.get("cost", existing["cost"])
                existing["description"] = reward_data.get(
                    "description", existing["description"]
                )
                existing["icon"] = reward_data.get("icon", existing["icon"])
                # Preserve internal_id

        # --- Penalties ---
        existing_penalties = set(self._data[DATA_PENALTIES].keys())
        option_penalties = set(penalties_dict.keys())
        penalties_to_remove = existing_penalties - option_penalties
        for penalty_id in penalties_to_remove:
            del self._data[DATA_PENALTIES][penalty_id]
            LOGGER.debug(
                "Removed penalty with ID '%s' as it's no longer in configuration.",
                penalty_id,
            )

        # Add or update penalties from options
        for penalty_id, penalty_data in penalties_dict.items():
            if penalty_id not in self._data[DATA_PENALTIES]:
                # Add new penalty
                self._data[DATA_PENALTIES][penalty_id] = {
                    "name": penalty_data.get("name", ""),
                    "points": penalty_data.get("points", -DEFAULT_PENALTY_POINTS),
                    "description": penalty_data.get("description", ""),
                    "icon": penalty_data.get("icon", DEFAULT_PENALTY_ICON),
                    "internal_id": penalty_id,
                }
                LOGGER.debug(
                    "Added new penalty '%s' with ID: %s",
                    penalty_data.get("name", ""),
                    penalty_id,
                )
            else:
                # Update existing penalty's editable fields
                existing = self._data[DATA_PENALTIES][penalty_id]
                existing["name"] = penalty_data.get("name", existing["name"])
                existing["points"] = penalty_data.get("points", existing["points"])
                existing["description"] = penalty_data.get(
                    "description", existing["description"]
                )
                existing["icon"] = penalty_data.get("icon", existing["icon"])
                # Preserve internal_id

    # ------------------ PROPERTIES FOR EASY ACCESS ------------------

    @property
    def kids_data(self):
        return self._data.get(DATA_KIDS, {})

    @property
    def chores_data(self):
        return self._data.get(DATA_CHORES, {})

    @property
    def badges_data(self):
        return self._data.get(DATA_BADGES, {})

    @property
    def rewards_data(self):
        return self._data.get(DATA_REWARDS, {})

    @property
    def penalties_data(self):
        return self._data.get(DATA_PENALTIES, {})

    # ------------------ CHORES ------------------
    def approve_chore(
        self,
        parent_name: str,
        kid_id: str,
        chore_id: str,
        points_awarded: Optional[float] = None,
    ):
        """Approve a chore for kid_id if assigned."""
        if chore_id not in self.chores_data:
            LOGGER.warning("approve_chore: Chore ID '%s' not found.", chore_id)
            return

        chore_info = self.chores_data[chore_id]
        if kid_id not in chore_info.get("assigned_kids", []):
            LOGGER.warning(
                "approve_chore: Chore ID '%s' not assigned to kid ID '%s'.",
                chore_id,
                kid_id,
            )
            return

        kid_info = self.kids_data.get(kid_id)
        if not kid_info:
            LOGGER.warning("approve_chore: Kid ID '%s' not found.", kid_id)
            return

        default_points = chore_info.get("default_points", DEFAULT_POINTS)
        awarded = points_awarded if points_awarded is not None else default_points

        if chore_info.get("shared_chore", False):
            # For shared chores, update global state
            if awarded < default_points:
                chore_info["state"] = CHORE_STATE_PARTIAL
            else:
                chore_info["state"] = CHORE_STATE_APPROVED
        else:
            # For non-shared chores, update per-kid approved chores
            if chore_id in kid_info.get("claimed_chores", []):
                kid_info["claimed_chores"].remove(chore_id)
                kid_info.setdefault("approved_chores", []).append(chore_id)
            else:
                LOGGER.warning(
                    "approve_chore: Chore ID '%s' was not claimed by kid ID '%s'.",
                    chore_id,
                    kid_id,
                )

        # Award points
        kid_info["points"] += awarded
        kid_info["completed_chores_today"] += 1
        kid_info["completed_chores_weekly"] += 1
        kid_info["completed_chores_monthly"] += 1

        # Also check badges after awarding
        self._check_badges_for_kid(kid_id)

        chore_info["last_completed"] = datetime.now().isoformat()

        # Persist
        self._persist()
        self.async_set_updated_data(self._data)

    def claim_chore(self, kid_id: str, chore_id: str, user_name: str):
        """Kid claims chore => state=claimed; parent must then approve."""
        if chore_id not in self.chores_data:
            LOGGER.warning("Chore ID '%s' not found for claim.", chore_id)
            return
        chore_info = self.chores_data[chore_id]
        if kid_id not in chore_info.get("assigned_kids", []):
            LOGGER.warning(
                "claim_chore: Chore ID '%s' not assigned to kid ID '%s'.",
                chore_id,
                kid_id,
            )
            return

        if chore_info.get("shared_chore", False):
            # For shared chores, set global state
            chore_info["state"] = CHORE_STATE_CLAIMED
        else:
            # For non-shared chores, add to kid's claimed chores
            kid_info = self.kids_data.get(kid_id)
            if kid_info is None:
                LOGGER.warning("claim_chore: Kid ID '%s' not found.", kid_id)
                return
            if chore_id not in kid_info.get("claimed_chores", []):
                kid_info.setdefault("claimed_chores", []).append(chore_id)
            else:
                LOGGER.debug(
                    "Chore ID '%s' already claimed by kid ID '%s'.",
                    chore_id,
                    kid_id,
                )

        # Persist
        self._persist()
        self.async_set_updated_data(self._data)

    def update_chore_state(self, chore_id: str, state: str):
        """Manually override a chore's state."""
        chore_info = self.chores_data.get(chore_id)
        if not chore_info:
            LOGGER.warning("update_chore_state: Chore ID '%s' not found.", chore_id)
            return

        chore_info["state"] = state
        self._persist()
        self.async_set_updated_data(self._data)

    def reset_chore(self, chore_id: str):
        """Reset a chore to pending."""
        chore_info = self.chores_data.get(chore_id)
        if not chore_info:
            LOGGER.warning("reset_chore: Chore ID '%s' not found.", chore_id)
            return

        chore_info["state"] = CHORE_STATE_PENDING
        chore_info["assigned_to"] = None
        chore_info["last_completed"] = None
        LOGGER.info("Chore ID '%s' has been reset.", chore_id)

        self._persist()
        self.async_set_updated_data(self._data)

    def _handle_recurring_chore(self, chore_info: dict):
        """If chore is daily/weekly/monthly, reset & set next due date."""
        freq = chore_info.get("recurring_frequency", "none")
        now = datetime.now()
        if freq == "daily":
            next_due = now + timedelta(days=1)
        elif freq == "weekly":
            next_due = now + timedelta(weeks=1)
        elif freq == "monthly":
            next_due = now + timedelta(days=30)
        else:
            return

        chore_info["state"] = CHORE_STATE_PENDING
        chore_info["assigned_to"] = None
        chore_info["due_date"] = next_due.isoformat()

    def _handle_scheduled_tasks(self):
        """Check overdue chores, handle recurring resets."""
        now = datetime.now()
        for c_id, c_info in self.chores_data.items():
            # Overdue check
            due_str = c_info.get("due_date")
            if due_str and c_info["state"] in [
                CHORE_STATE_PENDING,
                CHORE_STATE_CLAIMED,
            ]:
                due_date = datetime.fromisoformat(due_str)
                if now > due_date:
                    c_info["state"] = CHORE_STATE_OVERDUE
                    LOGGER.info("Chore ID '%s' is overdue.", c_id)

    # ------------------ POINTS / REWARDS ------------------
    def update_kid_points(self, kid_id: str, points: int):
        """Manually set a kid's points."""
        kid_info = self.kids_data.get(kid_id)
        if not kid_info:
            LOGGER.warning("update_kid_points: Kid ID '%s' not found.", kid_id)
            return
        kid_info["points"] = points
        self._check_badges_for_kid(kid_id)  # Check if awarding badges
        self._persist()
        self.async_set_updated_data(self._data)

    def redeem_reward(self, parent_name: str, kid_id: str, reward_id: str):
        """Kid redeems a reward => deduct points if enough."""
        reward = self.rewards_data.get(reward_id)
        if not reward:
            LOGGER.warning("redeem_reward: Reward ID '%s' not found.", reward_id)
            return

        kid_info = self.kids_data.get(kid_id)
        if not kid_info:
            LOGGER.warning("redeem_reward: Kid ID '%s' not found.", kid_id)
            return

        cost = reward.get("cost", 0)
        if kid_info["points"] < cost:
            LOGGER.warning(
                "Redeem_reward: Kid ID '%s' does not have enough points.", kid_id
            )
            raise HomeAssistantError(
                f"Kid '{kid_info['name']}' does not have enough points ({cost} needed)."
            )  # Consider using localized messages

        kid_info["points"] -= cost
        self._check_badges_for_kid(kid_id)
        # Fire an event for reward redemption if desired
        self.hass.bus.async_fire(
            EVENT_REWARD_REDEEMED,
            {
                FIELD_PARENT_NAME: parent_name,
                FIELD_KID_NAME: kid_info["name"],
                FIELD_REWARD_NAME: reward["name"],
                "reward_cost": cost,
            },
        )

        self._persist()
        self.async_set_updated_data(self._data)

    # ------------------ BADGES ------------------
    def _check_badges_for_kid(self, kid_id: str):
        """
        Evaluate all badge thresholds for kid:
        - If threshold met (points or chore_count), mark as earned.
        - Once earned, do not remove even if points go below threshold again.
        """
        kid_info = self.kids_data.get(kid_id)
        if not kid_info:
            return

        for badge_id, badge_data in self.badges_data.items():
            if kid_id in badge_data.get("earned_by", []):
                continue  # Already earned => no removal

            threshold_type = badge_data.get("threshold_type")
            threshold_value = badge_data.get("threshold_value", 0)

            if threshold_type == BADGE_THRESHOLD_TYPE_POINTS:
                if kid_info["points"] >= threshold_value:
                    self._award_badge(kid_id, badge_id)
            elif threshold_type == BADGE_THRESHOLD_TYPE_CHORE_COUNT:
                # Depending on the chore count type, adjust accordingly
                # For simplicity, assuming daily chore count here
                if kid_info.get("completed_chores_daily", 0) >= threshold_value:
                    self._award_badge(kid_id, badge_id)

    def _award_badge(self, kid_id: str, badge_id: str):
        """Add the badge to kid's 'earned_by' and kid's 'badges' list."""
        badge = self.badges_data.get(badge_id)
        if not badge:
            return

        badge.setdefault("earned_by", []).append(kid_id)
        kid_info = self.kids_data.get(kid_id)
        if kid_info:
            kid_info.setdefault("badges", []).append(badge["name"])  # Store badge name

        LOGGER.info("Badge '%s' awarded to kid ID '%s'.", badge["name"], kid_id)
        self._persist()
        self.async_set_updated_data(self._data)

    def add_badge(self, badge_def: dict):
        """Add new badge at runtime if needed."""
        badge_name = badge_def.get("name")
        if not badge_name:
            LOGGER.warning("add_badge: Badge must have a name.")
            return
        if any(
            badge_data["name"] == badge_name for badge_data in self.badges_data.values()
        ):
            LOGGER.warning("add_badge: Badge '%s' already exists.", badge_name)
            return
        internal_id = str(uuid.uuid4())
        self.badges_data[internal_id] = {
            "name": badge_name,
            "threshold_type": badge_def.get(
                "threshold_type", BADGE_THRESHOLD_TYPE_POINTS
            ),
            "threshold_value": badge_def.get(
                "threshold_value", DEFAULT_BADGE_THRESHOLD
            ),
            "earned_by": [],
            "icon": badge_def.get("icon", DEFAULT_ICON),
            "description": badge_def.get("description", ""),
            "internal_id": internal_id,
        }
        LOGGER.debug("Added new badge '%s' with ID: %s", badge_name, internal_id)
        self._persist()
        self.async_set_updated_data(self._data)

    # ------------------ PENALTIES ------------------
    def apply_penalty(self, parent_name: str, kid_id: str, penalty_id: str):
        """Apply penalty => negative 'points' to reduce kid's points."""
        penalty = self.penalties_data.get(penalty_id)
        if not penalty:
            LOGGER.warning("apply_penalty: Penalty ID '%s' not found.", penalty_id)
            return

        kid_info = self.kids_data.get(kid_id)
        if not kid_info:
            LOGGER.warning("apply_penalty: Kid ID '%s' not found.", kid_id)
            return

        delta = penalty.get("points", 0)
        kid_info["points"] += delta  # typically negative
        self._check_badges_for_kid(kid_id)
        self._persist()
        self.async_set_updated_data(self._data)

    def add_penalty(self, penalty_def: dict):
        """Add new penalty at runtime if needed."""
        penalty_name = penalty_def.get("name")
        if not penalty_name:
            LOGGER.warning("add_penalty: Penalty must have a name.")
            return
        if any(
            penalty_data["name"] == penalty_name
            for penalty_data in self.penalties_data.values()
        ):
            LOGGER.warning("add_penalty: Penalty '%s' already exists.", penalty_name)
            return
        internal_id = str(uuid.uuid4())
        self.penalties_data[internal_id] = {
            "name": penalty_name,
            "points": penalty_def.get("points", -DEFAULT_PENALTY_POINTS),
            "description": penalty_def.get("description", ""),
            "icon": penalty_def.get("icon", DEFAULT_PENALTY_ICON),
            "internal_id": internal_id,
        }
        LOGGER.debug("Added new penalty '%s' with ID: %s", penalty_name, internal_id)
        self._persist()
        self.async_set_updated_data(self._data)

    # ------------------ RESET CHORES ------------------
    def _reset_daily_count(self, now):
        for kid_id, kid_info in self.kids_data.items():
            kid_info["completed_chores_today"] = 0
        LOGGER.info("Daily chore counts have been reset.")
        self.async_set_updated_data(self._data)

    def _reset_weekly_count(self, now):
        if now.weekday() == DEFAULT_WEEKLY_RESET_DAY:
            for kid_id, kid_info in self.kids_data.items():
                kid_info["completed_chores_weekly"] = 0
            LOGGER.info("Weekly chore counts have been reset.")
            self.async_set_updated_data(self._data)

    def _reset_monthly_count(self, now):
        if now.day == DEFAULT_MONTHLY_RESET_DAY:
            for kid_id, kid_info in self.kids_data.items():
                kid_info["completed_chores_monthly"] = 0
            LOGGER.info("Monthly chore counts have been reset.")
            self.async_set_updated_data(self._data)

    # ------------------ STORAGE ------------------
    def _persist(self):
        """Save to persistent storage."""
        self.storage_manager.set_data(self._data)
        self.hass.async_create_task(self.storage_manager.async_save())

    # ------------------ Helper Functions ------------------
    def _get_kid_id_by_name(self, kid_name: str) -> Optional[str]:
        """Helper function to get kid_id by kid_name."""
        for kid_id, kid_info in self.kids_data.items():
            if kid_info.get("name") == kid_name:
                return kid_id
        return None

    def _get_kid_name_by_id(self, kid_id: str) -> Optional[str]:
        """Helper function to get kid_name by kid_id."""
        kid_info = self.kids_data.get(kid_id)
        if kid_info:
            return kid_info.get("name")
        return None
