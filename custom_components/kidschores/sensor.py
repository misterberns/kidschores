# File: sensor.py
"""
Sensors for KidsChores integration, including:
1) KidPointsSensor - total points
2) CompletedChoresDailySensor/Weekly/Monthly
3) KidBadgesSensor - number of badges
4) ChoreStatusSensor - textual state for each (kid, chore)
5) KidHighestBadgeSensor - textual name & icon for the highest earned badge
"""

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.components.sensor import SensorEntity
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import (
    DOMAIN,
    LOGGER,
    SENSOR_TYPE_POINTS,
    SENSOR_TYPE_COMPLETED_DAILY,
    SENSOR_TYPE_COMPLETED_WEEKLY,
    SENSOR_TYPE_COMPLETED_MONTHLY,
    SENSOR_TYPE_BADGES,
    LABEL_POINTS,
    LABEL_BADGES,
    LABEL_COMPLETED_DAILY,
    LABEL_COMPLETED_WEEKLY,
    LABEL_COMPLETED_MONTHLY,
    DEFAULT_CHORE_SENSOR_ICON,
    DEFAULT_TROPHY_ICON,
    DEFAULT_TROPHY_OUTLINE,
    CONF_POINTS_LABEL,
    DEFAULT_POINTS_LABEL,
)
from .coordinator import KidsChoresDataCoordinator


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities
):
    """
    Setup sensors for:
    - Kid points
    - Completed chores daily/weekly/monthly
    - Kid badges (# of badges)
    - Highest badge sensor
    - A ChoreStatusSensor for each (kid, chore).
    """
    data = hass.data[DOMAIN][entry.entry_id]
    coordinator: KidsChoresDataCoordinator = data["coordinator"]

    points_label = entry.data.get(CONF_POINTS_LABEL, DEFAULT_POINTS_LABEL)
    entities = []

    # 1) For each kid, add standard sensors
    for kid_id, kid_info in coordinator.kids_data.items():
        kid_name = kid_info.get("name", f"Kid {kid_id}")
        entities.append(
            KidPointsSensor(coordinator, entry, kid_id, kid_name, points_label)
        )
        entities.append(
            CompletedChoresDailySensor(coordinator, entry, kid_id, kid_name)
        )
        entities.append(
            CompletedChoresWeeklySensor(coordinator, entry, kid_id, kid_name)
        )
        entities.append(
            CompletedChoresMonthlySensor(coordinator, entry, kid_id, kid_name)
        )
        entities.append(KidBadgesSensor(coordinator, entry, kid_id, kid_name))
        entities.append(KidHighestBadgeSensor(coordinator, entry, kid_id, kid_name))

    # 2) For each chore assigned to each kid, add a ChoreStatusSensor
    for chore_id, chore_info in coordinator.chores_data.items():
        chore_name = chore_info.get("name", f"Chore {chore_id}")
        assigned_kids_ids = chore_info.get("assigned_kids", [])
        for kid_id in assigned_kids_ids:
            kid_name = coordinator._get_kid_name_by_id(kid_id) or f"Kid {kid_id}"
            entities.append(
                ChoreStatusSensor(
                    coordinator, entry, kid_id, kid_name, chore_id, chore_name
                )
            )

    async_add_entities(entities)


class ChoreStatusSensor(CoordinatorEntity, SensorEntity):
    """
    Textual sensor for chore status: pending/claimed/approved/etc.
    One sensor per (kid, chore).
    """

    def __init__(self, coordinator, entry, kid_id, kid_name, chore_id, chore_name):
        super().__init__(coordinator)
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._chore_id = chore_id
        self._chore_name = chore_name
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_{chore_id}_status"
        self._attr_name = f"{kid_name} - Status - {chore_name}"

    @property
    def native_value(self):
        """
        Return the chore's state based on shared or individual tracking.
        """
        chore_info = self.coordinator.chores_data.get(self._chore_id, {})
        shared = chore_info.get("shared_chore", False)

        if shared:
            return chore_info.get("state", "unknown")
        else:
            # For non-shared chores, determine state based on kid's lists
            kid_info = self.coordinator.kids_data.get(self._kid_id, {})
            if self._chore_id in kid_info.get("approved_chores", []):
                return "approved"
            elif self._chore_id in kid_info.get("claimed_chores", []):
                return "claimed"
            else:
                return "pending"

    @property
    def extra_state_attributes(self):
        """
        Include points, description, etc.
        """
        chore_info = self.coordinator.chores_data.get(self._chore_id, {})
        shared = chore_info.get("shared_chore", False)

        attributes = {
            "kid_name": self._kid_name,
            "chore_name": self._chore_name,
            "shared_chore": shared,
            "due_date": chore_info.get("due_date", "Not Set"),
            "default_points": chore_info.get("default_points", 0),
            "description": chore_info.get("description", ""),
        }

        if shared:
            attributes["state"] = chore_info.get("state", "unknown")
        else:
            kid_info = self.coordinator.kids_data.get(self._kid_id, {})
            if self._chore_id in kid_info.get("approved_chores", []):
                attributes["state"] = "approved"
            elif self._chore_id in kid_info.get("claimed_chores", []):
                attributes["state"] = "claimed"
            else:
                attributes["state"] = "pending"

        return attributes

    @property
    def icon(self):
        """Use the chore's custom icon if set, else fallback."""
        chore_info = self.coordinator.chores_data.get(self._chore_id, {})
        return chore_info.get("icon", DEFAULT_CHORE_SENSOR_ICON)


class KidPointsSensor(CoordinatorEntity, SensorEntity):
    """Sensor for a kid's total points balance."""

    def __init__(self, coordinator, entry, kid_id, kid_name, points_label):
        super().__init__(coordinator)
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._points_label = points_label
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_points"
        self._attr_name = f"{kid_name} - {self._points_label}"
        self._attr_state_class = "measurement"

    @property
    def native_value(self):
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        return kid_info.get("points", 0)

    @property
    def native_unit_of_measurement(self):
        return self._points_label or LABEL_POINTS


class CompletedChoresDailySensor(CoordinatorEntity, SensorEntity):
    """How many chores kid completed today."""

    def __init__(self, coordinator, entry, kid_id, kid_name):
        super().__init__(coordinator)
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_completed_daily"
        self._attr_name = f"{kid_name} - Chores Completed Today"

    @property
    def native_value(self):
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        return kid_info.get("completed_chores_today", 0)


class CompletedChoresWeeklySensor(CoordinatorEntity, SensorEntity):
    """How many chores kid completed this week."""

    def __init__(self, coordinator, entry, kid_id, kid_name):
        super().__init__(coordinator)
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_completed_weekly"
        self._attr_name = f"{kid_name} - Chores Completed This Week"

    @property
    def native_value(self):
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        return kid_info.get("completed_chores_weekly", 0)


class CompletedChoresMonthlySensor(CoordinatorEntity, SensorEntity):
    """How many chores kid completed this month."""

    def __init__(self, coordinator, entry, kid_id, kid_name):
        super().__init__(coordinator)
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_completed_monthly"
        self._attr_name = f"{kid_name} - Chores Completed This Month"

    @property
    def native_value(self):
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        return kid_info.get("completed_chores_monthly", 0)


class KidBadgesSensor(CoordinatorEntity, SensorEntity):
    """
    Sensor: number of badges earned + attribute with the list.
    """

    def __init__(self, coordinator, entry, kid_id, kid_name):
        super().__init__(coordinator)
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_badges"
        self._attr_name = f"{kid_name} - Badges Earned"

    @property
    def native_value(self):
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        return len(kid_info.get("badges", []))

    @property
    def extra_state_attributes(self):
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        return {"badges": kid_info.get("badges", [])}


class KidHighestBadgeSensor(CoordinatorEntity, SensorEntity):
    """
    Sensor that returns the "highest" badge the kid currently has,
    based on the threshold_value in coordinator.badges_data.

    - If the kid has no badges, the sensor is "None".
    - If multiple badges are tied for the highest threshold, it picks one with that top threshold.
    """

    def __init__(self, coordinator, entry, kid_id, kid_name):
        super().__init__(coordinator)
        self._entry = entry
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_highest_badge"
        self._attr_name = f"{kid_name} - Highest Badge"

    def _find_highest_badge(self):
        """
        Helper: Determine which badge from kid_info['badges']
        has the highest 'threshold_value'. Return (badge_name, threshold_value).

        If none, returns (None, -1).
        """
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        earned_badge_names = kid_info.get("badges", [])

        highest_badge = None
        highest_value = -1

        for badge_name in earned_badge_names:
            # Find badge by name
            badge_data = next(
                (
                    info
                    for bid, info in self.coordinator.badges_data.items()
                    if info.get("name") == badge_name
                ),
                None,
            )
            if not badge_data:
                continue  # skip if not found or invalid

            threshold_val = badge_data.get("threshold_value", 0)
            if threshold_val > highest_value:
                highest_value = threshold_val
                highest_badge = badge_name

        return highest_badge, highest_value

    @property
    def native_value(self) -> str:
        """
        Return the badge name of the highest-threshold badge the kid has earned.
        If the kid has none, return "None".
        """
        highest_badge, _ = self._find_highest_badge()
        return highest_badge if highest_badge else "None"

    @property
    def icon(self):
        """
        Return the icon for the highest badge. Fall back if none found.
        """
        highest_badge, _ = self._find_highest_badge()
        if highest_badge:
            badge_data = next(
                (
                    info
                    for bid, info in self.coordinator.badges_data.items()
                    if info.get("name") == highest_badge
                ),
                {},
            )
            return badge_data.get("icon", DEFAULT_TROPHY_ICON)
        return DEFAULT_TROPHY_OUTLINE

    @property
    def extra_state_attributes(self):
        """
        Provide additional details:
        - kid_name
        - all_earned_badges
        - highest_badge_threshold_value
        """
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        highest_badge, highest_val = self._find_highest_badge()

        return {
            "kid_name": self._kid_name,
            "all_earned_badges": kid_info.get("badges", []),
            "highest_badge_threshold_value": highest_val if highest_badge else 0,
        }
