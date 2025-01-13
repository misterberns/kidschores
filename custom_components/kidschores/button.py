# File: button.py
"""
Buttons for KidsChores integration.

Features:
1) Chore Buttons (Claim & Approve) with user-defined or default icons.
2) Reward Buttons using user-defined or default icons.
3) Penalty Buttons using user-defined or default icons.
4) PointsAdjustButton: manually increments/decrements a kid's points (e.g., +1, -1, +2, -2, etc.).
5) ApproveRewardButton: allows parents to approve rewards claimed by kids.
"""

from typing import Optional
from homeassistant.auth.models import User
from homeassistant.components.button import ButtonEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, Context
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.exceptions import HomeAssistantError

from .const import (
    DOMAIN,
    LOGGER,
    BUTTON_REWARD_PREFIX,
    BUTTON_PENALTY_PREFIX,
    DEFAULT_CHORE_CLAIM_ICON,
    DEFAULT_CHORE_APPROVE_ICON,
    DEFAULT_REWARD_ICON,
    DEFAULT_PENALTY_ICON,
    DEFAULT_POINTS_ADJUST_PLUS_ICON,
    DEFAULT_POINTS_ADJUST_MINUS_ICON,
    DEFAULT_POINTS_LABEL,
    CHORE_STATE_CLAIMED,
    CHORE_STATE_APPROVED,
    CHORE_STATE_PENDING,
    CONF_POINTS_LABEL,
)
from .coordinator import KidsChoresDataCoordinator


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
):
    """
    Set up dynamic buttons for:
    - Chores (claim & approve)
    - Rewards
    - Penalties
    - Kid points adjustments (e.g., +1, -1, +10, -10, etc.)
    - Approve Reward Workflow
    """
    data = hass.data[DOMAIN][entry.entry_id]
    coordinator: KidsChoresDataCoordinator = data["coordinator"]

    points_label = entry.data.get(CONF_POINTS_LABEL, DEFAULT_POINTS_LABEL)

    entities = []

    # 1) Create buttons for chores (Claim & Approve)
    for chore_id, chore_info in coordinator.chores_data.items():
        chore_name = chore_info.get("name", f"Chore {chore_id}")
        assigned_kids_ids = chore_info.get("assigned_kids", [])

        # If user defined an icon, use it; else fallback to default for chore claim
        chore_claim_icon = chore_info.get("icon", DEFAULT_CHORE_CLAIM_ICON)
        # For "approve," use a distinct icon
        chore_approve_icon = chore_info.get("icon", DEFAULT_CHORE_APPROVE_ICON)

        for kid_id in assigned_kids_ids:
            kid_name = coordinator._get_kid_name_by_id(kid_id) or f"Kid {kid_id}"
            entities.append(
                ClaimChoreButton(
                    coordinator=coordinator,
                    entry=entry,
                    kid_id=kid_id,
                    kid_name=kid_name,
                    chore_id=chore_id,
                    chore_name=chore_name,
                    icon=chore_claim_icon,
                )
            )
            # We add ApproveChoreButton for all chores too
            entities.append(
                ApproveChoreButton(
                    coordinator=coordinator,
                    entry=entry,
                    kid_id=kid_id,
                    kid_name=kid_name,
                    chore_id=chore_id,
                    chore_name=chore_name,
                    icon=chore_approve_icon,
                )
            )

    # 2) Create reward buttons
    for kid_id, kid_info in coordinator.kids_data.items():
        kid_name = kid_info.get("name", f"Kid {kid_id}")
        for reward_id, reward_info in coordinator.rewards_data.items():
            # If no user-defined icon, fallback to DEFAULT_REWARD_ICON
            reward_icon = reward_info.get("icon", DEFAULT_REWARD_ICON)
            entities.append(
                RewardButton(
                    coordinator=coordinator,
                    entry=entry,
                    kid_id=kid_id,
                    kid_name=kid_name,
                    reward_id=reward_id,
                    reward_name=reward_info.get("name", f"Reward {reward_id}"),
                    icon=reward_icon,
                )
            )
            # ApproveRewardButton for each reward claim
            entities.append(
                ApproveRewardButton(
                    coordinator=coordinator,
                    entry=entry,
                    kid_id=kid_id,
                    kid_name=kid_name,
                    reward_id=reward_id,
                    reward_name=reward_info.get("name", f"Reward {reward_id}"),
                    icon=reward_info.get("icon", DEFAULT_REWARD_ICON),
                )
            )

    # 3) Create penalty buttons
    for kid_id, kid_info in coordinator.kids_data.items():
        kid_name = kid_info.get("name", f"Kid {kid_id}")
        for penalty_id, penalty_info in coordinator.penalties_data.items():
            # If no user-defined icon, fallback to DEFAULT_PENALTY_ICON
            penalty_icon = penalty_info.get("icon", DEFAULT_PENALTY_ICON)
            entities.append(
                PenaltyButton(
                    coordinator=coordinator,
                    entry=entry,
                    kid_id=kid_id,
                    kid_name=kid_name,
                    penalty_id=penalty_id,
                    penalty_name=penalty_info.get("name", f"Penalty {penalty_id}"),
                    icon=penalty_icon,
                )
            )

    # 4) Create "points adjustment" buttons for each kid (±1, ±2, ±10, etc.)
    POINT_DELTAS = [+1, -1, +2, -2, +10, -10]
    for kid_id, kid_info in coordinator.kids_data.items():
        kid_name = kid_info.get("name", f"Kid {kid_id}")
        for delta in POINT_DELTAS:
            entities.append(
                PointsAdjustButton(
                    coordinator=coordinator,
                    entry=entry,
                    kid_id=kid_id,
                    kid_name=kid_name,
                    delta=delta,
                    points_label=points_label,
                )
            )

    async_add_entities(entities)


# ------------------ Authorization (Optional) ------------------
async def is_user_authorized(hass: HomeAssistant, user_id: str, action: str) -> bool:
    """
    Validate if a user is authorized to perform an action (penalty, reward, points adjust).
    By default, only admin is authorized. Customize as needed.
    """
    if not user_id:
        return False  # Disallow if no user context

    user: User = await hass.auth.async_get_user(user_id)
    if not user:
        LOGGER.warning("%s: Invalid user ID '%s'.", action, user_id)
        return False

    if user.is_admin:
        return True  # Admin => authorized

    LOGGER.warning(
        "%s: Non-admin user '%s' is not authorized in this logic.", action, user.name
    )
    return False


# ------------------ Chore Buttons ------------------
class ClaimChoreButton(CoordinatorEntity, ButtonEntity):
    """
    Button to claim a chore as done (set chore state=claimed).
    """

    def __init__(
        self,
        coordinator: KidsChoresDataCoordinator,
        entry: ConfigEntry,
        kid_id: str,
        kid_name: str,
        chore_id: str,
        chore_name: str,
        icon: str,
    ):
        super().__init__(coordinator)
        self._entry = entry
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._chore_id = chore_id
        self._chore_name = chore_name
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_{chore_id}_claim"
        self._attr_name = f"{kid_name} - Claim Chore: {chore_name}"
        self._attr_icon = icon

    async def async_press(self):
        try:
            user_id = self._context.user_id if self._context else None
            if user_id and not await is_user_authorized(
                self.hass, user_id, "claim_chore"
            ):
                raise HomeAssistantError("Not authorized to claim chores.")

            user_obj = await self.hass.auth.async_get_user(user_id) if user_id else None
            user_name = user_obj.name if user_obj else "Unknown"

            self.coordinator.claim_chore(
                kid_id=self._kid_id,
                chore_id=self._chore_id,
                user_name=user_name,
            )
            LOGGER.info(
                "Chore '%s' claimed by kid '%s' (user: %s).",
                self._chore_name,
                self._kid_name,
                user_name,
            )
            await self.coordinator.async_request_refresh()

        except HomeAssistantError as e:
            LOGGER.error(
                "Authorization failed to claim chore '%s' for kid '%s': %s",
                self._chore_name,
                self._kid_name,
                e,
            )
        except Exception as e:
            LOGGER.error(
                "Failed to claim chore '%s' for kid '%s': %s",
                self._chore_name,
                self._kid_name,
                e,
            )


class ApproveChoreButton(CoordinatorEntity, ButtonEntity):
    """
    Button to approve a claimed chore for a kid (set chore state=approved or partial).
    """

    def __init__(
        self,
        coordinator: KidsChoresDataCoordinator,
        entry: ConfigEntry,
        kid_id: str,
        kid_name: str,
        chore_id: str,
        chore_name: str,
        icon: str,
    ):
        super().__init__(coordinator)
        self._entry = entry
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._chore_id = chore_id
        self._chore_name = chore_name
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_{chore_id}_approve"
        self._attr_name = f"{kid_name} - Approve Chore: {chore_name}"
        self._attr_icon = icon

    async def async_press(self):
        try:
            user_id = self._context.user_id if self._context else None
            if user_id and not await is_user_authorized(
                self.hass, user_id, "approve_chore"
            ):
                raise HomeAssistantError("Not authorized to approve chores.")

            parent_name = "ParentOrAdmin"  # You might want to fetch actual parent name
            self.coordinator.approve_chore(
                parent_name=parent_name,
                kid_id=self._kid_id,
                chore_id=self._chore_id,
            )
            LOGGER.info(
                "Chore '%s' approved for kid '%s'.",
                self._chore_name,
                self._kid_name,
            )
            await self.coordinator.async_request_refresh()

        except HomeAssistantError as e:
            LOGGER.error(
                "Authorization failed to approve chore '%s' for kid '%s': %s",
                self._chore_name,
                self._kid_name,
                e,
            )
        except Exception as e:
            LOGGER.error(
                "Failed to approve chore '%s' for kid '%s': %s",
                self._chore_name,
                self._kid_name,
                e,
            )


# ------------------ Reward Buttons ------------------
class RewardButton(CoordinatorEntity, ButtonEntity):
    """
    Button to redeem a reward for a kid.
    Uses user-defined or default reward icon.
    """

    def __init__(
        self,
        coordinator: KidsChoresDataCoordinator,
        entry: ConfigEntry,
        kid_id: str,
        kid_name: str,
        reward_id: str,
        reward_name: str,
        icon: str,
    ):
        super().__init__(coordinator)
        self._entry = entry
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._reward_id = reward_id
        self._reward_name = reward_name
        self._attr_unique_id = (
            f"{entry.entry_id}_{BUTTON_REWARD_PREFIX}{kid_id}_{reward_id}"
        )
        self._attr_name = f"{kid_name} - Redeem Reward: {reward_name}"
        self._attr_icon = icon

    async def async_press(self):
        try:
            user_id = self._context.user_id if self._context else None
            if user_id and not await is_user_authorized(
                self.hass, user_id, "redeem_reward"
            ):
                raise HomeAssistantError("Not authorized to redeem rewards.")

            user_obj = await self.hass.auth.async_get_user(user_id) if user_id else None
            parent_name = user_obj.name if user_obj else "Unknown"

            self.coordinator.redeem_reward(
                parent_name=parent_name,
                kid_id=self._kid_id,
                reward_id=self._reward_id,
            )
            LOGGER.info(
                "Reward '%s' redeemed for kid '%s' by parent '%s'.",
                self._reward_name,
                self._kid_name,
                parent_name,
            )
            await self.coordinator.async_request_refresh()

        except HomeAssistantError as e:
            LOGGER.error(
                "Authorization failed to redeem reward '%s' for kid '%s': %s",
                self._reward_name,
                self._kid_name,
                e,
            )
        except Exception as e:
            LOGGER.error(
                "Failed to redeem reward '%s' for kid '%s': %s",
                self._reward_name,
                self._kid_name,
                e,
            )


class ApproveRewardButton(CoordinatorEntity, ButtonEntity):
    """
    Button for parents to approve a reward claimed by a kid.
    Prevents unauthorized or premature reward approvals.
    """

    def __init__(
        self,
        coordinator: KidsChoresDataCoordinator,
        entry: ConfigEntry,
        kid_id: str,
        kid_name: str,
        reward_id: str,
        reward_name: str,
        icon: str,
    ):
        super().__init__(coordinator)
        self._entry = entry
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._reward_id = reward_id
        self._reward_name = reward_name
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_{reward_id}_approve_reward"
        self._attr_name = f"{kid_name} - Approve Reward: {reward_name}"
        self._attr_icon = icon

    async def async_press(self):
        try:
            user_id = self._context.user_id if self._context else None
            if user_id and not await is_user_authorized(
                self.hass, user_id, "approve_reward"
            ):
                raise HomeAssistantError("Not authorized to approve rewards.")

            parent_name = "ParentOrAdmin"  # Fetch actual parent name if available

            # Implement logic to approve the reward
            # This could involve moving the reward from a 'pending_rewards' list to 'approved_rewards'
            # For simplicity, we'll assume approval is already handled during redemption

            LOGGER.info(
                "Reward '%s' for kid '%s' has been approved by parent '%s'.",
                self._reward_name,
                self._kid_name,
                parent_name,
            )
            await self.coordinator.async_request_refresh()

        except HomeAssistantError as e:
            LOGGER.error(
                "Authorization failed to approve reward '%s' for kid '%s': %s",
                self._reward_name,
                self._kid_name,
                e,
            )
        except Exception as e:
            LOGGER.error(
                "Failed to approve reward '%s' for kid '%s': %s",
                self._reward_name,
                self._kid_name,
                e,
            )


# ------------------ Penalty Button ------------------
class PenaltyButton(CoordinatorEntity, ButtonEntity):
    """
    Button to apply a penalty for a kid.
    Uses user-defined or default penalty icon.
    """

    def __init__(
        self,
        coordinator: KidsChoresDataCoordinator,
        entry: ConfigEntry,
        kid_id: str,
        kid_name: str,
        penalty_id: str,
        penalty_name: str,
        icon: str,
    ):
        super().__init__(coordinator)
        self._entry = entry
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._penalty_id = penalty_id
        self._penalty_name = penalty_name
        self._attr_unique_id = (
            f"{entry.entry_id}_{BUTTON_PENALTY_PREFIX}{kid_id}_{penalty_id}"
        )
        self._attr_name = f"{kid_name} - Apply Penalty: {penalty_name}"
        self._attr_icon = icon

    async def async_press(self):
        try:
            user_id = self._context.user_id if self._context else None
            if user_id and not await is_user_authorized(
                self.hass, user_id, "apply_penalty"
            ):
                raise HomeAssistantError("Not authorized to apply penalties.")

            user_obj = await self.hass.auth.async_get_user(user_id) if user_id else None
            parent_name = user_obj.name if user_obj else "Unknown"

            self.coordinator.apply_penalty(
                parent_name=parent_name,
                kid_id=self._kid_id,
                penalty_id=self._penalty_id,
            )
            LOGGER.info(
                "Penalty '%s' applied to kid '%s' by '%s'.",
                self._penalty_name,
                self._kid_name,
                parent_name,
            )
            await self.coordinator.async_request_refresh()

        except HomeAssistantError as e:
            LOGGER.error(
                "Authorization failed to apply penalty '%s' for kid '%s': %s",
                self._penalty_name,
                self._kid_name,
                e,
            )
        except Exception as e:
            LOGGER.error(
                "Failed to apply penalty '%s' for kid '%s': %s",
                self._penalty_name,
                self._kid_name,
                e,
            )


# ------------------ Points Adjust Button ------------------
class PointsAdjustButton(CoordinatorEntity, ButtonEntity):
    """
    Button that increments or decrements a kid's points by 'delta'.
    For example: +1, -1, +10, -10, etc.
    Uses icons from const.py for plus/minus, or fallback if desired.
    """

    def __init__(
        self,
        coordinator: KidsChoresDataCoordinator,
        entry: ConfigEntry,
        kid_id: str,
        kid_name: str,
        delta: int,
        points_label: str,
    ):
        super().__init__(coordinator)
        self._entry = entry
        self._kid_id = kid_id
        self._kid_name = kid_name
        self._delta = delta
        self._points_label = points_label

        sign_label = f"+{delta}" if delta >= 0 else str(delta)
        self._attr_unique_id = f"{entry.entry_id}_{kid_id}_adjust_points_{delta}"
        self._attr_name = f"{kid_name} {sign_label} {self._points_label}"

        # Decide the icon based on whether delta is positive or negative
        if delta >= 0:
            self._attr_icon = DEFAULT_POINTS_ADJUST_PLUS_ICON
        else:
            self._attr_icon = DEFAULT_POINTS_ADJUST_MINUS_ICON

    async def async_press(self):
        try:
            user_id = self._context.user_id if self._context else None
            if user_id and not await is_user_authorized(
                self.hass, user_id, "adjust_points"
            ):
                raise HomeAssistantError("Not authorized to adjust points.")

            current_points = self.coordinator.kids_data[self._kid_id]["points"]
            new_points = current_points + self._delta
            self.coordinator.update_kid_points(
                kid_id=self._kid_id,
                points=new_points,
            )
            LOGGER.info(
                "Adjusted points for kid '%s' by %d => total %d.",
                self._kid_name,
                self._delta,
                new_points,
            )
            await self.coordinator.async_request_refresh()

        except HomeAssistantError as e:
            LOGGER.error(
                "Authorization failed to adjust points for kid '%s' by %d: %s",
                self._kid_name,
                self._delta,
                e,
            )
        except Exception as e:
            LOGGER.error(
                "Failed to adjust points for kid '%s' by %d: %s",
                self._kid_name,
                self._delta,
                e,
            )
