# File: coordinator.py
"""Coordinator for the KidsChores integration.

Handles data synchronization, chore claiming and approval, badge tracking,
reward redemption, penalty application, and recurring chore handling.
Manages entities primarily using internal_id for consistency.
"""

import uuid
import copy
from datetime import datetime, timedelta
from calendar import monthrange
from typing import Any, Optional

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.event import async_track_time_change
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import (
    BADGE_THRESHOLD_TYPE_CHORE_COUNT,
    BADGE_THRESHOLD_TYPE_POINTS,
    CHORE_STATE_APPROVED,
    CHORE_STATE_CLAIMED,
    CHORE_STATE_OVERDUE,
    CHORE_STATE_PARTIAL,
    CHORE_STATE_PENDING,
    CONF_BADGES,
    CONF_CHORES,
    CONF_KIDS,
    CONF_PARENTS,
    CONF_PENALTIES,
    CONF_REWARDS,
    DATA_BADGES,
    DATA_CHORES,
    DATA_KIDS,
    DATA_PARENTS,
    DATA_PENALTIES,
    DATA_PENDING_CHORE_APPROVALS,
    DATA_PENDING_REWARD_APPROVALS,
    DATA_REWARDS,
    DEFAULT_BADGE_THRESHOLD,
    DEFAULT_DAILY_RESET_TIME,
    DEFAULT_ICON,
    DEFAULT_MONTHLY_RESET_DAY,
    DEFAULT_MULTIPLE_CLAIMS_PER_DAY,
    DEFAULT_PARTIAL_ALLOWED,
    DEFAULT_PENALTY_ICON,
    DEFAULT_PENALTY_POINTS,
    DEFAULT_POINTS,
    DEFAULT_REWARD_COST,
    DEFAULT_REWARD_ICON,
    DEFAULT_WEEKLY_RESET_DAY,
    DOMAIN,
    LOGGER,
    UPDATE_INTERVAL,
)


class KidsChoresDataCoordinator(DataUpdateCoordinator):
    """Coordinator for KidsChores integration.

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
        self._data: dict[str, Any] = {}

    async def _async_update_data(self):
        """Periodic update.

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
        """Load from storage and merge config options."""
        stored_data = self.storage_manager.get_data()
        self._data = (
            stored_data
            if stored_data
            else {
                DATA_KIDS: {},
                DATA_CHORES: {},
                DATA_BADGES: {},
                DATA_REWARDS: {},
                DATA_PARENTS: {},
                DATA_PENALTIES: {},
                DATA_PENDING_CHORE_APPROVALS: [],
                DATA_PENDING_REWARD_APPROVALS: [],
            }
        )

        # Register daily/weekly/monthly resets
        async_track_time_change(
            self.hass, self._reset_all_chore_counts, **DEFAULT_DAILY_RESET_TIME
        )

        self._initialize_data_from_config()
        self._persist()
        await super().async_config_entry_first_refresh()

    def _initialize_data_from_config(self):
        """Merge config_entry options with stored data structures using internal_id."""
        options = self.config_entry.options

        kids_dict = options.get(CONF_KIDS, {})
        parents_dict = options.get(CONF_PARENTS, {})
        chores_dict = options.get(CONF_CHORES, {})
        badges_dict = options.get(CONF_BADGES, {})
        rewards_dict = options.get(CONF_REWARDS, {})
        penalties_dict = options.get(CONF_PENALTIES, {})

        # Ensure minimal structure
        self._data.setdefault(DATA_KIDS, {})
        self._data.setdefault(DATA_PARENTS, {})
        self._data.setdefault(DATA_CHORES, {})
        self._data.setdefault(DATA_BADGES, {})
        self._data.setdefault(DATA_REWARDS, {})
        self._data.setdefault(DATA_PENALTIES, {})
        self._data.setdefault(DATA_PENDING_CHORE_APPROVALS, [])
        self._data.setdefault(DATA_PENDING_REWARD_APPROVALS, [])

        # --- Kids ---
        # Remove kids not present in options
        existing_kids = set(self._data[DATA_KIDS].keys())
        option_kids = set(kids_dict.keys())
        kids_to_remove = existing_kids - option_kids
        for kid_id in kids_to_remove:
            del self._data[DATA_KIDS][kid_id]
            LOGGER.debug(
                "Removed kid with ID '%s' as it's no longer in configuration", kid_id
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
                    "completed_chores_total": kid_data.get("completed_chores_total", 0),
                    "ha_user_id": kid_data.get("ha_user_id"),
                    "internal_id": kid_id,
                    "points_multiplier": kid_data.get("points_multiplier", 1.0),
                    "reward_claims": kid_data.get("reward_claims", {}),
                    "reward_approvals": kid_data.get("reward_approvals", {}),
                    "chore_claims": kid_data.get("chore_claims", {}),
                    "chore_approvals": kid_data.get("chore_approvals", {}),
                    "penalty_applies": kid_data.get("penalty_applies", {}),
                    "pending_rewards": kid_data.get("pending_rewards", []),
                    "redeemed_rewards": kid_data.get("redeemed_rewards", []),
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
                # Initialize 'redeemed_rewards' if missing
                existing.setdefault(
                    "redeemed_rewards", kid_data.get("redeemed_rewards", [])
                )
                existing.setdefault(
                    "points_multiplier", kid_data.get("points_multiplier", 1.0)
                )
                existing.setdefault("reward_claims", kid_data.get("reward_claims", {}))
                existing.setdefault(
                    "reward_approvals", kid_data.get("reward_approvals", {})
                )
                existing.setdefault("chore_claims", kid_data.get("chore_claims", {}))
                existing.setdefault(
                    "chore_approvals", kid_data.get("chore_approvals", {})
                )
                existing.setdefault(
                    "penalty_applies", kid_data.get("penalty_applies", {})
                )
                existing.setdefault(
                    "pending_rewards", kid_data.get("pending_rewards", [])
                )
                existing.setdefault(
                    "completed_chores_total", kid_data.get("completed_chores_total", 0)
                )

                # Points and other historical data should not be overwritten

        # --- Parents ---
        existing_parents = set(self._data[DATA_PARENTS].keys())
        option_parents = set(parents_dict.keys())
        parents_to_remove = existing_parents - option_parents
        for parent_id in parents_to_remove:
            del self._data[DATA_PARENTS][parent_id]
            LOGGER.debug(
                "Removed parent with ID '%s' as it's no longer in configuration",
                parent_id,
            )

        # Add or update parents from options
        for parent_id, parent_data in parents_dict.items():
            if parent_id not in self._data[DATA_PARENTS]:
                # Add new parent
                self._data[DATA_PARENTS][parent_id] = {
                    "name": parent_data.get("name", ""),
                    "ha_user_id": parent_data.get("ha_user_id", ""),
                    "associated_kids": parent_data.get("associated_kids", []),
                    "internal_id": parent_id,
                }
                LOGGER.debug(
                    "Added new parent '%s' with ID: %s",
                    self._data[DATA_PARENTS][parent_id]["name"],
                    parent_id,
                )
            else:
                # Update existing parent's editable fields
                existing = self._data[DATA_PARENTS][parent_id]
                existing["name"] = parent_data.get("name", existing["name"])
                existing["ha_user_id"] = parent_data.get(
                    "ha_user_id", existing["ha_user_id"]
                )
                existing["associated_kids"] = parent_data.get(
                    "associated_kids", existing["associated_kids"]
                )
                # Ensure kid_ids are valid
                valid_kids = []
                for kid_id in existing["associated_kids"]:
                    if kid_id in self.kids_data:
                        valid_kids.append(kid_id)
                    else:
                        LOGGER.warning(
                            "Parent '%s': Kid ID '%s' not found. Removing from parent's kid list.",
                            existing["name"],
                            kid_id,
                        )
                existing["associated_kids"] = valid_kids

        # --- Chores ---
        existing_chores = set(self._data[DATA_CHORES].keys())
        option_chores = set(chores_dict.keys())
        chores_to_remove = existing_chores - option_chores
        for chore_id in chores_to_remove:
            del self._data[DATA_CHORES][chore_id]
            LOGGER.debug(
                "Removed chore with ID '%s' as it's no longer in configuration",
                chore_id,
            )

        # Add or update chores from options
        for chore_id, chore_data in chores_dict.items():
            if chore_id not in self._data[DATA_CHORES]:
                # Add new chore
                assigned_kids_names = chore_data.get("assigned_kids", [])
                assigned_kids_ids = []
                for kid_name in assigned_kids_names:
                    kid_id = self._get_kid_id_by_name(kid_name)
                    if kid_id:
                        assigned_kids_ids.append(kid_id)
                    else:
                        LOGGER.warning(
                            "Chore '%s': Kid name '%s' not found. Skipping assignment",
                            chore_data.get("name", chore_id),
                            kid_name,
                        )

                self._data[DATA_CHORES][chore_id] = {
                    "name": chore_data.get("name", ""),
                    "state": chore_data.get("state", CHORE_STATE_PENDING),
                    "assigned_to": chore_data.get("assigned_to"),
                    "default_points": chore_data.get("default_points", DEFAULT_POINTS),
                    "allow_multiple_claims_per_day": chore_data.get(
                        "allow_multiple_claims_per_day", DEFAULT_MULTIPLE_CLAIMS_PER_DAY
                    ),
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
                existing["allow_multiple_claims_per_day"] = chore_data.get(
                    "allow_multiple_claims_per_day",
                    existing["allow_multiple_claims_per_day"],
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
                            "Chore '%s': Kid name '%s' not found. Skipping assignment",
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

        # --- Badges ---
        existing_badges = set(self._data[DATA_BADGES].keys())
        option_badges = set(badges_dict.keys())
        badges_to_remove = existing_badges - option_badges
        for badge_id in badges_to_remove:
            del self._data[DATA_BADGES][badge_id]
            LOGGER.debug(
                "Removed badge with ID '%s' as it's no longer in configuration",
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
                    "points_multiplier": badge_data.get("points_multiplier", 1.0),
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
                existing["points_multiplier"] = badge_data.get(
                    "points_multiplier", existing["points_multiplier"]
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
                "Removed reward with ID '%s' as it's no longer in configuration",
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
                "Removed penalty with ID '%s' as it's no longer in configuration",
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
        """Return the kids data."""
        return self._data.get(DATA_KIDS, {})

    @property
    def parents_data(self):
        """Return the parents data."""
        return self._data.get(DATA_PARENTS, {})

    @property
    def chores_data(self):
        """Return the chores data."""
        return self._data.get(DATA_CHORES, {})

    @property
    def badges_data(self):
        """Return the badges data."""
        return self._data.get(DATA_BADGES, {})

    @property
    def rewards_data(self):
        """Return the rewards data."""
        return self._data.get(DATA_REWARDS, {})

    @property
    def penalties_data(self):
        """Return the penalties data."""
        return self._data.get(DATA_PENALTIES, {})

    # ------------------ PARENTS ------------------
    def add_parent(self, parent_def: dict):
        """Add new parent at runtime if needed."""
        parent_name = parent_def.get("name")
        ha_user_id = parent_def.get("ha_user_id")
        kid_ids = parent_def.get("associated_kids", [])  # Updated key

        if not parent_name or not ha_user_id:
            LOGGER.warning("Add parent: Parent must have a name and ha_user_id")
            return

        # Check if parent already exists based on ha_user_id
        if any(
            parent_data["ha_user_id"] == ha_user_id
            for parent_data in self.parents_data.values()
        ):
            LOGGER.warning(
                "Add parent: Parent with ha_user_id '%s' already exists", ha_user_id
            )
            return

        # Validate kid_ids
        valid_kids = []
        for kid_id in kid_ids:
            if kid_id in self.kids_data:
                valid_kids.append(kid_id)
            else:
                LOGGER.warning(
                    "Add parent: Kid ID '%s' not found. Skipping assignment to parent '%s'.",
                    kid_id,
                    parent_name,
                )

        internal_id = str(uuid.uuid4())
        self.parents_data[internal_id] = {
            "name": parent_name,
            "ha_user_id": ha_user_id,
            "associated_kids": valid_kids,
            "internal_id": internal_id,
        }
        LOGGER.debug("Added new parent '%s' with ID: %s", parent_name, internal_id)
        self._persist()
        self.async_set_updated_data(self._data)

    def remove_parent(self, parent_id: str):
        """Remove a parent by ID."""
        if parent_id in self.parents_data:
            parent_name = self.parents_data[parent_id]["name"]
            del self.parents_data[parent_id]
            LOGGER.debug("Removed parent '%s' with ID: %s", parent_name, parent_id)
            self._persist()
            self.async_set_updated_data(self._data)
        else:
            LOGGER.warning("Remove parent: Parent ID '%s' not found", parent_id)

    # ------------------ CHORES ------------------

    def approve_chore(
        self,
        parent_name: str,
        kid_id: str,
        chore_id: str,
        points_awarded: Optional[float] = None,
    ):
        """Approve a chore for kid_id if assigned."""
        LOGGER.debug(
            "Attempting to approve chore ID '%s' for kid ID '%s' by parent '%s'",
            chore_id,
            kid_id,
            parent_name,
        )
        if chore_id not in self.chores_data:
            LOGGER.warning("Approve chore: Chore ID '%s' not found", chore_id)
            raise HomeAssistantError(f"Chore with ID '{chore_id}' not found.")

        chore_info = self.chores_data[chore_id]
        if kid_id not in chore_info.get("assigned_kids", []):
            LOGGER.warning(
                "Approve chore: Chore ID '%s' not assigned to kid ID '%s'",
                chore_id,
                kid_id,
            )
            raise HomeAssistantError(
                f"Chore '{chore_info.get('name')}' is not assigned to kid '{self.kids_data[kid_id]['name']}'."
            )

        kid_info = self.kids_data.get(kid_id)
        if not kid_info:
            LOGGER.warning("Approve chore: Kid ID '%s' not found", kid_id)
            raise HomeAssistantError(f"Kid with ID '{kid_id}' not found.")

        # Check if multiple approvals are allowed for this chore
        if not chore_info.get("allow_multiple_claims_per_day", False):
            if chore_id in kid_info.get("approved_chores", []):
                error_message = f"Chore '{chore_info['name']}' has already been approved today and multiple approvals are not allowed."
                LOGGER.warning(
                    "Chore ID '%s' has already been approved today by kid ID '%s' and multiple approvals are not allowed.",
                    chore_id,
                    kid_id,
                )
                raise HomeAssistantError(error_message)

        default_points = chore_info.get("default_points", DEFAULT_POINTS)
        multiplier = kid_info.get("points_multiplier", 1.0)
        awarded = (
            points_awarded * multiplier
            if points_awarded is not None
            else default_points * multiplier
        )

        if chore_info.get("shared_chore", False):
            # For shared chores, set global state to approved if any kid approves
            if chore_info["state"] != CHORE_STATE_APPROVED:
                chore_info["state"] = CHORE_STATE_APPROVED
                LOGGER.debug(
                    "Chore ID '%s' is a shared chore. Global state set to '%s' due to approval by kid ID '%s'.",
                    chore_id,
                    CHORE_STATE_APPROVED,
                    kid_id,
                )
        else:
            # For non-shared chores, approve for this specific kid
            if chore_id in kid_info.get("claimed_chores", []):
                # If chore was claimed by kid, move to approved
                kid_info["claimed_chores"].remove(chore_id)
                kid_info.setdefault("approved_chores", []).append(chore_id)
                chore_info["state"] = CHORE_STATE_APPROVED
                LOGGER.debug(
                    "Chore ID '%s' approved for kid ID '%s'. Removed from claimed and added to approved chores. New state: '%s'",
                    chore_id,
                    kid_id,
                    CHORE_STATE_APPROVED,
                )
            else:
                # Direct approval by parent; set state to approved and add to approved_chores
                chore_info["state"] = CHORE_STATE_APPROVED
                if chore_id not in kid_info.get("approved_chores", []):
                    kid_info.setdefault("approved_chores", []).append(chore_id)
                    LOGGER.debug(
                        "Chore ID '%s' directly approved by parent '%s' for kid ID '%s'. Added to approved chores. New state: '%s'",
                        chore_id,
                        parent_name,
                        kid_id,
                        CHORE_STATE_APPROVED,
                    )
                else:
                    LOGGER.debug(
                        "Chore ID '%s' already in approved chores for kid ID '%s'.",
                        chore_id,
                        kid_id,
                    )

        # Move chore from claimed to approved for the kid (for shared chores as well)
        if chore_id in kid_info.get("claimed_chores", []):
            kid_info["claimed_chores"].remove(chore_id)
            LOGGER.debug(
                "Chore ID '%s' removed from claimed_chores for kid ID '%s'.",
                chore_id,
                kid_id,
            )
        if chore_id not in kid_info.get("approved_chores", []):
            kid_info.setdefault("approved_chores", []).append(chore_id)
            LOGGER.debug(
                "Chore ID '%s' added to approved_chores for kid ID '%s'.",
                chore_id,
                kid_id,
            )

        # Award points with multiplier
        kid_info["points"] += awarded
        kid_info["completed_chores_today"] += 1
        kid_info["completed_chores_weekly"] += 1
        kid_info["completed_chores_monthly"] += 1
        kid_info["completed_chores_total"] += 1

        LOGGER.debug(
            "Awarded %s points to kid ID '%s'. Total points: %s, Total chores: %s",
            awarded,
            kid_id,
            kid_info["points"],
            kid_info["completed_chores_total"],
        )

        # Also check badges after awarding
        self._check_badges_for_kid(kid_id)

        chore_info["last_completed"] = datetime.now().isoformat()
        LOGGER.debug(
            "Updated 'last_completed' for chore ID '%s' to '%s'",
            chore_id,
            chore_info["last_completed"],
        )

        # Remove from pending approvals
        self._data[DATA_PENDING_CHORE_APPROVALS] = [
            approval
            for approval in self._data[DATA_PENDING_CHORE_APPROVALS]
            if not (approval["kid_id"] == kid_id and approval["chore_id"] == chore_id)
        ]
        LOGGER.debug(
            "Removed chore ID '%s' for kid ID '%s' from pending approvals.",
            chore_id,
            kid_id,
        )

        # Increment chore_approvals counter
        if chore_id in kid_info["chore_approvals"]:
            kid_info["chore_approvals"][chore_id] += 1
        else:
            kid_info["chore_approvals"][chore_id] = 1
        LOGGER.debug(
            "Chore '%s' approved %d time(s) for kid '%s'.",
            chore_id,
            kid_info["chore_approvals"][chore_id],
            kid_id,
        )

        # Persist
        self._persist()
        self.async_set_updated_data(self._data)
        LOGGER.debug(
            "Chore ID '%s' approval process completed. State: '%s', Points Awarded: %s",
            chore_id,
            chore_info["state"],
            awarded,
        )

    def claim_chore(self, kid_id: str, chore_id: str, user_name: str):
        """Kid claims chore => state=claimed; parent must then approve."""
        if chore_id not in self.chores_data:
            LOGGER.warning("Chore ID '%s' not found for claim", chore_id)
            raise HomeAssistantError(f"Chore with ID '{chore_id}' not found.")

        chore_info = self.chores_data[chore_id]
        if kid_id not in chore_info.get("assigned_kids", []):
            LOGGER.warning(
                "Claim chore: Chore ID '%s' not assigned to kid ID '%s'",
                chore_id,
                kid_id,
            )
            raise HomeAssistantError(
                f"Chore '{chore_info.get('name')}' is not assigned to kid '{self.kids_data[kid_id]['name']}'."
            )

        kid_info = self.kids_data.get(kid_id)
        if not kid_info:
            LOGGER.warning("Claim chore: Kid ID '%s' not found", kid_id)
            raise HomeAssistantError(f"Kid with ID '{kid_id}' not found.")

        # Check if multiple claims are allowed for this kid
        if not chore_info.get("allow_multiple_claims_per_day", False):
            if chore_id in kid_info.get(
                "claimed_chores", []
            ) or chore_id in kid_info.get("approved_chores", []):
                error_message = f"Chore '{chore_info['name']}' has already been claimed today and multiple claims are not allowed."
                LOGGER.warning(
                    "Chore ID '%s' has already been claimed or approved today by kid ID '%s' and multiple claims are not allowed.",
                    chore_id,
                    kid_id,
                )
                raise HomeAssistantError(error_message)

        if chore_info.get("shared_chore", False):
            # For shared chores, allow each kid to claim independently
            # Chore state should reflect if any kid has claimed it
            chore_info["state"] = (
                CHORE_STATE_CLAIMED  # Reflect that at least one kid has claimed it
            )
            LOGGER.debug(
                "Chore ID '%s' claimed by kid ID '%s' as a shared chore. Chore state set to '%s'",
                chore_id,
                kid_id,
                CHORE_STATE_CLAIMED,
            )
        else:
            # For non-shared chores, add to kid's claimed chores
            if chore_id not in kid_info.get("claimed_chores", []):
                kid_info.setdefault("claimed_chores", []).append(chore_id)
                LOGGER.debug(
                    "Chore ID '%s' claimed by kid ID '%s'. Added to claimed chores.",
                    chore_id,
                    kid_id,
                )
            else:
                LOGGER.debug(
                    "Chore ID '%s' already claimed by kid ID '%s'",
                    chore_id,
                    kid_id,
                )

        # Update last_claimed timestamp
        chore_info["last_claimed"] = datetime.now().isoformat()

        # Increment chore_claims counter
        if chore_id in kid_info["chore_claims"]:
            kid_info["chore_claims"][chore_id] += 1
        else:
            kid_info["chore_claims"][chore_id] = 1
        LOGGER.debug(
            "Chore '%s' claimed %d time(s) by kid '%s'",
            chore_id,
            kid_info["chore_claims"][chore_id],
            kid_id,
        )

        # Add to pending approvals
        self._data[DATA_PENDING_CHORE_APPROVALS].append(
            {
                "kid_id": kid_id,
                "chore_id": chore_id,
                "timestamp": datetime.now().isoformat(),
            }
        )
        LOGGER.debug(
            "Added chore ID '%s' for kid ID '%s' to pending approvals.",
            chore_id,
            kid_id,
        )

        # Persist
        self._persist()
        self.async_set_updated_data(self._data)

    def disapprove_chore(self, parent_name: str, kid_id: str, chore_id: str):
        """Disapprove a chore for kid_id."""
        chore_info = self.chores_data.get(chore_id)
        if not chore_info:
            LOGGER.warning("Disapprove chore: Chore ID '%s' not found", chore_id)
            raise HomeAssistantError(f"Chore with ID '{chore_id}' not found.")

        kid_info = self.kids_data.get(kid_id)
        if not kid_info:
            LOGGER.warning("Disapprove chore: Kid ID '%s' not found", kid_id)
            raise HomeAssistantError(f"Kid with ID '{kid_id}' not found.")

        # Remove the chore from the kid's approved_chores
        if chore_id in kid_info.get("approved_chores", []):
            kid_info["approved_chores"].remove(chore_id)
            LOGGER.debug(
                "Chore ID '%s' removed from approved_chores for kid ID '%s'.",
                chore_id,
                kid_id,
            )

        # If shared chore, check if any other kid has approved it
        if chore_info.get("shared_chore", False):
            other_approvals = any(
                chore_id in other_kid.get("approved_chores", [])
                for other_kid_id, other_kid in self.kids_data.items()
                if other_kid_id != kid_id
            )
            if not other_approvals:
                # No other approvals, set global state to pending
                chore_info["state"] = CHORE_STATE_PENDING
                LOGGER.debug(
                    "No other approvals for shared chore ID '%s'. Global state set to '%s'.",
                    chore_id,
                    CHORE_STATE_PENDING,
                )
            else:
                # At least one other approval exists; keep global state as approved
                LOGGER.debug(
                    "Other approvals exist for shared chore ID '%s'. Global state remains '%s'.",
                    chore_id,
                    CHORE_STATE_APPROVED,
                )
        else:
            # For non-shared chores, set global state to pending
            chore_info["state"] = CHORE_STATE_PENDING
            LOGGER.debug(
                "Chore ID '%s' is not shared. Global state set to '%s' due to disapproval by kid ID '%s'.",
                chore_id,
                CHORE_STATE_PENDING,
                kid_id,
            )

        # Remove from pending approvals
        self._data[DATA_PENDING_CHORE_APPROVALS] = [
            approval
            for approval in self._data[DATA_PENDING_CHORE_APPROVALS]
            if not (approval["kid_id"] == kid_id and approval["chore_id"] == chore_id)
        ]
        LOGGER.debug(
            "Removed chore ID '%s' for kid ID '%s' from pending approvals after disapproval.",
            chore_id,
            kid_id,
        )

        # Persist changes
        self._persist()
        self.async_set_updated_data(self._data)

    def update_chore_state(self, chore_id: str, state: str):
        """Manually override a chore's state."""
        chore_info = self.chores_data.get(chore_id)
        if not chore_info:
            LOGGER.warning("Update chore state: Chore ID '%s' not found", chore_id)
            return

        chore_info["state"] = state
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
            days_in_month = monthrange(now.year, now.month)[1]
            reset_day = min(DEFAULT_MONTHLY_RESET_DAY, days_in_month)
            if now.day > reset_day:
                # Move to next month
                year = now.year + (now.month // 12)
                month = (now.month % 12) + 1
                try:
                    next_due = now.replace(year=year, month=month, day=reset_day)
                except ValueError:
                    # In case reset_day exceeds the number of days in the next month
                    next_due = now.replace(year=year, month=month, day=days_in_month)
            else:
                # Ensure the next_due is in the future
                if now.day < reset_day:
                    next_due = now.replace(day=reset_day)
                else:
                    # If today is the reset_day, set to next month
                    year = now.year + (now.month // 12)
                    month = (now.month % 12) + 1
                    try:
                        next_due = now.replace(year=year, month=month, day=reset_day)
                    except ValueError:
                        next_due = now.replace(
                            year=year, month=month, day=days_in_month
                        )
        else:
            return

        # Ensure next_due is always in the future
        if next_due <= now:
            if freq == "daily":
                next_due += timedelta(days=1)
            elif freq == "weekly":
                next_due += timedelta(weeks=1)
            elif freq == "monthly":
                days_in_next_month = monthrange(next_due.year, next_due.month)[1]
                next_due += timedelta(days=days_in_next_month)

        chore_info["state"] = CHORE_STATE_PENDING
        chore_info["assigned_to"] = None
        chore_info["due_date"] = next_due.isoformat()

        LOGGER.debug(
            f"Chore ID '{chore_info['internal_id']}' recurring frequency '{freq}' updated to next due date '{chore_info['due_date']}'"
        )

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
                    LOGGER.info("Chore ID '%s' is overdue", c_id)

    # ------------------ REWARDS ------------------
    def update_kid_points(self, kid_id: str, points: int):
        """Manually set a kid's points."""
        kid_info = self.kids_data.get(kid_id)
        if not kid_info:
            LOGGER.warning("Update kid points: Kid ID '%s' not found", kid_id)
            return
        kid_info["points"] = points
        self._check_badges_for_kid(kid_id)  # Check if awarding badges
        self._persist()
        self.async_set_updated_data(self._data)

    def redeem_reward(self, parent_name: str, kid_id: str, reward_id: str):
        """Kid claims a reward => mark as pending approval without deducting points."""
        reward = self.rewards_data.get(reward_id)
        if not reward:
            LOGGER.warning("Redeem Reward: Reward ID '%s' not found", reward_id)
            return

        kid_info = self.kids_data.get(kid_id)
        if not kid_info:
            LOGGER.warning("Redeem Reward: Kid ID '%s' not found", kid_id)
            return

        cost = reward.get("cost", 0)

        if kid_info["points"] < cost:
            LOGGER.warning(
                "Redeem Reward: Kid ID '%s' does not have enough points", kid_id
            )
            raise HomeAssistantError(
                f"'{kid_info['name']}' does not have enough points ({cost} needed)"
            )

        # Mark reward as pending approval
        kid_info.setdefault("pending_rewards", []).append(reward_id)

        # Initialize redeemed_rewards if not present
        kid_info.setdefault("redeemed_rewards", [])

        # Notify parent for approval asynchronously
        self.hass.async_create_task(
            self.notify_parent_for_reward_approval(kid_id, reward_id)
        )

        LOGGER.info(
            "Reward '%s' claimed by kid '%s' and pending approval by parent '%s'.",
            reward["name"],
            kid_info["name"],
            parent_name,
        )

        # Add to pending approvals
        self._data[DATA_PENDING_REWARD_APPROVALS].append(
            {
                "kid_id": kid_id,
                "reward_id": reward_id,
                "timestamp": datetime.now().isoformat(),
            }
        )

        # Increment reward_claims counter
        if reward_id in kid_info["reward_claims"]:
            kid_info["reward_claims"][reward_id] += 1
        else:
            kid_info["reward_claims"][reward_id] = 1
        LOGGER.debug(
            "Reward '%s' claimed %d time(s) by kid '%s'.",
            reward_id,
            kid_info["reward_claims"][reward_id],
            kid_id,
        )

        LOGGER.debug(
            "Added reward ID '%s' for kid ID '%s' to pending approvals.",
            reward_id,
            kid_id,
        )

        # Persist changes
        self._persist()
        self.async_set_updated_data(self._data)

    def approve_reward(self, parent_name: str, kid_id: str, reward_id: str):
        """Parent approves the reward redemption => deduct points."""
        kid_info = self.kids_data.get(kid_id)
        if not kid_info:
            LOGGER.warning("Approve Reward: Kid ID '%s' not found", kid_id)
            raise HomeAssistantError(f"Kid with ID '{kid_id}' not found.")

        reward = self.rewards_data.get(reward_id)
        if not reward:
            LOGGER.warning("Approve Reward: Reward ID '%s' not found", reward_id)
            raise HomeAssistantError(f"Reward with ID '{reward_id}' not found.")

        cost = reward.get("cost", 0)

        if reward_id in kid_info.get("pending_rewards", []):
            # Reward is pending approval
            if kid_info["points"] < cost:
                LOGGER.warning(
                    "Approve Reward: Kid ID '%s' does not have enough points for reward '%s'",
                    kid_id,
                    reward["name"],
                )
                raise HomeAssistantError(
                    f"'{kid_info['name']}' does not have enough points to redeem '{reward['name']}'."
                )

            # Deduct points
            kid_info["points"] -= cost
            # Remove from pending rewards
            kid_info["pending_rewards"].remove(reward_id)
            # Add to redeemed rewards
            kid_info["redeemed_rewards"].append(reward_id)

            LOGGER.info(
                "Reward '%s' approved for kid '%s' by parent '%s'. Points deducted: %s",
                reward["name"],
                kid_info["name"],
                parent_name,
                cost,
            )
        else:
            # Direct approval by parent without kid claiming
            if kid_info["points"] < cost:
                LOGGER.warning(
                    "Approve Reward (Direct): Kid ID '%s' does not have enough points for reward '%s'",
                    kid_id,
                    reward["name"],
                )
                raise HomeAssistantError(
                    f"'{kid_info['name']}' does not have enough points to redeem '{reward['name']}'."
                )

            # Deduct points
            kid_info["points"] -= cost
            # Add to redeemed rewards
            kid_info["redeemed_rewards"].append(reward_id)

            LOGGER.info(
                "Reward '%s' directly approved for kid '%s' by parent '%s'. Points deducted: %s",
                reward["name"],
                kid_info["name"],
                parent_name,
                cost,
            )

        # Check badges after deduction
        self._check_badges_for_kid(kid_id)

        # Remove from pending approvals
        self._data[DATA_PENDING_REWARD_APPROVALS] = [
            approval
            for approval in self._data[DATA_PENDING_REWARD_APPROVALS]
            if not (approval["kid_id"] == kid_id and approval["reward_id"] == reward_id)
        ]
        LOGGER.debug(
            "Removed reward ID '%s' for kid ID '%s' from pending approvals.",
            reward_id,
            kid_id,
        )

        # Increment reward_approvals counter
        if reward_id in kid_info["reward_approvals"]:
            kid_info["reward_approvals"][reward_id] += 1
        else:
            kid_info["reward_approvals"][reward_id] = 1
        LOGGER.debug(
            "Reward '%s' approved %d time(s) for kid '%s'.",
            reward_id,
            kid_info["reward_approvals"][reward_id],
            kid_id,
        )

        # Persist changes
        self._persist()
        self.async_set_updated_data(self._data)

    def disapprove_reward(self, parent_name: str, kid_id: str, reward_id: str):
        """Disapprove a reward for kid_id."""
        # Remove from pending rewards
        self._data[DATA_PENDING_REWARD_APPROVALS] = [
            approval
            for approval in self._data[DATA_PENDING_REWARD_APPROVALS]
            if not (approval["kid_id"] == kid_id and approval["reward_id"] == reward_id)
        ]
        LOGGER.debug(
            "Removed reward ID '%s' for kid ID '%s' from pending approvals after disapproval.",
            reward_id,
            kid_id,
        )

        # Remove from the kid's 'pending_rewards' list
        kid_info = self.kids_data.get(kid_id)
        if kid_info and reward_id in kid_info.get("pending_rewards", []):
            kid_info["pending_rewards"].remove(reward_id)
            LOGGER.debug(
                "Removed reward ID '%s' from kid ID '%s' pending_rewards after disapproval.",
                reward_id,
                kid_id,
            )

        # Persist changes
        self._persist()
        self.async_set_updated_data(self._data)

    # ------------------ BADGES ------------------
    def _update_kid_multiplier(self, kid_id: str):
        """Update the kid's points multiplier based on highest badge achieved."""
        kid_info = self.kids_data.get(kid_id)
        if not kid_info:
            return

        # Find all badges earned by the kid
        earned_badges = [
            badge
            for badge in self.badges_data.values()
            if kid_id in badge.get("earned_by", [])
        ]

        if not earned_badges:
            kid_info["points_multiplier"] = 1.0
            return

        # Determine the highest multiplier among earned badges
        highest_multiplier = max(
            badge.get("points_multiplier", 1.0) for badge in earned_badges
        )

        kid_info["points_multiplier"] = highest_multiplier

        LOGGER.debug(
            "Updated points multiplier for kid ID '%s' to %s",
            kid_id,
            highest_multiplier,
        )

    def _check_badges_for_kid(self, kid_id: str):
        """Evaluate all badge thresholds for kid.

        - If threshold met (points or chore_count), mark as earned.
        - Once earned, do not remove even if points go below threshold again.
        """
        kid_info = self.kids_data.get(kid_id)
        if not kid_info:
            return

        for badge_id, badge_data in self.badges_data.items():
            if kid_id in badge_data.get("earned_by", []):
                continue  # Skip already earned badges

            threshold_type = badge_data.get("threshold_type")
            threshold_value = badge_data.get("threshold_value", 0)

            if threshold_type == BADGE_THRESHOLD_TYPE_POINTS:
                if kid_info["points"] >= threshold_value:
                    self._award_badge(kid_id, badge_id)
            elif threshold_type == BADGE_THRESHOLD_TYPE_CHORE_COUNT:
                chore_count_type = badge_data.get("chore_count_type", "daily")
                if chore_count_type == "total":
                    chore_count = kid_info.get("completed_chores_total", 0)
                else:
                    chore_count = kid_info.get(
                        f"completed_chores_{chore_count_type}", 0
                    )
                if chore_count >= threshold_value:
                    self._award_badge(kid_id, badge_id)

    def _award_badge(self, kid_id: str, badge_id: str):
        """Add the badge to kid's 'earned_by' and kid's 'badges' list."""
        badge = self.badges_data.get(badge_id)
        if not badge:
            LOGGER.error(
                "Attempted to award non-existent badge ID '%s' to kid ID '%s'",
                badge_id,
                kid_id,
            )
            return

        if kid_id in badge.get("earned_by", []):
            LOGGER.debug("Kid ID '%s' already earned badge ID '%s'", kid_id, badge_id)
            return

        badge.setdefault("earned_by", []).append(kid_id)
        kid_info = self.kids_data.get(kid_id)
        if kid_info:
            kid_info.setdefault("badges", []).append(badge["name"])
            LOGGER.info(
                "Badge '%s' awarded to kid '%s' (ID: '%s')",
                badge["name"],
                kid_info["name"],
                kid_id,
            )

            # Update kid's multiplier based on the highest badge achieved
            self._update_kid_multiplier(kid_id)

            self._persist()
            self.async_set_updated_data(self._data)
        else:
            LOGGER.error("Cannot award badge: Kid ID '%s' not found", kid_id)

    def add_badge(self, badge_def: dict):
        """Add new badge at runtime if needed."""
        badge_name = badge_def.get("name")
        if not badge_name:
            LOGGER.warning("Add badge: Badge must have a name")
            return
        if any(
            badge_data["name"] == badge_name for badge_data in self.badges_data.values()
        ):
            LOGGER.warning("Add badge: Badge '%s' already exists", badge_name)
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
            "chore_count_type": badge_def.get(
                "chore_count_type",
                "daily",  # New Field for flexibility
            ),
            "earned_by": [],
            "points_multiplier": badge_def.get("points_multiplier", 1.0),
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
            LOGGER.warning("Apply penalty: Penalty ID '%s' not found", penalty_id)
            return

        kid_info = self.kids_data.get(kid_id)
        if not kid_info:
            LOGGER.warning("Apply penalty: Kid ID '%s' not found", kid_id)
            return

        delta = penalty.get("points", 0)
        kid_info["points"] += delta  # typically negative
        self._check_badges_for_kid(kid_id)

        # Increment penalty_applies counter
        if penalty_id in kid_info["penalty_applies"]:
            kid_info["penalty_applies"][penalty_id] += 1
        else:
            kid_info["penalty_applies"][penalty_id] = 1
        LOGGER.debug(
            "Penalty '%s' applied %d time(s) to kid '%s'.",
            penalty_id,
            kid_info["penalty_applies"][penalty_id],
            kid_id,
        )

        # Persist changes
        self._persist()
        self.async_set_updated_data(self._data)

    def add_penalty(self, penalty_def: dict):
        """Add new penalty at runtime if needed."""
        penalty_name = penalty_def.get("name")
        if not penalty_name:
            LOGGER.warning("Add penalty: Penalty must have a name")
            return
        if any(
            penalty_data["name"] == penalty_name
            for penalty_data in self.penalties_data.values()
        ):
            LOGGER.warning("Add penalty: Penalty '%s' already exists", penalty_name)
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
    async def _reset_all_chore_counts(self, now: datetime):
        """
        Trigger resets based on the current time for all frequencies.

        Args:
            now (datetime): The current datetime.
        """
        await self._reset_chore_counts("daily", now)
        await self._reset_chore_counts("weekly", now)
        await self._reset_chore_counts("monthly", now)

    async def _reset_chore_counts(self, frequency: str, now: datetime):
        """
        Reset chore counts and statuses based on the recurring frequency.

        Args:
            frequency (str): The frequency type ('daily', 'weekly', 'monthly').
            now (datetime): The current datetime.
        """

        # Determine which chores to reset based on frequency
        if frequency == "daily":
            target_frequencies = ["daily", "none"]
            reset_day_check = True
        elif frequency == "weekly":
            target_frequencies = ["weekly"]
            reset_day_check = now.weekday() == DEFAULT_WEEKLY_RESET_DAY
        elif frequency == "monthly":
            target_frequencies = ["monthly"]
            days_in_month = monthrange(now.year, now.month)[1]
            reset_day = min(DEFAULT_MONTHLY_RESET_DAY, days_in_month)
            reset_day_check = now.day == reset_day
        else:
            LOGGER.warning(f"Unknown frequency '{frequency}'. No resets performed.")
            return

        if not reset_day_check:
            LOGGER.debug(f"No reset needed for frequency '{frequency}' today.")
            return

        # Reset counts for the specified frequency
        for kid_id, kid_info in self.kids_data.items():
            if frequency == "daily":
                kid_info["completed_chores_today"] = 0
            elif frequency == "weekly":
                kid_info["completed_chores_weekly"] = 0
            elif frequency == "monthly":
                kid_info["completed_chores_monthly"] = 0

        LOGGER.info(f"{frequency.capitalize()} chore counts have been reset")

        # Reset chore statuses and clear approvals only for daily resets
        if frequency == "daily":
            await self._reset_daily_chore_statuses(target_frequencies)

        # Update due dates for recurring chores
        for chore_id, chore_info in self.chores_data.items():
            if chore_info.get("recurring_frequency") == frequency:
                self._handle_recurring_chore(chore_info)

        # Persist the changes
        self._persist()

        # Create a deep copy to ensure changes are detected
        new_data = copy.deepcopy(self._data)

        # Update the coordinator's data with the new copy
        self.async_set_updated_data(new_data)

        LOGGER.debug(
            f"{frequency.capitalize()} chore counts have been updated in the coordinator."
        )

    async def _reset_daily_chore_statuses(self, target_frequencies: list):
        """
        Reset chore statuses and clear approved/claimed chores for daily resets.

        Args:
            target_frequencies (list): Frequencies of chores to reset (e.g., ["daily", "none"]).
        """
        LOGGER.info("Executing _reset_daily_chore_statuses")

        # Reset chore statuses and clear approved/claimed chores for chores with specified frequencies
        for chore_id, chore_info in self.chores_data.items():
            if chore_info.get("recurring_frequency") in target_frequencies:
                if chore_info["state"] not in [
                    CHORE_STATE_PENDING,
                    CHORE_STATE_OVERDUE,
                ]:
                    previous_state = chore_info["state"]
                    chore_info["state"] = CHORE_STATE_PENDING
                    LOGGER.debug(
                        "Resetting status of chore ID '%s' from '%s' to '%s'",
                        chore_id,
                        previous_state,
                        CHORE_STATE_PENDING,
                    )

                    # Remove chore_id from all kids' approved_chores and claimed_chores
                    for kid_id, kid_info in self.kids_data.items():
                        if chore_id in kid_info.get("approved_chores", []):
                            kid_info["approved_chores"].remove(chore_id)
                            LOGGER.debug(
                                "Removed chore ID '%s' from approved_chores for kid ID '%s'",
                                chore_id,
                                kid_id,
                            )
                        if chore_id in kid_info.get("claimed_chores", []):
                            kid_info["claimed_chores"].remove(chore_id)
                            LOGGER.debug(
                                "Removed chore ID '%s' from claimed_chores for kid ID '%s'",
                                chore_id,
                                kid_id,
                            )

        LOGGER.info(
            "Chore statuses, approved_chores, and claimed_chores have been reset for daily chores"
        )

        # Clear pending chore approvals for chores with 'daily' or 'none' frequency
        daily_chore_ids = [
            chore_id
            for chore_id, chore_info in self.chores_data.items()
            if chore_info.get("recurring_frequency") in ["daily", "none"]
        ]
        self._data[DATA_PENDING_CHORE_APPROVALS] = [
            approval
            for approval in self._data[DATA_PENDING_CHORE_APPROVALS]
            if approval["chore_id"] not in daily_chore_ids
        ]
        LOGGER.debug(
            "Cleared pending chore approvals for chores with 'daily' or 'none' frequency."
        )

        # Persist all changes
        self._persist()

    # ------------------ STORAGE ------------------
    def _persist(self):
        """Save to persistent storage."""
        self.storage_manager.set_data(self._data)
        self.hass.async_create_task(self.storage_manager.async_save())

    # ------------------ NOTIFICATION ------------------

    async def notify_parent_for_reward_approval(self, kid_id: str, reward_id: str):
        """Send a notification to the parent requesting reward approval."""
        kid_info = self.kids_data.get(kid_id)
        reward_info = self.rewards_data.get(reward_id)

        if not kid_info or not reward_info:
            LOGGER.warning(
                "Notification: Kid ID '%s' or Reward ID '%s' not found",
                kid_id,
                reward_id,
            )
            return

        parent_user_id = kid_info.get("ha_user_id")
        if not parent_user_id:
            LOGGER.warning(
                "Notification: Parent user ID for kid '%s' not set.",
                kid_info.get("name"),
            )
            return

        parent_user = await self.hass.auth.async_get_user(parent_user_id)
        if not parent_user:
            LOGGER.warning(
                "Notification: Parent user with ID '%s' not found.",
                parent_user_id,
            )
            return

        # Define the notification message
        message = (
            f"Kid '{kid_info['name']}' has claimed the reward '{reward_info['name']}'. "
            f"Please approve the redemption."
        )
        title = "KidsChores: Reward Approval Needed"

        # Send the notification
        await self.hass.components.persistent_notification.async_create(
            self.hass,
            message,
            title=title,
            notification_id=f"reward_approval_{reward_id}_{kid_id}",
        )

        LOGGER.debug(
            "Sent reward approval notification for reward '%s' claimed by kid '%s'.",
            reward_info["name"],
            kid_info["name"],
        )

    # ------------------ Helper Functions ------------------
    def _get_kid_id_by_name(self, kid_name: str) -> Optional[str]:
        """Help function to get kid_id by kid_name."""
        for kid_id, kid_info in self.kids_data.items():
            if kid_info.get("name") == kid_name:
                return kid_id
        return None

    def _get_kid_name_by_id(self, kid_id: str) -> Optional[str]:
        """Help function to get kid_name by kid_id."""
        kid_info = self.kids_data.get(kid_id)
        if kid_info:
            return kid_info.get("name")
        return None
