# File: flow_helpers.py
"""
Helpers for the KidsChores integration's Config and Options flow.
Provides schema builders and input-processing logic for internal_id-based management.
"""

import uuid
import voluptuous as vol
from homeassistant.helpers import selector, config_validation as cv
from .const import LOGGER


def build_kid_schema(
    users, default_kid_name="", default_ha_user_id=None, internal_id=None
):
    """
    Builds a Voluptuous schema for adding/editing a Kid, keyed by internal_id in the dict.
    """
    user_options = [{"value": user.id, "label": user.name} for user in users]

    return vol.Schema(
        {
            vol.Required("kid_name", default=default_kid_name): str,
            vol.Optional("ha_user"): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=user_options,
                    mode=selector.SelectSelectorMode.DROPDOWN,
                    multiple=False,
                )
            ),
            vol.Optional("internal_id", default=internal_id or str(uuid.uuid4())): str,
        }
    )


def build_chore_schema(kids_dict, default=None):
    """
    Builds a schema for chores, referencing existing kids by name.
    Uses internal_id for entity management.
    """
    default = default or {}
    chore_name_default = default.get("name", "")
    internal_id_default = default.get("internal_id", str(uuid.uuid4()))

    # Build kid choices without "__ALL__"
    kid_choices = {k: k for k in kids_dict.keys()}

    return vol.Schema(
        {
            vol.Required("chore_name", default=chore_name_default): str,
            vol.Optional("internal_id", default=internal_id_default): str,
            vol.Required(
                "default_points", default=default.get("default_points", 5)
            ): vol.Coerce(float),
            vol.Required(
                "assigned_kids", default=default.get("assigned_kids", [])
            ): cv.multi_select(kid_choices),
            vol.Required(
                "shared_chore", default=default.get("shared_chore", False)
            ): bool,
            vol.Required(
                "partial_allowed", default=default.get("partial_allowed", False)
            ): bool,
            vol.Optional(
                "chore_description", default=default.get("description", "")
            ): str,
            vol.Optional(
                "icon", default=default.get("icon", "")
            ): selector.IconSelector(),
            vol.Required(
                "recurring_frequency",
                default=default.get("recurring_frequency", "none"),
            ): vol.In(["none", "daily", "weekly", "monthly"]),
            vol.Optional("due_date"): selector.DateTimeSelector(),
        }
    )


def build_badge_schema(default=None):
    """
    Builds a schema for badges, keyed by internal_id in the dict.
    """
    default = default or {}
    badge_name_default = default.get("name", "")
    internal_id_default = default.get("internal_id", str(uuid.uuid4()))

    return vol.Schema(
        {
            vol.Required("badge_name", default=badge_name_default): str,
            vol.Optional("internal_id", default=internal_id_default): str,
            vol.Required(
                "threshold_type", default=default.get("threshold_type", "points")
            ): vol.In(["points", "chore_count"]),
            vol.Required(
                "threshold_value", default=default.get("threshold_value", 10)
            ): vol.Coerce(float),
            vol.Optional(
                "icon", default=default.get("icon", "")
            ): selector.IconSelector(),
        }
    )


def build_reward_schema(default=None):
    """
    Builds a schema for rewards, keyed by internal_id in the dict.
    """
    default = default or {}
    reward_name_default = default.get("name", "")
    internal_id_default = default.get("internal_id", str(uuid.uuid4()))

    return vol.Schema(
        {
            vol.Required("reward_name", default=reward_name_default): str,
            vol.Optional("internal_id", default=internal_id_default): str,
            vol.Required("reward_cost", default=default.get("cost", 10.0)): vol.Coerce(
                float
            ),
            vol.Optional(
                "reward_description", default=default.get("description", "")
            ): str,
            vol.Optional(
                "icon", default=default.get("icon", "")
            ): selector.IconSelector(),
        }
    )


def build_penalty_schema(default=None):
    """
    Builds a schema for penalties, keyed by internal_id in the dict.
    Stores penalty_points as positive in the form, converted to negative internally.
    """
    default = default or {}
    penalty_name_default = default.get("name", "")
    internal_id_default = default.get("internal_id", str(uuid.uuid4()))

    # Display penalty points as positive for user input
    display_points = abs(default.get("points", 1)) if default else 1

    return vol.Schema(
        {
            vol.Required("penalty_name", default=penalty_name_default): str,
            vol.Optional("internal_id", default=internal_id_default): str,
            vol.Required("penalty_points", default=display_points): vol.All(
                vol.Coerce(float), vol.Range(min=0.1)
            ),
            vol.Optional(
                "icon", default=default.get("icon", "")
            ): selector.IconSelector(),
        }
    )


def process_penalty_form_input(user_input: dict) -> dict:
    """
    Ensure penalty points are negative internally.
    """
    data = dict(user_input)
    data["points"] = -abs(data["penalty_points"])
    return data
