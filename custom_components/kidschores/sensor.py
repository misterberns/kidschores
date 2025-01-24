# File: sensor.py
"""Sensors for the KidsChores integration.

This file defines all sensor entities for each Kid, Chore, Reward, and Badge.

Available Sensors:
1. KidPointsSensor .................... Kid's current total points
2. KidPointsEarnedDailySensor ......... Points earned by the kid today
3. KidPointsEarnedWeeklySensor ........ Points earned by the kid this week
4. KidPointsEarnedMonthlySensor ....... Points earned by the kid this month
5. KidMaxPointsEverSensor ............. The highest points total the kid has ever reached
6. CompletedChoresDailySensor ......... Chores completed by the kid today
7. CompletedChoresWeeklySensor ........ Chores completed by the kid this week
8. CompletedChoresMonthlySensor ....... Chores completed by the kid this month
9. CompletedChoresTotalSensor ......... Total chores completed by the kid
10. KidBadgesSensor ................... Number of badges the kid currently has
11. KidHighestBadgeSensor ............. The highest (threshold) badge the kid holds
12. BadgeSensor ....................... One sensor per badge, showing its threshold & who earned it
13. ChoreStatusSensor .................. Shows current state (pending/claimed/approved, etc.) for each (kid, chore)
14. RewardStatusSensor ................. Shows current state (not claimed/claimed/approved) for each (kid, reward)
15. PenaltyAppliesSensor ............... Tracks how many times each penalty was applied for each kid
16. RewardClaimsSensor .................. Number of times a reward was claimed by a kid
17. RewardApprovalsSensor .............. Number of times a reward was approved for a kid
18. ChoreClaimsSensor ................... Number of times a chore was claimed by a kid
19. ChoreApprovalsSensor ............... Number of times a chore was approved for a kid
20. PendingChoreApprovalsSensor ........ Lists chores that are awaiting approval
21. PendingRewardApprovalsSensor ....... Lists rewards that are awaiting approval
"""

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.components.sensor import SensorEntity
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import (
    ATTR_ALL_EARNED_BADGES,
    ATTR_ALLOW_MULTIPLE_CLAIMS_PER_DAY,
    ATTR_ASSIGNED_KIDS,
    ATTR_BADGES,
    ATTR_CLAIMED_ON,
    ATTR_CHORE_NAME,
    ATTR_COST,
    ATTR_DEFAULT_POINTS,
    ATTR_DESCRIPTION,
    ATTR_DUE_DATE,
    ATTR_HIGHEST_BADGE_THRESHOLD_VALUE,
    ATTR_KID_NAME,
    ATTR_KIDS_EARNED,
    ATTR_PARTIAL_ALLOWED,
    ATTR_PENALTY_NAME,
    ATTR_PENALTY_POINTS,
    ATTR_POINTS_MULTIPLIER,
    ATTR_REDEEMED_ON,
    ATTR_REWARD_NAME,
    ATTR_SHARED_CHORE,
    ATTR_THRESHOLD_TYPE,
    CHORE_STATE_APPROVED,
    CHORE_STATE_CLAIMED,
    CHORE_STATE_OVERDUE,
    CHORE_STATE_PENDING,
    CHORE_STATE_UNKNOWN,
    CONF_POINTS_ICON,
    CONF_POINTS_LABEL,
    DATA_PENDING_CHORE_APPROVALS,
    DATA_PENDING_REWARD_APPROVALS,
    DEFAULT_BADGE_BINARY_ICON,
    DEFAULT_CHORE_SENSOR_ICON,
    DEFAULT_PENALTY_ICON,
    DEFAULT_PENALTY_POINTS,
    DEFAULT_POINTS_ICON,
    DEFAULT_POINTS_LABEL,
    DEFAULT_REWARD_COST,
    DEFAULT_REWARD_ICON,
    DEFAULT_TROPHY_ICON,
    DEFAULT_TROPHY_OUTLINE,
    DOMAIN,
    DUE_DATE_NOT_SET,
    LABEL_POINTS,
    REWARD_STATE_APPROVED,
    REWARD_STATE_CLAIMED,
    REWARD_STATE_NOT_CLAIMED,
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

    # For each kid, add standard sensors
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
        entities.append(
            KidPointsEarnedDailySensor(
                coordinator, entry, kid_id, kid_name, points_label, points_icon
            )
        )
        entities.append(
            KidPointsEarnedWeeklySensor(
                coordinator, entry, kid_id, kid_name, points_label, points_icon
            )
        )
        entities.append(
            KidPointsEarnedMonthlySensor(
                coordinator, entry, kid_id, kid_name, points_label, points_icon
            )
        )
        entities.append(
            KidMaxPointsEverSensor(
                coordinator, entry, kid_id, kid_name, points_label, points_icon
            )
        )

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

    # For each chore assigned to each kid, add a ChoreStatusSensor
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

    # For each Reward, add a RewardStatusSensor
    for reward_id, reward_info in coordinator.rewards_data.items():
        reward_name = reward_info.get("name", f"Reward {reward_id}")

        # For each kid, create the reward status sensor
        for kid_id, kid_info in coordinator.kids_data.items():
            kid_name = kid_info.get("name", f"Kid {kid_id}")
            entities.append(
                RewardStatusSensor(
                    coordinator, entry, kid_id, kid_name, reward_id, reward_name
                )
            )

    # For each Badge, add a BadgeSensor
    for badge_id, badge_info in coordinator.badges_data.items():
        badge_name = badge_info.get("name", f"Badge {badge_id}")
        entities.append(BadgeSensor(coordinator, entry, badge_id, badge_name))

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

        assigned_kids_ids = chore_info.get("assigned_kids", [])
        assigned_kids_names = [
            self.coordinator._get_kid_name_by_id(k_id) or f"Kid {k_id}"
            for k_id in assigned_kids_ids
        ]

        attributes = {
            ATTR_KID_NAME: self._kid_name,
            ATTR_CHORE_NAME: self._chore_name,
            ATTR_SHARED_CHORE: shared,
            ATTR_DUE_DATE: chore_info.get("due_date", DUE_DATE_NOT_SET),
            ATTR_DEFAULT_POINTS: chore_info.get("default_points", 0),
            ATTR_DESCRIPTION: chore_info.get("description", ""),
            ATTR_PARTIAL_ALLOWED: chore_info.get("partial_allowed", False),
            ATTR_ALLOW_MULTIPLE_CLAIMS_PER_DAY: chore_info.get(
                "allow_multiple_claims_per_day", False
            ),
            ATTR_ASSIGNED_KIDS: assigned_kids_names,
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


class KidMaxPointsEverSensor(CoordinatorEntity, SensorEntity):
    """Sensor showing the maximum points a kid has ever reached.

    This value only increases when the kid's current points exceed the old max.
    """

    def __init__(self, coordinator, entry, kid_id, kid_name, points_label, points_icon):
        """Initialize the sensor."""

        super().__init__(coordinator)
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._points_label = points_label
        self._points_icon = points_icon
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_max_points_ever"
        self._attr_name = f"{kid_name} - Max Points Ever"
        self._attr_native_unit_of_measurement = "points"
        self._entry = entry

    @property
    def native_value(self):
        """Return the highest points total the kid has ever reached."""
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        return kid_info.get("max_points_ever", 0)

    @property
    def icon(self):
        """Use the same icon as points or any custom icon you prefer."""
        return self._points_icon or DEFAULT_POINTS_ICON

    @property
    def native_unit_of_measurement(self):
        """Optionally display the same points label for consistency."""
        return self._points_label or LABEL_POINTS


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


class BadgeSensor(CoordinatorEntity, SensorEntity):
    """Sensor representing a single badge in KidsChores.

    The sensor's 'state' is the badge's threshold_value (the numeric requirement).
    Attributes include which kids have earned it, threshold type, and more.
    """

    def __init__(
        self,
        coordinator: KidsChoresDataCoordinator,
        entry: ConfigEntry,
        badge_id: str,
        badge_name: str,
    ):
        """Initialize the sensor."""

        super().__init__(coordinator)
        self._entry = entry
        self._badge_id = badge_id
        self._badge_name = badge_name

        # Unique ID for the sensor so that each badge has exactly one sensor
        self._attr_unique_id = f"{entry.entry_id}_{badge_id}_badge_sensor"
        self._attr_name = f"Badge - {badge_name}"

    @property
    def native_value(self) -> float:
        """The sensor state is the threshold_value for the badge.

        For 'chore_count' badges, it's still numeric.
        """
        badge_info = self.coordinator.badges_data.get(self._badge_id, {})
        return badge_info.get("threshold_value", 0)

    @property
    def extra_state_attributes(self):
        """Provide additional badge data, including which kids currently have it."""
        badge_info = self.coordinator.badges_data.get(self._badge_id, {})
        threshold_type = badge_info.get("threshold_type", "points")
        points_multiplier = badge_info.get("points_multiplier", 1.0)
        description = badge_info.get("description", "")

        kids_earned_ids = badge_info.get("earned_by", [])

        # Convert each kid_id to kid_name
        kids_earned_names = []
        for kid_id in kids_earned_ids:
            kid = self.coordinator.kids_data.get(kid_id)
            if kid is not None:
                kids_earned_names.append(kid.get("name", f"Kid {kid_id}"))
            else:
                kids_earned_names.append(f"Kid {kid_id} (not found)")

        return {
            ATTR_THRESHOLD_TYPE: threshold_type,
            ATTR_POINTS_MULTIPLIER: points_multiplier,
            ATTR_DESCRIPTION: description,
            ATTR_KIDS_EARNED: kids_earned_names,
        }

    @property
    def icon(self) -> str:
        """Return the badge's custom icon if set, else default."""
        badge_info = self.coordinator.badges_data.get(self._badge_id, {})
        return badge_info.get("icon", DEFAULT_BADGE_BINARY_ICON)

    @property
    def translation_key(self) -> str:
        """Optional: Provide a translation key if you want localized states."""
        return "badge_sensor_state"


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

    @property
    def icon(self):
        """Return the chore's custom icon if set, else fallback."""
        reward_info = self.coordinator.rewards_data.get(self._reward_id, {})
        return reward_info.get("icon", DEFAULT_REWARD_ICON)


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

    @property
    def icon(self):
        """Return the chore's custom icon if set, else fallback."""
        reward_info = self.coordinator.rewards_data.get(self._reward_id, {})
        return reward_info.get("icon", DEFAULT_REWARD_ICON)


class RewardStatusSensor(CoordinatorEntity, SensorEntity):
    """Shows the status of a reward for a particular kid.

    Status can be:
    - "Not Claimed" if the reward is neither pending nor approved
    - "Claimed" if the reward is in kid_info['pending_rewards']
    - "Approved" if the reward is in kid_info['redeemed_rewards']

    """

    def __init__(
        self,
        coordinator: KidsChoresDataCoordinator,
        entry: ConfigEntry,
        kid_id: str,
        kid_name: str,
        reward_id: str,
        reward_name: str,
    ):
        """Initialize the sensor."""

        super().__init__(coordinator)
        self._entry = entry
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._reward_id = reward_id
        self._reward_name = reward_name
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_{reward_id}_reward_status"
        self._attr_name = f"{kid_name} - Reward Status - {reward_name}"

    @property
    def native_value(self) -> str:
        """Return the current reward status: 'Not Claimed', 'Claimed', or 'Approved'."""
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        if self._reward_id in kid_info.get("pending_rewards", []):
            return REWARD_STATE_CLAIMED
        if self._reward_id in kid_info.get("redeemed_rewards", []):
            return REWARD_STATE_APPROVED
        return REWARD_STATE_NOT_CLAIMED

    @property
    def extra_state_attributes(self) -> dict:
        """Provide extra attributes about the reward."""
        reward_info = self.coordinator.rewards_data.get(self._reward_id, {})
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})

        attributes = {
            ATTR_KID_NAME: self._kid_name,
            ATTR_REWARD_NAME: self._reward_name,
            ATTR_COST: reward_info.get("cost", DEFAULT_REWARD_COST),
            ATTR_DESCRIPTION: reward_info.get("description", ""),
        }

        return attributes

    @property
    def icon(self) -> str:
        """Use the reward's custom icon if set, else fallback."""
        reward_info = self.coordinator.rewards_data.get(self._reward_id, {})
        return reward_info.get("icon", DEFAULT_REWARD_ICON)

    @property
    def translation_key(self) -> str:
        """Optional: Return a translation key if you want to customize or localize states."""
        return "reward_state"


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

    @property
    def icon(self):
        """Return the chore's custom icon if set, else fallback."""
        chore_info = self.coordinator.chores_data.get(self._chore_id, {})
        return chore_info.get("icon", DEFAULT_CHORE_SENSOR_ICON)


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

    @property
    def icon(self):
        """Return the chore's custom icon if set, else fallback."""
        chore_info = self.coordinator.chores_data.get(self._chore_id, {})
        return chore_info.get("icon", DEFAULT_CHORE_SENSOR_ICON)


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

    @property
    def extra_state_attributes(self):
        """Expose additional details like penalty points and description."""
        penalty_info = self.coordinator.penalties_data.get(self._penalty_id, {})

        return {
            ATTR_KID_NAME: self._kid_name,
            ATTR_PENALTY_NAME: self._penalty_name,
            ATTR_PENALTY_POINTS: penalty_info.get("points", DEFAULT_PENALTY_POINTS),
            ATTR_DESCRIPTION: penalty_info.get("description", ""),
        }

    @property
    def icon(self):
        """Return the chore's custom icon if set, else fallback."""
        penalty_info = self.coordinator.penalties_data.get(self._penalty_id, {})
        return penalty_info.get("icon", DEFAULT_PENALTY_ICON)


class KidPointsEarnedDailySensor(CoordinatorEntity, SensorEntity):
    """Sensor for how many net points a kid earned today."""

    def __init__(self, coordinator, entry, kid_id, kid_name, points_label, points_icon):
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._points_label = points_label
        self._points_icon = points_icon
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_points_earned_daily"
        self._attr_name = f"{kid_name} - Points Earned Today"
        self._attr_native_unit_of_measurement = "points"
        self._attr_icon = "mdi:star-outline"  # or something else
        self._entry = entry

    @property
    def native_value(self):
        """Return how many net points the kid has earned so far today."""
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        return kid_info.get("points_earned_today", 0)

    @property
    def native_unit_of_measurement(self):
        """Return the points label."""
        return self._points_label or LABEL_POINTS

    @property
    def icon(self):
        """Use the points' custom icon if set, else fallback."""
        return self._points_icon or DEFAULT_POINTS_ICON


class KidPointsEarnedWeeklySensor(CoordinatorEntity, SensorEntity):
    """Sensor for how many net points a kid earned this week."""

    def __init__(self, coordinator, entry, kid_id, kid_name, points_label, points_icon):
        """Initialize the sensor."""

        super().__init__(coordinator)
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._points_label = points_label
        self._points_icon = points_icon
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_points_earned_weekly"
        self._attr_name = f"{kid_name} - Points Earned This Week"
        self._attr_native_unit_of_measurement = "points"
        self._attr_icon = "mdi:star-outline"

    @property
    def native_value(self):
        """Return how many net points the kid has earned this week."""
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        return kid_info.get("points_earned_weekly", 0)

    @property
    def native_unit_of_measurement(self):
        """Return the points label."""
        return self._points_label or LABEL_POINTS

    @property
    def icon(self):
        """Use the points' custom icon if set, else fallback."""
        return self._points_icon or DEFAULT_POINTS_ICON


class KidPointsEarnedMonthlySensor(CoordinatorEntity, SensorEntity):
    """Sensor for how many net points a kid earned this month."""

    def __init__(self, coordinator, entry, kid_id, kid_name, points_label, points_icon):
        """Initialize the sensor."""

        super().__init__(coordinator)
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._points_label = points_label
        self._points_icon = points_icon
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_points_earned_monthly"
        self._attr_name = f"{kid_name} - Points Earned This Month"
        self._attr_native_unit_of_measurement = "points"
        self._attr_icon = "mdi:star-outline"

    @property
    def native_value(self):
        """Return how many net points the kid has earned this month."""
        kid_info = self.coordinator.kids_data.get(self._kid_id, {})
        return kid_info.get("points_earned_monthly", 0)

    @property
    def native_unit_of_measurement(self):
        """Return the points label."""
        return self._points_label or LABEL_POINTS

    @property
    def icon(self):
        """Use the points' custom icon if set, else fallback."""
        return self._points_icon or DEFAULT_POINTS_ICON
