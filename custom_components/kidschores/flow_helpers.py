# File: flow_helpers.py
"""Helpers for the KidsChores integration's Config and Options flow.

Provides schema builders and input-processing logic for internal_id-based management.
"""

import uuid
import voluptuous as vol
from homeassistant.helpers import selector, config_validation as cv

from .const import (
    CONF_POINTS_LABEL,
    CONF_POINTS_ICON,
    DEFAULT_POINTS_LABEL,
    DEFAULT_POINTS_ICON,
)


def build_points_schema(
    default_label=DEFAULT_POINTS_LABEL, default_icon=DEFAULT_POINTS_ICON
):
    """Build a schema for points label & icon."""
    return vol.Schema(
        {
            vol.Required(CONF_POINTS_LABEL, default=default_label): str,
            vol.Optional(
                CONF_POINTS_ICON, default=default_icon
            ): selector.IconSelector(),
        }
    )


def build_kid_schema(
    users, default_kid_name="", default_ha_user_id=None, internal_id=None
):
    """Build a Voluptuous schema for adding/editing a Kid, keyed by internal_id in the dict."""
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


def build_parent_schema(
    users,
    kids_dict,
    default_parent_name="",
    default_ha_user_id=None,
    default_associated_kids=None,
    internal_id=None,
):
    """Build a Voluptuous schema for adding/editing a Parent, keyed by internal_id in the dict."""
    user_options = [{"value": user.id, "label": user.name} for user in users]
    kid_options = [
        {"value": kid_id, "label": kid_name} for kid_name, kid_id in kids_dict.items()
    ]

    return vol.Schema(
        {
            vol.Required("parent_name", default=default_parent_name): str,
            vol.Optional("ha_user_id"): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=user_options,
                    mode=selector.SelectSelectorMode.DROPDOWN,
                    multiple=False,
                )
            ),
            vol.Optional(
                "associated_kids", default=default_associated_kids or []
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=kid_options,
                    translation_key="associated_kids",
                    multiple=True,
                )
            ),
            vol.Optional("internal_id", default=internal_id or str(uuid.uuid4())): str,
        }
    )


def build_chore_schema(kids_dict, default=None):
    """Build a schema for chores, referencing existing kids by name.

    Uses internal_id for entity management.
    """
    default = default or {}
    chore_name_default = default.get("name", "")
    internal_id_default = default.get("internal_id", str(uuid.uuid4()))

    kid_choices = {k: k for k in kids_dict}

    return vol.Schema(
        {
            vol.Required("chore_name", default=chore_name_default): str,
            vol.Optional(
                "chore_description", default=default.get("description", "")
            ): str,
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
                "allow_multiple_claims_per_day",
                default=default.get("allow_multiple_claims_per_day", False),
            ): bool,
            vol.Required(
                "partial_allowed", default=default.get("partial_allowed", False)
            ): bool,
            vol.Optional(
                "icon", default=default.get("icon", "")
            ): selector.IconSelector(),
            vol.Required(
                "recurring_frequency",
                default=default.get("recurring_frequency", "none"),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=["none", "daily", "weekly", "monthly"],
                    translation_key="recurring_frequency",
                )
            ),
            vol.Optional(
                "due_date", default=default.get("due_date")
            ): selector.DateTimeSelector(),
            vol.Optional("internal_id", default=internal_id_default): str,
        }
    )


def build_badge_schema(default=None):
    """Build a schema for badges, keyed by internal_id in the dict."""
    default = default or {}
    badge_name_default = default.get("name", "")
    internal_id_default = default.get("internal_id", str(uuid.uuid4()))
    points_multiplier_default = default.get("points_multiplier", 1.0)

    return vol.Schema(
        {
            vol.Required("badge_name", default=badge_name_default): str,
            vol.Optional(
                "badge_description", default=default.get("description", "")
            ): str,
            vol.Required(
                "threshold_type",
                default=default.get("threshold_type", "points"),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=["points", "chore_count"],
                    translation_key="threshold_type",
                )
            ),
            vol.Required(
                "threshold_value", default=default.get("threshold_value", 10)
            ): vol.Coerce(float),
            vol.Required(
                "points_multiplier",
                default=points_multiplier_default,
            ): vol.All(vol.Coerce(float), vol.Range(min=1.0)),
            vol.Optional(
                "icon", default=default.get("icon", "")
            ): selector.IconSelector(),
            vol.Optional("internal_id", default=internal_id_default): str,
        }
    )


def build_reward_schema(default=None):
    """Build a schema for rewards, keyed by internal_id in the dict."""
    default = default or {}
    reward_name_default = default.get("name", "")
    internal_id_default = default.get("internal_id", str(uuid.uuid4()))

    return vol.Schema(
        {
            vol.Required("reward_name", default=reward_name_default): str,
            vol.Optional(
                "reward_description", default=default.get("description", "")
            ): str,
            vol.Required("reward_cost", default=default.get("cost", 10.0)): vol.Coerce(
                float
            ),
            vol.Optional(
                "icon", default=default.get("icon", "")
            ): selector.IconSelector(),
            vol.Optional("internal_id", default=internal_id_default): str,
        }
    )


def build_penalty_schema(default=None):
    """Build a schema for penalties, keyed by internal_id in the dict.

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
            vol.Optional(
                "penalty_description", default=default.get("description", "")
            ): str,
            vol.Required("penalty_points", default=display_points): vol.All(
                vol.Coerce(float), vol.Range(min=0.1)
            ),
            vol.Optional(
                "icon", default=default.get("icon", "")
            ): selector.IconSelector(),
            vol.Optional("internal_id", default=internal_id_default): str,
        }
    )


def process_penalty_form_input(user_input: dict) -> dict:
    """Ensure penalty points are negative internally."""
    data = dict(user_input)
    data["points"] = -abs(data["penalty_points"])
    return data
