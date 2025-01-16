# File: binary_sensor.py
"""Binary sensors for KidsChores integration.

Includes:
- ChoreStatusBinarySensor: True if a chore is approved for a kid or globally (if shared).
- BadgeEarnedBinarySensor: True if a kid has earned at least one badge.

"""

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import (
    DOMAIN,
    CHORE_STATE_PENDING,
    CHORE_STATE_CLAIMED,
    CHORE_STATE_APPROVED,
    DEFAULT_CHORE_BINARY_ICON,
    DEFAULT_BADGE_BINARY_ICON,
)
from .coordinator import KidsChoresDataCoordinator


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities
):
    """Set up binary sensors for each (kid, chore) and for each kid's "any badges" status."""
    data = hass.data[DOMAIN][entry.entry_id]
    coordinator: KidsChoresDataCoordinator = data["coordinator"]

    entities = []

    # For each chore, create a binary sensor for each assigned kid
    for chore_id, chore_info in coordinator.chores_data.items():
        chore_name = chore_info.get("name", f"Chore {chore_id}")
        assigned_kids_ids = chore_info.get("assigned_kids", [])
        for kid_id in assigned_kids_ids:
            kid_name = coordinator._get_kid_name_by_id(kid_id) or f"Kid {kid_id}"
            entities.append(
                ChoreStatusBinarySensor(
                    coordinator, entry, kid_id, kid_name, chore_id, chore_name
                )
            )

    # For each kid, add a "has any badge" binary sensor
    for kid_id, kid_info in coordinator.kids_data.items():
        kid_name = kid_info.get("name", f"Kid {kid_id}")
        entities.append(BadgeEarnedBinarySensor(coordinator, entry, kid_id, kid_name))

    async_add_entities(entities)


class ChoreStatusBinarySensor(CoordinatorEntity, BinarySensorEntity):
    """Binary sensor => True if the chore is approved for the kid or globally (if shared)."""

    def __init__(self, coordinator, entry, kid_id, kid_name, chore_id, chore_name):
        """Initialize the binary sensor."""
        super().__init__(coordinator)
        self._entry = entry
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._chore_id = chore_id
        self._chore_name = chore_name

        # Unique ID & name based on internal IDs for uniqueness
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_{chore_id}_binary"
        self._attr_name = f"{kid_name} - Chore Status - {chore_name}"

    @property
    def is_on(self) -> bool:
        """Return True if the chore is approved (shared) or approved for the specific kid."""
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        return self._chore_id in kid_info.get("approved_chores", [])

    @property
    def extra_state_attributes(self):
        """Provide chore details for the sensor's attributes."""
        chore_info = self.coordinator.chores_data.get(self._chore_id, {})
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})

        # Determine the individual kid's chore state
        kid_state = "pending"
        if self._chore_id in kid_info.get("approved_chores", []):
            kid_state = "approved"
        elif self._chore_id in kid_info.get("claimed_chores", []):
            kid_state = "claimed"

        # Retrieve the global chore state
        global_state = chore_info.get("state", "unknown")

        attributes = {
            "kid_name": self._kid_name,
            "chore_name": self._chore_name,
            "shared_chore": chore_info.get("shared_chore", False),
            "kid_state": kid_state,
            "global_state": global_state,
            "due_date": chore_info.get("due_date", "Not Set"),
            "default_points": chore_info.get("default_points", 0),
            "description": chore_info.get("description", ""),
        }

        return attributes

    @property
    def icon(self):
        """Return the chore's custom icon if set, else fallback."""
        chore_info = self.coordinator.chores_data.get(self._chore_id, {})
        return chore_info.get("icon", DEFAULT_CHORE_BINARY_ICON)

    @property
    def translation_key(self):
        """Return the translation key for the chore state."""
        return "chore_claim_bs"


class BadgeEarnedBinarySensor(CoordinatorEntity, BinarySensorEntity):
    """Binary sensor => True if kid has at least one badge in kid_info["badges"]."""

    def __init__(self, coordinator, entry, kid_id, kid_name):
        """Initialize the binary sensor."""
        super().__init__(coordinator)
        self._entry = entry
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_any_badge"
        self._attr_name = f"{kid_name} - Badges Earned"

    @property
    def is_on(self) -> bool:
        """Return True if the kid has any badge in 'badges' list."""
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        earned = kid_info.get("badges", [])
        return len(earned) > 0

    @property
    def extra_state_attributes(self):
        """Provide the list of badges the kid has earned."""
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        return {"badges": kid_info.get("badges", [])}

    @property
    def icon(self):
        """Return the default badge icon."""
        return DEFAULT_BADGE_BINARY_ICON

    @property
    def translation_key(self):
        """Return the translation key for the chore state."""
        return "badges_earned_bs"
