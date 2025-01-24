# File: config_flow.py
"""Multi-step config flow for the KidsChores integration, storing entities by internal_id.

Ensures that all add/edit/delete operations reference entities via internal_id for consistency.
"""

import datetime
import uuid
import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers import config_validation as cv
from homeassistant.util import dt as dt_util
from typing import Any, Optional

from .const import (
    DOMAIN,
    LOGGER,
    CONF_POINTS_LABEL,
    CONF_KIDS,
    CONF_CHORES,
    CONF_BADGES,
    CONF_REWARDS,
    CONF_PARENTS,
    CONF_PENALTIES,
    CONF_POINTS_ICON,
    DEFAULT_POINTS_ICON,
    DEFAULT_POINTS_LABEL,
)
from .flow_helpers import (
    build_kid_schema,
    build_parent_schema,
    build_chore_schema,
    build_badge_schema,
    build_reward_schema,
    build_penalty_schema,
    build_points_schema,
)


class KidsChoresConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Config Flow for KidsChores with internal_id-based entity management."""

    VERSION = 1

    def __init__(self) -> None:
        """Initialize the config flow."""
        self._data: dict[str, Any] = {}
        self._kids_temp: dict[str, dict[str, Any]] = {}
        self._parents_temp: dict[str, dict[str, Any]] = {}
        self._chores_temp: dict[str, dict[str, Any]] = {}
        self._badges_temp: dict[str, dict[str, Any]] = {}
        self._rewards_temp: dict[str, dict[str, Any]] = {}
        self._penalties_temp: dict[str, dict[str, Any]] = {}

        self._kid_count: int = 0
        self._parents_count: int = 0
        self._chore_count: int = 0
        self._badge_count: int = 0
        self._reward_count: int = 0
        self._penalty_count: int = 0

        self._kid_index: int = 0
        self._parents_index: int = 0
        self._chore_index: int = 0
        self._badge_index: int = 0
        self._reward_index: int = 0
        self._penalty_index: int = 0

    async def async_step_user(self, user_input: Optional[dict[str, Any]] = None):
        """Start the config flow with an intro step."""

        # Check if there's an existing KidsChores entry
        if any(self._async_current_entries()):
            return self.async_abort(reason="single_instance_allowed")

        # Continue your normal flow
        return await self.async_step_intro()

    async def async_step_intro(self, user_input=None):
        """Intro / welcome step. Press Next to continue."""
        if user_input is not None:
            return await self.async_step_points_label()

        return self.async_show_form(step_id="intro", data_schema=vol.Schema({}))

    async def async_step_points_label(self, user_input=None):
        """Let the user define a custom label for points."""
        errors = {}

        if user_input is not None:
            points_label = user_input.get(CONF_POINTS_LABEL, DEFAULT_POINTS_LABEL)
            points_icon = user_input.get(CONF_POINTS_ICON, DEFAULT_POINTS_ICON)

            self._data[CONF_POINTS_LABEL] = points_label
            self._data[CONF_POINTS_ICON] = points_icon

            return await self.async_step_kid_count()

        points_schema = build_points_schema(
            default_label=DEFAULT_POINTS_LABEL, default_icon=DEFAULT_POINTS_ICON
        )

        return self.async_show_form(
            step_id="points_label", data_schema=points_schema, errors=errors
        )

    # --------------------------------------------------------------------------
    # KIDS
    # --------------------------------------------------------------------------
    async def async_step_kid_count(self, user_input=None):
        """Ask how many kids to define initially."""
        errors = {}
        if user_input is not None:
            try:
                self._kid_count = int(user_input["kid_count"])
                if self._kid_count < 0:
                    raise ValueError
                if self._kid_count == 0:
                    return await self.async_step_chore_count()
                self._kid_index = 0
                return await self.async_step_kids()
            except ValueError:
                errors["base"] = "invalid_kid_count"

        schema = vol.Schema({vol.Required("kid_count", default=1): vol.Coerce(int)})
        return self.async_show_form(
            step_id="kid_count", data_schema=schema, errors=errors
        )

    async def async_step_kids(self, user_input=None):
        """Collect each kid's info using internal_id as the primary key.

        Store in self._kids_temp as a dict keyed by internal_id.
        """
        errors = {}
        if user_input is not None:
            kid_name = user_input["kid_name"].strip()
            ha_user_id = user_input.get("ha_user")

            if not kid_name:
                errors["kid_name"] = "invalid_kid_name"
            elif any(
                kid_data["name"] == kid_name for kid_data in self._kids_temp.values()
            ):
                errors["kid_name"] = "duplicate_kid"
            else:
                internal_id = user_input.get("internal_id", str(uuid.uuid4()))
                self._kids_temp[internal_id] = {
                    "name": kid_name,
                    "ha_user_id": ha_user_id,
                    "internal_id": internal_id,
                }
                LOGGER.debug("Added kid: %s with ID: %s", kid_name, internal_id)

            self._kid_index += 1
            if self._kid_index >= self._kid_count:
                return await self.async_step_parent_count()
            return await self.async_step_kids()

        # Retrieve HA users for linking
        users = await self.hass.auth.async_get_users()
        kid_schema = build_kid_schema(
            users=users, default_kid_name="", default_ha_user_id=None
        )
        return self.async_show_form(
            step_id="kids", data_schema=kid_schema, errors=errors
        )

    # --------------------------------------------------------------------------
    # PARENTS
    # --------------------------------------------------------------------------
    async def async_step_parent_count(self, user_input=None):
        """Ask how many parents to define initially."""
        errors = {}
        if user_input is not None:
            try:
                self._parents_count = int(user_input["parent_count"])
                if self._parents_count < 0:
                    raise ValueError
                if self._parents_count == 0:
                    return await self.async_step_chore_count()
                self._parents_index = 0
                return await self.async_step_parents()
            except ValueError:
                errors["base"] = "invalid_parent_count"

        schema = vol.Schema({vol.Required("parent_count", default=1): vol.Coerce(int)})
        return self.async_show_form(
            step_id="parent_count", data_schema=schema, errors=errors
        )

    async def async_step_parents(self, user_input=None):
        """Collect each parent's info using internal_id as the primary key.

        Store in self._parents_temp as a dict keyed by internal_id.
        """
        errors = {}
        if user_input is not None:
            parent_name = user_input["parent_name"].strip()
            ha_user_id = user_input.get("ha_user_id")
            associated_kids = user_input.get("associated_kids", [])

            if not parent_name:
                errors["parent_name"] = "invalid_parent_name"
            elif any(
                parent_data["name"] == parent_name
                for parent_data in self._parents_temp.values()
            ):
                errors["parent_name"] = "duplicate_parent"
            else:
                internal_id = user_input.get("internal_id", str(uuid.uuid4()))
                self._parents_temp[internal_id] = {
                    "name": parent_name,
                    "ha_user_id": ha_user_id,
                    "associated_kids": associated_kids,
                    "internal_id": internal_id,
                }
                LOGGER.debug("Added parent: %s with ID: %s", parent_name, internal_id)

            self._parents_index += 1
            if self._parents_index >= self._parents_count:
                return await self.async_step_chore_count()
            return await self.async_step_parents()

        # Retrieve kids for association from _kids_temp
        kids_dict = {
            kid_data["name"]: kid_id for kid_id, kid_data in self._kids_temp.items()
        }

        users = await self.hass.auth.async_get_users()

        parent_schema = build_parent_schema(
            users=users,
            kids_dict=kids_dict,
            default_parent_name="",
            default_ha_user_id=None,
            default_associated_kids=[],
            internal_id=None,
        )
        return self.async_show_form(
            step_id="parents", data_schema=parent_schema, errors=errors
        )

    # --------------------------------------------------------------------------
    # CHORES
    # --------------------------------------------------------------------------
    async def async_step_chore_count(self, user_input=None):
        """Ask how many chores to define."""
        errors = {}
        if user_input is not None:
            try:
                self._chore_count = int(user_input["chore_count"])
                if self._chore_count < 0:
                    raise ValueError
                if self._chore_count == 0:
                    return await self.async_step_badge_count()
                self._chore_index = 0
                return await self.async_step_chores()
            except ValueError:
                errors["base"] = "invalid_chore_count"

        schema = vol.Schema({vol.Required("chore_count", default=1): vol.Coerce(int)})
        return self.async_show_form(
            step_id="chore_count", data_schema=schema, errors=errors
        )

    async def async_step_chores(self, user_input=None):
        """Collect chore details using internal_id as the primary key.

        Store in self._chores_temp as a dict keyed by internal_id.
        """
        errors = {}

        if user_input is not None:
            chore_name = user_input["chore_name"].strip()
            internal_id = user_input.get("internal_id", str(uuid.uuid4()))

            if user_input.get("due_date"):
                raw_due = user_input["due_date"]
                # `raw_due` can be a datetime or a string
                if isinstance(raw_due, datetime.datetime):
                    # Convert to UTC
                    raw_due_utc = dt_util.as_utc(raw_due)
                    due_date_str = raw_due_utc.isoformat()
                else:
                    # It's a string -> parse it
                    try:
                        parsed = dt_util.parse_datetime(raw_due)
                        if not parsed:
                            # fallback parse
                            parsed = datetime.datetime.fromisoformat(raw_due)
                        due_date_str = dt_util.as_utc(parsed).isoformat()
                    except ValueError:
                        # If parse fails, store None or handle differently
                        due_date_str = None
            else:
                due_date_str = None

            if not chore_name:
                errors["chore_name"] = "invalid_chore_name"
            elif any(
                chore_data["name"] == chore_name
                for chore_data in self._chores_temp.values()
            ):
                errors["chore_name"] = "duplicate_chore"
            else:
                self._chores_temp[internal_id] = {
                    "name": chore_name,
                    "default_points": user_input["default_points"],
                    "partial_allowed": user_input["partial_allowed"],
                    "shared_chore": user_input["shared_chore"],
                    "assigned_kids": user_input["assigned_kids"],
                    "allow_multiple_claims_per_day": user_input[
                        "allow_multiple_claims_per_day"
                    ],
                    "description": user_input.get("chore_description", ""),
                    "icon": user_input.get("icon", ""),
                    "recurring_frequency": user_input.get(
                        "recurring_frequency", "none"
                    ),
                    "due_date": due_date_str,
                    "internal_id": internal_id,
                }
                LOGGER.debug("Added chore: %s with ID: %s", chore_name, internal_id)

            self._chore_index += 1
            if self._chore_index >= self._chore_count:
                return await self.async_step_badge_count()
            return await self.async_step_chores()

        # Use flow_helpers.build_chore_schema, passing the current kids
        kids_dict = {
            kid_data["name"]: kid_id for kid_id, kid_data in self._kids_temp.items()
        }
        default_data = {}
        chore_schema = build_chore_schema(kids_dict, default_data)
        return self.async_show_form(
            step_id="chores", data_schema=chore_schema, errors=errors
        )

    # --------------------------------------------------------------------------
    # BADGES
    # --------------------------------------------------------------------------
    async def async_step_badge_count(self, user_input=None):
        """Ask how many badges to define."""
        errors = {}
        if user_input is not None:
            try:
                self._badge_count = int(user_input["badge_count"])
                if self._badge_count < 0:
                    raise ValueError
                if self._badge_count == 0:
                    return await self.async_step_reward_count()
                self._badge_index = 0
                return await self.async_step_badges()
            except ValueError:
                errors["base"] = "invalid_badge_count"

        schema = vol.Schema({vol.Required("badge_count", default=1): vol.Coerce(int)})
        return self.async_show_form(
            step_id="badge_count", data_schema=schema, errors=errors
        )

    async def async_step_badges(self, user_input=None):
        """Collect badge details using internal_id as the primary key.

        Store in self._badges_temp as a dict keyed by internal_id.
        """
        errors = {}
        if user_input is not None:
            badge_name = user_input["badge_name"].strip()
            internal_id = user_input.get("internal_id", str(uuid.uuid4()))

            if not badge_name:
                errors["badge_name"] = "invalid_badge_name"
            elif any(
                badge_data["name"] == badge_name
                for badge_data in self._badges_temp.values()
            ):
                errors["badge_name"] = "duplicate_badge"
            else:
                self._badges_temp[internal_id] = {
                    "name": badge_name,
                    "threshold_type": user_input["threshold_type"],
                    "threshold_value": user_input["threshold_value"],
                    "points_multiplier": user_input["points_multiplier"],
                    "icon": user_input.get("icon", ""),
                    "internal_id": internal_id,
                    "description": user_input.get("badge_description", ""),
                }
                LOGGER.debug("Added badge: %s with ID: %s", badge_name, internal_id)

            self._badge_index += 1
            if self._badge_index >= self._badge_count:
                return await self.async_step_reward_count()
            return await self.async_step_badges()

        badge_schema = build_badge_schema()
        return self.async_show_form(
            step_id="badges", data_schema=badge_schema, errors=errors
        )

    # --------------------------------------------------------------------------
    # REWARDS
    # --------------------------------------------------------------------------
    async def async_step_reward_count(self, user_input=None):
        """Ask how many rewards to define."""
        errors = {}
        if user_input is not None:
            try:
                self._reward_count = int(user_input["reward_count"])
                if self._reward_count < 0:
                    raise ValueError
                if self._reward_count == 0:
                    return await self.async_step_penalty_count()
                self._reward_index = 0
                return await self.async_step_rewards()
            except ValueError:
                errors["base"] = "invalid_reward_count"

        schema = vol.Schema({vol.Required("reward_count", default=1): vol.Coerce(int)})
        return self.async_show_form(
            step_id="reward_count", data_schema=schema, errors=errors
        )

    async def async_step_rewards(self, user_input=None):
        """Collect reward details using internal_id as the primary key.

        Store in self._rewards_temp as a dict keyed by internal_id.
        """
        errors = {}
        if user_input is not None:
            reward_name = user_input["reward_name"].strip()
            internal_id = user_input.get("internal_id", str(uuid.uuid4()))

            if not reward_name:
                errors["reward_name"] = "invalid_reward_name"
            elif any(
                reward_data["name"] == reward_name
                for reward_data in self._rewards_temp.values()
            ):
                errors["reward_name"] = "duplicate_reward"
            else:
                self._rewards_temp[internal_id] = {
                    "name": reward_name,
                    "cost": user_input["reward_cost"],
                    "description": user_input.get("reward_description", ""),
                    "icon": user_input.get("icon", ""),
                    "internal_id": internal_id,
                }
                LOGGER.debug("Added reward: %s with ID: %s", reward_name, internal_id)

            self._reward_index += 1
            if self._reward_index >= self._reward_count:
                return await self.async_step_penalty_count()
            return await self.async_step_rewards()

        reward_schema = build_reward_schema()
        return self.async_show_form(
            step_id="rewards", data_schema=reward_schema, errors=errors
        )

    # --------------------------------------------------------------------------
    # PENALTIES
    # --------------------------------------------------------------------------
    async def async_step_penalty_count(self, user_input=None):
        """Ask how many penalties to define."""
        errors = {}
        if user_input is not None:
            try:
                self._penalty_count = int(user_input["penalty_count"])
                if self._penalty_count < 0:
                    raise ValueError
                if self._penalty_count == 0:
                    return await self.async_step_finish()
                self._penalty_index = 0
                return await self.async_step_penalties()
            except ValueError:
                errors["base"] = "invalid_penalty_count"

        schema = vol.Schema({vol.Required("penalty_count", default=1): vol.Coerce(int)})
        return self.async_show_form(
            step_id="penalty_count", data_schema=schema, errors=errors
        )

    async def async_step_penalties(self, user_input=None):
        """Collect penalty details using internal_id as the primary key.

        Store in self._penalties_temp as a dict keyed by internal_id.
        """
        errors = {}
        if user_input is not None:
            penalty_name = user_input["penalty_name"].strip()
            penalty_points = user_input["penalty_points"]
            internal_id = user_input.get("internal_id", str(uuid.uuid4()))

            if not penalty_name:
                errors["penalty_name"] = "invalid_penalty_name"
            elif any(
                penalty_data["name"] == penalty_name
                for penalty_data in self._penalties_temp.values()
            ):
                errors["penalty_name"] = "duplicate_penalty"
            else:
                self._penalties_temp[internal_id] = {
                    "name": penalty_name,
                    "description": user_input.get("penalty_description", ""),
                    "points": -abs(penalty_points),  # Ensure points are negative
                    "icon": user_input.get("icon", ""),
                    "internal_id": internal_id,
                }
                LOGGER.debug("Added penalty: %s with ID: %s", penalty_name, internal_id)

            self._penalty_index += 1
            if self._penalty_index >= self._penalty_count:
                return await self.async_step_finish()
            return await self.async_step_penalties()

        penalty_schema = build_penalty_schema()
        return self.async_show_form(
            step_id="penalties", data_schema=penalty_schema, errors=errors
        )

    # --------------------------------------------------------------------------
    # FINISH
    # --------------------------------------------------------------------------
    async def async_step_finish(self, user_input=None):
        """Finalize summary and create the config entry."""
        if user_input is not None:
            return self._create_entry()

        # Create a mapping from kid_id to kid_name for easy lookup
        kid_id_to_name = {
            kid_id: data["name"] for kid_id, data in self._kids_temp.items()
        }

        # Enhance parents summary to include associated kids by name
        parents_summary = []
        for parent in self._parents_temp.values():
            associated_kids_names = [
                kid_id_to_name.get(kid_id, "Unknown")
                for kid_id in parent.get("associated_kids", [])
            ]
            if associated_kids_names:
                kids_str = ", ".join(associated_kids_names)
                parents_summary.append(f"{parent['name']} (Kids: {kids_str})")
            else:
                parents_summary.append(parent["name"])

        summary = (
            f"Kids: {', '.join(kid_data['name'] for kid_data in self._kids_temp.values()) or 'None'}\n"
            f"Parents: {', '.join(parents_summary) or 'None'}\n"
            f"Chores: {', '.join(chore_data['name'] for chore_data in self._chores_temp.values()) or 'None'}\n"
            f"Badges: {', '.join(badge_data['name'] for badge_data in self._badges_temp.values()) or 'None'}\n"
            f"Rewards: {', '.join(reward_data['name'] for reward_data in self._rewards_temp.values()) or 'None'}\n"
            f"Penalties: {', '.join(penalty_data['name'] for penalty_data in self._penalties_temp.values()) or 'None'}"
        )
        return self.async_show_form(
            step_id="finish",
            data_schema=vol.Schema({}),
            description_placeholders={"summary": summary},
        )

    def _create_entry(self):
        """Finalize config entry with data and options using internal_id as keys."""
        entry_data = {}
        entry_options = {
            CONF_POINTS_LABEL: self._data.get(CONF_POINTS_LABEL, DEFAULT_POINTS_LABEL),
            CONF_POINTS_ICON: self._data.get(CONF_POINTS_ICON, DEFAULT_POINTS_ICON),
            CONF_KIDS: self._kids_temp,
            CONF_PARENTS: self._parents_temp,
            CONF_CHORES: self._chores_temp,
            CONF_BADGES: self._badges_temp,
            CONF_REWARDS: self._rewards_temp,
            CONF_PENALTIES: self._penalties_temp,
        }

        LOGGER.debug(
            "Creating entry with data=%s, options=%s", entry_data, entry_options
        )
        return self.async_create_entry(
            title="KidsChores", data=entry_data, options=entry_options
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        """Return the Options Flow."""
        from .options_flow import KidsChoresOptionsFlowHandler

        return KidsChoresOptionsFlowHandler(config_entry)
