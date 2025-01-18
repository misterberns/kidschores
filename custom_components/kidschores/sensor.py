# File: sensor.py
"""Sensors for KidsChores integration.

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
    ATTR_ALL_EARNED_BADGES,
    ATTR_BADGES,
    ATTR_CLAIMED_ON,
    ATTR_CHORE_NAME,
    ATTR_DEFAULT_POINTS,
    ATTR_DESCRIPTION,
    ATTR_DUE_DATE,
    ATTR_GLOBAL_STATE,
    ATTR_HIGHEST_BADGE_THRESHOLD_VALUE,
    ATTR_KID_NAME,
    ATTR_KID_STATE,
    ATTR_REDEEMED_ON,
    ATTR_REWARD_NAME,
    ATTR_SHARED_CHORE,
    CHORE_STATE_APPROVED,
    CHORE_STATE_CLAIMED,
    CHORE_STATE_OVERDUE,
    CHORE_STATE_PARTIAL,
    CHORE_STATE_PENDING,
    CHORE_STATE_UNKNOWN,
    CONF_POINTS_ICON,
    CONF_POINTS_LABEL,
    DATA_PENDING_CHORE_APPROVALS,
    DATA_PENDING_REWARD_APPROVALS,
    DEFAULT_CHORE_SENSOR_ICON,
    DEFAULT_POINTS_ICON,
    DEFAULT_POINTS_LABEL,
    DEFAULT_TROPHY_ICON,
    DEFAULT_TROPHY_OUTLINE,
    DOMAIN,
    DUE_DATE_NOT_SET,
    LABEL_POINTS,
    UNKNOWN_CHORE,
    UNKNOWN_KID,
    UNKNOWN_REWARD,
)
from .coordinator import KidsChoresDataCoordinator


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities
):
    """Set up sensors for KidsChores integration.

    - Kid points
    - Completed chores daily/weekly/monthly
    - Kid badges (# of badges)
    - Highest badge sensor
    - A ChoreStatusSensor for each (kid, chore).
    """
    data = hass.data[DOMAIN][entry.entry_id]
    coordinator: KidsChoresDataCoordinator = data["coordinator"]

    points_label = entry.options.get(CONF_POINTS_LABEL, DEFAULT_POINTS_LABEL)
    points_icon = entry.options.get(CONF_POINTS_ICON, DEFAULT_POINTS_ICON)
    entities = []

    entities.append(PendingChoreApprovalsSensor(coordinator, entry))
    entities.append(PendingRewardApprovalsSensor(coordinator, entry))

    # 1) For each kid, add standard sensors
    for kid_id, kid_info in coordinator.kids_data.items():
        kid_name = kid_info.get("name", f"Kid {kid_id}")
        entities.append(
            KidPointsSensor(
                coordinator, entry, kid_id, kid_name, points_label, points_icon
            )
        )
        entities.append(
            CompletedChoresTotalSensor(coordinator, entry, kid_id, kid_name)
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

        # Reward Claims and Approvals
        for reward_id, reward_info in coordinator.rewards_data.items():
            reward_name = reward_info.get("name", f"Reward {reward_id}")
            entities.append(
                RewardClaimsSensor(
                    coordinator, entry, kid_id, kid_name, reward_id, reward_name
                )
            )
            entities.append(
                RewardApprovalsSensor(
                    coordinator, entry, kid_id, kid_name, reward_id, reward_name
                )
            )

        # Chore Claims and Approvals
        for chore_id, chore_info in coordinator.chores_data.items():
            chore_name = chore_info.get("name", f"Chore {chore_id}")
            entities.append(
                ChoreClaimsSensor(
                    coordinator, entry, kid_id, kid_name, chore_id, chore_name
                )
            )
            entities.append(
                ChoreApprovalsSensor(
                    coordinator, entry, kid_id, kid_name, chore_id, chore_name
                )
            )

        # Penalty Applies
        for penalty_id, penalty_info in coordinator.penalties_data.items():
            penalty_name = penalty_info.get("name", f"Penalty {penalty_id}")
            entities.append(
                PenaltyAppliesSensor(
                    coordinator, entry, kid_id, kid_name, penalty_id, penalty_name
                )
            )

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
    """Sensor for chore status: pending/claimed/approved/etc."""

    def __init__(self, coordinator, entry, kid_id, kid_name, chore_id, chore_name):
        """Initialize the sensor."""
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
        """Return the chore's state based on shared or individual tracking."""
        chore_info = self.coordinator.chores_data.get(self._chore_id, {})
        current_state = chore_info.get("state", CHORE_STATE_UNKNOWN)
        shared = chore_info.get("shared_chore", False)

        # If the chore is explicitly marked as overdue
        if current_state == CHORE_STATE_OVERDUE:
            return CHORE_STATE_OVERDUE

        # If it's a shared chore,  return the global chore state
        if shared:
            # If no explicit state found, fallback to 'unknown'
            return current_state or CHORE_STATE_UNKNOWN

        # For non-shared chores, check the kid's lists
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        if self._chore_id in kid_info.get("approved_chores", []):
            return CHORE_STATE_APPROVED
        elif self._chore_id in kid_info.get("claimed_chores", []):
            return CHORE_STATE_CLAIMED
        else:
            return CHORE_STATE_PENDING

    @property
    def extra_state_attributes(self):
        """Include points, description, etc."""
        chore_info = self.coordinator.chores_data.get(self._chore_id, {})
        current_state = chore_info.get("state", CHORE_STATE_UNKNOWN)
        shared = chore_info.get("shared_chore", False)

        attributes = {
            ATTR_KID_NAME: self._kid_name,
            ATTR_CHORE_NAME: self._chore_name,
            ATTR_SHARED_CHORE: shared,
            ATTR_DUE_DATE: chore_info.get("due_date", DUE_DATE_NOT_SET),
            ATTR_DEFAULT_POINTS: chore_info.get("default_points", 0),
            ATTR_DESCRIPTION: chore_info.get("description", ""),
        }

        # If chore is overdue, reflect that
        if current_state == CHORE_STATE_OVERDUE:
            attributes["state"] = CHORE_STATE_OVERDUE
        elif shared:
            attributes["state"] = current_state or CHORE_STATE_UNKNOWN
        else:
            # Non-shared => check if kid has it claimed or approved
            kid_info = self.coordinator.kids_data.get(self._kid_id, {})
            if self._chore_id in kid_info.get("approved_chores", []):
                attributes["state"] = CHORE_STATE_APPROVED
            elif self._chore_id in kid_info.get("claimed_chores", []):
                attributes["state"] = CHORE_STATE_CLAIMED
            else:
                attributes["state"] = CHORE_STATE_PENDING

        return attributes

    @property
    def icon(self):
        """Use the chore's custom icon if set, else fallback."""
        chore_info = self.coordinator.chores_data.get(self._chore_id, {})
        return chore_info.get("icon", DEFAULT_CHORE_SENSOR_ICON)

    @property
    def translation_key(self):
        """Return the translation key for the sensor."""
        return "chore_state"


class KidPointsSensor(CoordinatorEntity, SensorEntity):
    """Sensor for a kid's total points balance."""

    def __init__(self, coordinator, entry, kid_id, kid_name, points_label, points_icon):
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._points_label = points_label
        self._points_icon = points_icon
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_points"
        self._attr_name = f"{kid_name} - {self._points_label}"
        self._attr_state_class = "measurement"

    @property
    def native_value(self):
        """Return the kid's total points."""
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        return kid_info.get("points", 0)

    @property
    def native_unit_of_measurement(self):
        """Return the points label."""
        return self._points_label or LABEL_POINTS

    @property
    def icon(self):
        """Use the points' custom icon if set, else fallback."""
        return self._points_icon or DEFAULT_POINTS_ICON


class CompletedChoresTotalSensor(CoordinatorEntity, SensorEntity):
    """Sensor tracking the total number of chores a kid has completed since integration start."""

    def __init__(self, coordinator, entry, kid_id, kid_name):
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_completed_total"
        self._attr_name = f"{kid_name} - Total Chores Completed"
        self._attr_native_unit_of_measurement = "chores"
        self._attr_icon = "mdi:clipboard-check-outline"

    @property
    def native_value(self):
        """Return the total number of chores completed by the kid."""
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        return kid_info.get("completed_chores_total", 0)

    @property
    def translation_key(self):
        """Return the translation key for the sensor."""
        return "total_chores_completed"


class CompletedChoresDailySensor(CoordinatorEntity, SensorEntity):
    """How many chores kid completed today."""

    def __init__(self, coordinator, entry, kid_id, kid_name):
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_completed_daily"
        self._attr_name = f"{kid_name} - Chores Completed Today"
        self._attr_native_unit_of_measurement = "chores"

    @property
    def native_value(self):
        """Return the number of chores completed today."""
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        return kid_info.get("completed_chores_today", 0)


class CompletedChoresWeeklySensor(CoordinatorEntity, SensorEntity):
    """How many chores kid completed this week."""

    def __init__(self, coordinator, entry, kid_id, kid_name):
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_completed_weekly"
        self._attr_name = f"{kid_name} - Chores Completed This Week"
        self._attr_native_unit_of_measurement = "chores"

    @property
    def native_value(self):
        """Return the number of chores completed this week."""
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        return kid_info.get("completed_chores_weekly", 0)


class CompletedChoresMonthlySensor(CoordinatorEntity, SensorEntity):
    """How many chores kid completed this month."""

    def __init__(self, coordinator, entry, kid_id, kid_name):
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_completed_monthly"
        self._attr_name = f"{kid_name} - Chores Completed This Month"
        self._attr_native_unit_of_measurement = "chores"

    @property
    def native_value(self):
        """Return the number of chores completed this month."""
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        return kid_info.get("completed_chores_monthly", 0)


class KidBadgesSensor(CoordinatorEntity, SensorEntity):
    """Sensor: number of badges earned + attribute with the list."""

    def __init__(self, coordinator, entry, kid_id, kid_name):
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_badges"
        self._attr_name = f"{kid_name} - Badges Earned"

    @property
    def native_value(self):
        """Return the number of badges the kid has earned."""
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        return len(kid_info.get("badges", []))

    @property
    def extra_state_attributes(self):
        """Include the list of badges the kid has earned."""
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        return {ATTR_BADGES: kid_info.get("badges", [])}


class KidHighestBadgeSensor(CoordinatorEntity, SensorEntity):
    """Sensor that returns the "highest" badge the kid currently has, based on the threshold_value in coordinator.badges_data.

    - If the kid has no badges, the sensor is "None".
    - If multiple badges are tied for the highest threshold, it picks one with that top threshold.
    """

    def __init__(self, coordinator, entry, kid_id, kid_name):
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._entry = entry
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_highest_badge"
        self._attr_name = f"{kid_name} - Highest Badge"

    def _find_highest_badge(self):
        """Determine which badge has the highest ranking."""

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
        """Return the badge name of the highest-threshold badge the kid has earned.

        If the kid has none, return "None".
        """
        highest_badge, _ = self._find_highest_badge()
        return highest_badge if highest_badge else "None"

    @property
    def icon(self):
        """Return the icon for the highest badge. Fall back if none found."""
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
        """Provide additional details.

        - kid_name
        - all_earned_badges
        - highest_badge_threshold_value
        """
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        highest_badge, highest_val = self._find_highest_badge()

        return {
            ATTR_KID_NAME: self._kid_name,
            ATTR_ALL_EARNED_BADGES: kid_info.get("badges", []),
            ATTR_HIGHEST_BADGE_THRESHOLD_VALUE: highest_val if highest_badge else 0,
        }

    @property
    def translation_key(self):
        """Return the translation key for the sensor."""
        return "kids_highest_badge"


class PendingChoreApprovalsSensor(CoordinatorEntity, SensorEntity):
    """Sensor listing all pending chore approvals."""

    def __init__(self, coordinator, entry):
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{entry.entry_id}_pending_chore_approvals"
        self._attr_name = "Pending Chore Approvals"
        self._attr_icon = "mdi:clipboard-check-outline"

    @property
    def native_value(self):
        """Return a summary of pending chore approvals."""
        approvals = self.coordinator._data.get(DATA_PENDING_CHORE_APPROVALS, [])
        return f"{len(approvals)} pending chores"

    @property
    def extra_state_attributes(self):
        """Return detailed pending chores."""
        approvals = self.coordinator._data.get(DATA_PENDING_CHORE_APPROVALS, [])
        grouped_by_kid = {}

        for approval in approvals:
            kid_name = (
                self.coordinator._get_kid_name_by_id(approval["kid_id"]) or UNKNOWN_KID
            )
            chore_info = self.coordinator.chores_data.get(approval["chore_id"], {})
            chore_name = chore_info.get("name", UNKNOWN_CHORE)

            timestamp = approval["timestamp"]

            # If this kid hasn't appeared yet, add an empty list for them
            if kid_name not in grouped_by_kid:
                grouped_by_kid[kid_name] = []

            grouped_by_kid[kid_name].append(
                {
                    ATTR_CHORE_NAME: chore_name,
                    ATTR_CLAIMED_ON: timestamp,
                }
            )

        # Return the dictionary so that each kid is a "top-level" key
        return grouped_by_kid

    @property
    def translation_key(self):
        """Return the translation key for the sensor."""
        return "pending_chores_approvals"


class PendingRewardApprovalsSensor(CoordinatorEntity, SensorEntity):
    """Sensor listing all pending reward approvals."""

    def __init__(self, coordinator, entry):
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{entry.entry_id}_pending_reward_approvals"
        self._attr_name = "Pending Reward Approvals"
        self._attr_icon = "mdi:gift-open-outline"

    @property
    def native_value(self):
        """Return a summary of pending reward approvals."""
        approvals = self.coordinator._data.get(DATA_PENDING_REWARD_APPROVALS, [])
        return f"{len(approvals)} pending rewards"

    @property
    def extra_state_attributes(self):
        """Return detailed pending rewards."""
        approvals = self.coordinator._data.get(DATA_PENDING_REWARD_APPROVALS, [])
        grouped_by_kid = {}

        for approval in approvals:
            kid_name = (
                self.coordinator._get_kid_name_by_id(approval["kid_id"]) or UNKNOWN_KID
            )
            reward_info = self.coordinator.rewards_data.get(approval["reward_id"], {})
            reward_name = reward_info.get("name", UNKNOWN_REWARD)

            timestamp = approval["timestamp"]

            # If this kid doesn't exist yet in our dictionary, add them
            if kid_name not in grouped_by_kid:
                grouped_by_kid[kid_name] = []

            grouped_by_kid[kid_name].append(
                {
                    ATTR_REWARD_NAME: reward_name,
                    ATTR_REDEEMED_ON: timestamp,
                }
            )

        # Return the dict directly so each kid is a top-level key
        return grouped_by_kid

    @property
    def translation_key(self):
        """Return the translation key for the sensor."""
        return "pending_rewards_approvals"


class RewardClaimsSensor(CoordinatorEntity, SensorEntity):
    """Sensor tracking how many times each reward has been claimed by a kid."""

    def __init__(self, coordinator, entry, kid_id, kid_name, reward_id, reward_name):
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._reward_id = reward_id
        self._reward_name = reward_name
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_{reward_id}_reward_claims"
        self._attr_name = f"{kid_name} - '{reward_name}' Claims"

    @property
    def native_value(self):
        """Return the number of times the reward has been claimed."""
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        return kid_info.get("reward_claims", {}).get(self._reward_id, 0)


class RewardApprovalsSensor(CoordinatorEntity, SensorEntity):
    """Sensor tracking how many times each reward has been approved for a kid."""

    def __init__(self, coordinator, entry, kid_id, kid_name, reward_id, reward_name):
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._reward_id = reward_id
        self._reward_name = reward_name
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_{reward_id}_reward_approvals"
        self._attr_name = f"{kid_name} - '{reward_name}' Approvals"

    @property
    def native_value(self):
        """Return the number of times the reward has been approved."""
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        return kid_info.get("reward_approvals", {}).get(self._reward_id, 0)


class ChoreClaimsSensor(CoordinatorEntity, SensorEntity):
    """Sensor tracking how many times each chore has been claimed by a kid."""

    def __init__(self, coordinator, entry, kid_id, kid_name, chore_id, chore_name):
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._chore_id = chore_id
        self._chore_name = chore_name
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_{chore_id}_chore_claims"
        self._attr_name = f"{kid_name} - '{chore_name}' Claims"

    @property
    def native_value(self):
        """Return the number of times the chore has been claimed."""
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        return kid_info.get("chore_claims", {}).get(self._chore_id, 0)


class ChoreApprovalsSensor(CoordinatorEntity, SensorEntity):
    """Sensor tracking how many times each chore has been approved for a kid."""

    def __init__(self, coordinator, entry, kid_id, kid_name, chore_id, chore_name):
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._chore_id = chore_id
        self._chore_name = chore_name
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_{chore_id}_chore_approvals"
        self._attr_name = f"{kid_name} - '{chore_name}' Approvals"

    @property
    def native_value(self):
        """Return the number of times the chore has been approved."""
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        return kid_info.get("chore_approvals", {}).get(self._chore_id, 0)


class PenaltyAppliesSensor(CoordinatorEntity, SensorEntity):
    """Sensor tracking how many times each penalty has been applied to a kid."""

    def __init__(self, coordinator, entry, kid_id, kid_name, penalty_id, penalty_name):
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._penalty_id = penalty_id
        self._penalty_name = penalty_name
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_{penalty_id}_penalty_applies"
        self._attr_name = f"{kid_name} - '{penalty_name}' Penalties Applied"

    @property
    def native_value(self):
        """Return the number of times the penalty has been applied."""
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        return kid_info.get("penalty_applies", {}).get(self._penalty_id, 0)
