# File: services.py
"""Defines custom services for the KidsChores integration.

These services allow direct actions through scripts or automations.
Includes UI editor support with selectors for dropdowns and text inputs.
"""

import voluptuous as vol
from homeassistant.core import HomeAssistant, ServiceCall
from typing import Optional
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv

from .const import (
    CHORE_STATE_PENDING,
    DATA_PENDING_CHORE_APPROVALS,
    DOMAIN,
    ERROR_CHORE_NOT_FOUND_FMT,
    ERROR_KID_NOT_FOUND_FMT,
    ERROR_NOT_AUTHORIZED_FMT,
    FIELD_CHORE_NAME,
    FIELD_KID_NAME,
    FIELD_PARENT_NAME,
    FIELD_PENALTY_NAME,
    FIELD_POINTS_AWARDED,
    FIELD_REWARD_NAME,
    LOGGER,
    MSG_NO_ENTRY_FOUND,
    SERVICE_APPLY_PENALTY,
    SERVICE_APPROVE_CHORE,
    SERVICE_APPROVE_REWARD,
    SERVICE_CLAIM_CHORE,
    SERVICE_DISAPPROVE_CHORE,
    SERVICE_DISAPPROVE_REWARD,
    SERVICE_REDEEM_REWARD,
    SERVICE_RESET_ALL_CHORES,
    SERVICE_RESET_ALL_DATA,
)
from .coordinator import KidsChoresDataCoordinator
from .kc_helpers import is_user_authorized_for_global_action, is_user_authorized_for_kid


# --- Service Schemas ---
CLAIM_CHORE_SCHEMA = vol.Schema(
    {
        vol.Required(FIELD_KID_NAME): cv.string,
        vol.Required(FIELD_CHORE_NAME): cv.string,
    }
)

APPROVE_CHORE_SCHEMA = vol.Schema(
    {
        vol.Required(FIELD_PARENT_NAME): cv.string,
        vol.Required(FIELD_KID_NAME): cv.string,
        vol.Required(FIELD_CHORE_NAME): cv.string,
        vol.Optional(FIELD_POINTS_AWARDED): vol.Coerce(float),
    }
)

DISAPPROVE_CHORE_SCHEMA = vol.Schema(
    {
        vol.Required(FIELD_PARENT_NAME): cv.string,
        vol.Required(FIELD_KID_NAME): cv.string,
        vol.Required(FIELD_CHORE_NAME): cv.string,
    }
)

REDEEM_REWARD_SCHEMA = vol.Schema(
    {
        vol.Required(FIELD_PARENT_NAME): cv.string,
        vol.Required(FIELD_KID_NAME): cv.string,
        vol.Required(FIELD_REWARD_NAME): cv.string,
    }
)

APPROVE_REWARD_SCHEMA = vol.Schema(
    {
        vol.Required(FIELD_PARENT_NAME): cv.string,
        vol.Required(FIELD_KID_NAME): cv.string,
        vol.Required(FIELD_REWARD_NAME): cv.string,
    }
)

DISAPPROVE_REWARD_SCHEMA = vol.Schema(
    {
        vol.Required(FIELD_PARENT_NAME): cv.string,
        vol.Required(FIELD_KID_NAME): cv.string,
        vol.Required(FIELD_REWARD_NAME): cv.string,
    }
)

APPLY_PENALTY_SCHEMA = vol.Schema(
    {
        vol.Required(FIELD_PARENT_NAME): cv.string,
        vol.Required(FIELD_KID_NAME): cv.string,
        vol.Required(FIELD_PENALTY_NAME): cv.string,
    }
)

APPROVE_REWARD_SCHEMA = vol.Schema(
    {
        vol.Required(FIELD_PARENT_NAME): cv.string,
        vol.Required(FIELD_KID_NAME): cv.string,
        vol.Required(FIELD_REWARD_NAME): cv.string,
    }
)

RESET_ALL_DATA_SCHEMA = vol.Schema({})

RESET_ALL_CHORES_SCHEMA = vol.Schema({})


def async_setup_services(hass: HomeAssistant):
    """Register KidsChores services."""

    async def handle_claim_chore(call: ServiceCall):
        """Handle claiming a chore."""
        entry_id = _get_first_kidschores_entry(hass)
        if not entry_id:
            LOGGER.warning("Claim Chore: %s", MSG_NO_ENTRY_FOUND)
            return

        coordinator: KidsChoresDataCoordinator = hass.data[DOMAIN][entry_id][
            "coordinator"
        ]
        user_id = call.context.user_id
        kid_name = call.data[FIELD_KID_NAME]
        chore_name = call.data[FIELD_CHORE_NAME]

        # Map kid_name and chore_name to internal_ids
        kid_id = _get_kid_id_by_name(coordinator, kid_name)
        if not kid_id:
            LOGGER.warning("Claim Chore: " + ERROR_KID_NOT_FOUND_FMT, kid_name)
            raise HomeAssistantError(ERROR_KID_NOT_FOUND_FMT.format(kid_name))

        chore_id = _get_chore_id_by_name(coordinator, chore_name)
        if not chore_id:
            LOGGER.warning("Claim Chore: " + ERROR_CHORE_NOT_FOUND_FMT, chore_name)
            raise HomeAssistantError(ERROR_CHORE_NOT_FOUND_FMT.format(chore_name))

        # Check if user is authorized
        if user_id and not await is_user_authorized_for_kid(hass, user_id, kid_id):
            LOGGER.warning("Claim Chore: %s", ERROR_NOT_AUTHORIZED_FMT)
            raise HomeAssistantError(ERROR_NOT_AUTHORIZED_FMT.format("claim chores"))

        # Process chore claim
        coordinator.claim_chore(
            kid_id=kid_id, chore_id=chore_id, user_name=f"user:{user_id}"
        )

        LOGGER.info(
            "Chore '%s' claimed by kid '%s' by user '%s'",
            chore_name,
            kid_name,
            user_id,
        )
        await coordinator.async_request_refresh()

    async def handle_approve_chore(call: ServiceCall):
        """Handle approving a claimed chore."""
        entry_id = _get_first_kidschores_entry(hass)

        if not entry_id:
            LOGGER.warning("Approve Chore: %s", MSG_NO_ENTRY_FOUND)
            return

        coordinator: KidsChoresDataCoordinator = hass.data[DOMAIN][entry_id][
            "coordinator"
        ]
        user_id = call.context.user_id
        parent_name = call.data[FIELD_PARENT_NAME]
        kid_name = call.data[FIELD_KID_NAME]
        chore_name = call.data[FIELD_CHORE_NAME]
        points_awarded = call.data.get(FIELD_POINTS_AWARDED)

        # Map kid_name and chore_name to internal_ids
        kid_id = _get_kid_id_by_name(coordinator, kid_name)
        if not kid_id:
            LOGGER.warning("Approve Chore: Kid '%s' not found", kid_name)
            raise HomeAssistantError(f"Kid '{kid_name}' not found")

        chore_id = _get_chore_id_by_name(coordinator, chore_name)
        if not chore_id:
            LOGGER.warning("Approve Chore: Chore '%s' not found", chore_name)
            raise HomeAssistantError(f"Chore '{chore_name}' not found")

        # Check if user is authorized
        if user_id and not await is_user_authorized_for_global_action(
            hass, user_id, kid_id
        ):
            LOGGER.warning("Approve Chore: User not authorized")
            raise HomeAssistantError(
                "You are not authorized to approve chores for this kid."
            )

        # Approve chore and assign points
        try:
            coordinator.approve_chore(
                parent_name=parent_name,
                kid_id=kid_id,
                chore_id=chore_id,
                points_awarded=points_awarded,
            )
            LOGGER.info(
                "Chore '%s' approved for kid '%s' by parent '%s'. Points Awarded: %s",
                chore_name,
                kid_name,
                parent_name,
                points_awarded,
            )
            await coordinator.async_request_refresh()
        except HomeAssistantError as e:
            LOGGER.error("Approve Chore: %s", e)
            raise
        except Exception as e:
            LOGGER.error(
                "Approve Chore: Failed to approve chore '%s' for kid '%s': %s",
                chore_name,
                kid_name,
                e,
            )
            raise HomeAssistantError(
                f"Failed to approve chore '{chore_name}' for kid '{kid_name}'."
            )

    async def handle_disapprove_chore(call: ServiceCall):
        """Handle disapproving a chore."""
        entry_id = _get_first_kidschores_entry(hass)
        if not entry_id:
            LOGGER.warning("Disapprove Chore: %s", MSG_NO_ENTRY_FOUND)
            return

        coordinator: KidsChoresDataCoordinator = hass.data[DOMAIN][entry_id][
            "coordinator"
        ]
        parent_name = call.data[FIELD_PARENT_NAME]
        kid_name = call.data[FIELD_KID_NAME]
        chore_name = call.data[FIELD_CHORE_NAME]

        # Map kid_name and chore_name to internal_ids
        kid_id = _get_kid_id_by_name(coordinator, kid_name)
        if not kid_id:
            LOGGER.warning("Disapprove Chore: Kid '%s' not found", kid_name)
            raise HomeAssistantError(f"Kid '{kid_name}' not found")

        chore_id = _get_chore_id_by_name(coordinator, chore_name)
        if not chore_id:
            LOGGER.warning("Disapprove Chore: Chore '%s' not found", chore_name)
            raise HomeAssistantError(f"Chore '{chore_name}' not found")

        # Check if user is authorized
        user_id = call.context.user_id
        if user_id and not await is_user_authorized_for_global_action(
            hass, user_id, kid_id
        ):
            LOGGER.warning("Disapprove Chore: User not authorized")
            raise HomeAssistantError(
                "You are not authorized to disapprove chores for this kid."
            )

        # Disapprove the chore
        coordinator.disapprove_chore(
            parent_name=parent_name,
            kid_id=kid_id,
            chore_id=chore_id,
        )
        LOGGER.info(
            "Chore '%s' disapproved for kid '%s' by parent '%s'",
            chore_name,
            kid_name,
            parent_name,
        )
        await coordinator.async_request_refresh()

    async def handle_redeem_reward(call: ServiceCall):
        """Handle redeeming a reward (claiming without deduction)."""
        entry_id = _get_first_kidschores_entry(hass)
        if not entry_id:
            LOGGER.warning("Redeem Reward: %s", MSG_NO_ENTRY_FOUND)
            return

        coordinator: KidsChoresDataCoordinator = hass.data[DOMAIN][entry_id][
            "coordinator"
        ]
        parent_name = call.data[FIELD_PARENT_NAME]
        kid_name = call.data[FIELD_KID_NAME]
        reward_name = call.data[FIELD_REWARD_NAME]

        # Map kid_name and reward_name to internal_ids
        kid_id = _get_kid_id_by_name(coordinator, kid_name)
        if not kid_id:
            LOGGER.warning("Redeem Reward: Kid '%s' not found", kid_name)
            raise HomeAssistantError(f"Kid '{kid_name}' not found")

        reward_id = _get_reward_id_by_name(coordinator, reward_name)
        if not reward_id:
            LOGGER.warning("Redeem Reward: Reward '%s' not found", reward_name)
            raise HomeAssistantError(f"Reward '{reward_name}' not found")

        # Check if user is authorized
        user_id = call.context.user_id
        if user_id and not await is_user_authorized_for_kid(hass, user_id, kid_id):
            LOGGER.warning("Redeem Reward: User not authorized")
            raise HomeAssistantError(
                "You are not authorized to redeem rewards for this kid."
            )

        # Check if kid has enough points
        kid_info = coordinator.kids_data.get(kid_id)
        reward = coordinator.rewards_data.get(reward_id)
        if not kid_info or not reward:
            LOGGER.warning("Redeem Reward: Invalid kid or reward")
            raise HomeAssistantError("Invalid kid or reward")

        if kid_info["points"] < reward.get("cost", 0):
            LOGGER.warning(
                "Redeem Reward: Kid '%s' does not have enough points to redeem reward '%s'",
                kid_name,
                reward_name,
            )
            raise HomeAssistantError(
                f"Kid '{kid_name}' does not have enough points to redeem '{reward_name}'."
            )

        # Process reward claim without deduction
        try:
            coordinator.redeem_reward(
                parent_name=parent_name, kid_id=kid_id, reward_id=reward_id
            )
            LOGGER.info(
                "Reward '%s' claimed by kid '%s' and pending approval by parent '%s'",
                reward_name,
                kid_name,
                parent_name,
            )
            await coordinator.async_request_refresh()
        except HomeAssistantError as e:
            LOGGER.error("Redeem Reward: %s", e)
            raise
        except Exception as e:
            LOGGER.error(
                "Redeem Reward: Failed to claim reward '%s' for kid '%s': %s",
                reward_name,
                kid_name,
                e,
            )
            raise HomeAssistantError(
                f"Failed to claim reward '{reward_name}' for kid '{kid_name}'."
            )

    async def handle_approve_reward(call: ServiceCall):
        """Handle approving a reward claimed by a kid."""
        entry_id = _get_first_kidschores_entry(hass)
        if not entry_id:
            LOGGER.warning("Approve Reward: %s", MSG_NO_ENTRY_FOUND)
            return

        coordinator: KidsChoresDataCoordinator = hass.data[DOMAIN][entry_id][
            "coordinator"
        ]
        user_id = call.context.user_id
        parent_name = call.data[FIELD_PARENT_NAME]
        kid_name = call.data[FIELD_KID_NAME]
        reward_name = call.data[FIELD_REWARD_NAME]

        # Map kid_name and reward_name to internal_ids
        kid_id = _get_kid_id_by_name(coordinator, kid_name)
        if not kid_id:
            LOGGER.warning("Approve Reward: Kid '%s' not found", kid_name)
            raise HomeAssistantError(f"Kid '{kid_name}' not found")

        reward_id = _get_reward_id_by_name(coordinator, reward_name)
        if not reward_id:
            LOGGER.warning("Approve Reward: Reward '%s' not found", reward_name)
            raise HomeAssistantError(f"Reward '{reward_name}' not found")

        # Check if user is authorized
        if user_id and not await is_user_authorized_for_global_action(
            hass, user_id, kid_id
        ):
            LOGGER.warning("Approve Reward: User not authorized")
            raise HomeAssistantError(
                "You are not authorized to approve rewards for this kid."
            )

        # Approve reward redemption and deduct points
        try:
            coordinator.approve_reward(
                parent_name=parent_name, kid_id=kid_id, reward_id=reward_id
            )
            LOGGER.info(
                "Reward '%s' approved for kid '%s' by parent '%s'",
                reward_name,
                kid_name,
                parent_name,
            )
            await coordinator.async_request_refresh()
        except HomeAssistantError as e:
            LOGGER.error("Approve Reward: %s", e)
            raise
        except Exception as e:
            LOGGER.error(
                "Approve Reward: Failed to approve reward '%s' for kid '%s': %s",
                reward_name,
                kid_name,
                e,
            )
            raise HomeAssistantError(
                f"Failed to approve reward '{reward_name}' for kid '{kid_name}'."
            )

    async def handle_disapprove_reward(call: ServiceCall):
        """Handle disapproving a reward."""
        entry_id = _get_first_kidschores_entry(hass)
        if not entry_id:
            LOGGER.warning("Disapprove Reward: %s", MSG_NO_ENTRY_FOUND)
            return

        coordinator: KidsChoresDataCoordinator = hass.data[DOMAIN][entry_id][
            "coordinator"
        ]
        parent_name = call.data[FIELD_PARENT_NAME]
        kid_name = call.data[FIELD_KID_NAME]
        reward_name = call.data[FIELD_REWARD_NAME]

        # Map kid_name and reward_name to internal_ids
        kid_id = _get_kid_id_by_name(coordinator, kid_name)
        if not kid_id:
            LOGGER.warning("Disapprove Reward: Kid '%s' not found", kid_name)
            raise HomeAssistantError(f"Kid '{kid_name}' not found")

        reward_id = _get_reward_id_by_name(coordinator, reward_name)
        if not reward_id:
            LOGGER.warning("Disapprove Reward: Reward '%s' not found", reward_name)
            raise HomeAssistantError(f"Reward '{reward_name}' not found")

        # Check if user is authorized
        user_id = call.context.user_id
        if user_id and not await is_user_authorized_for_global_action(
            hass, user_id, kid_id
        ):
            LOGGER.warning("Disapprove Reward: User not authorized")
            raise HomeAssistantError(
                "You are not authorized to disapprove rewards for this kid."
            )

        # Disapprove the reward
        coordinator.disapprove_reward(
            parent_name=parent_name,
            kid_id=kid_id,
            reward_id=reward_id,
        )
        LOGGER.info(
            "Reward '%s' disapproved for kid '%s' by parent '%s'",
            reward_name,
            kid_name,
            parent_name,
        )
        await coordinator.async_request_refresh()

    async def handle_apply_penalty(call: ServiceCall):
        """Handle applying a penalty."""
        entry_id = _get_first_kidschores_entry(hass)
        if not entry_id:
            LOGGER.warning("Apply Penalty: %s", MSG_NO_ENTRY_FOUND)
            return

        coordinator: KidsChoresDataCoordinator = hass.data[DOMAIN][entry_id][
            "coordinator"
        ]
        parent_name = call.data[FIELD_PARENT_NAME]
        kid_name = call.data[FIELD_KID_NAME]
        penalty_name = call.data[FIELD_PENALTY_NAME]

        # Map kid_name and penalty_name to internal_ids
        kid_id = _get_kid_id_by_name(coordinator, kid_name)
        if not kid_id:
            LOGGER.warning("Apply Penalty: Kid '%s' not found", kid_name)
            raise HomeAssistantError(f"Kid '{kid_name}' not found")

        penalty_id = _get_penalty_id_by_name(coordinator, penalty_name)
        if not penalty_id:
            LOGGER.warning("Apply Penalty: Penalty '%s' not found", penalty_name)
            raise HomeAssistantError(f"Penalty '{penalty_name}' not found")

        # Check if user is authorized
        user_id = call.context.user_id
        if user_id and not await is_user_authorized_for_global_action(
            hass, user_id, kid_id
        ):
            LOGGER.warning("Apply Penalty: User not authorized")
            raise HomeAssistantError(
                "You are not authorized to apply penalties for this kid."
            )

        # Apply penalty
        try:
            coordinator.apply_penalty(
                parent_name=parent_name, kid_id=kid_id, penalty_id=penalty_id
            )
            LOGGER.info(
                "Penalty '%s' applied for kid '%s' by parent '%s'",
                penalty_name,
                kid_name,
                parent_name,
            )
            await coordinator.async_request_refresh()
        except HomeAssistantError as e:
            LOGGER.error("Apply Penalty: %s", e)
            raise
        except Exception as e:
            LOGGER.error(
                "Apply Penalty: Failed to apply penalty '%s' for kid '%s': %s",
                penalty_name,
                kid_name,
                e,
            )
            raise HomeAssistantError(
                f"Failed to apply penalty '{penalty_name}' for kid '{kid_name}'."
            )

    async def handle_reset_all_data(call: ServiceCall):
        """Handle manually resetting ALL data in KidsChores."""
        entry_id = _get_first_kidschores_entry(hass)
        if not entry_id:
            LOGGER.warning("Reset All Data: No KidsChores entry found")
            return

        data = hass.data[DOMAIN].get(entry_id)
        if not data:
            LOGGER.warning("Reset All Data: No coordinator data found")
            return

        coordinator: KidsChoresDataCoordinator = data["coordinator"]

        # Clear everything from storage
        await coordinator.storage_manager.async_clear_data()

        # Re-init the coordinator with reload config entry
        hass.config_entries.async_reload(entry_id)

        coordinator.async_set_updated_data(coordinator._data)
        LOGGER.info("Manually reset all KidsChores data. Integration is now cleared")

    async def handle_reset_all_chores(call: ServiceCall):
        """Handle manually resetting all chores to pending, clearing claims/approvals."""
        entry_id = _get_first_kidschores_entry(hass)
        if not entry_id:
            LOGGER.warning("Reset All Chores: No KidsChores entry found")
            return

        data = hass.data[DOMAIN].get(entry_id)
        if not data:
            LOGGER.warning("Reset All Chores: No coordinator data found")
            return

        coordinator: KidsChoresDataCoordinator = data["coordinator"]

        # Loop over all chores, reset them to pending
        for chore_id, chore_info in coordinator.chores_data.items():
            chore_info["state"] = CHORE_STATE_PENDING

        # Remove all chore approvals/claims for each kid
        for kid_id, kid_info in coordinator.kids_data.items():
            kid_info["claimed_chores"] = []
            kid_info["approved_chores"] = []

        # Clear the pending approvals queue
        coordinator._data[DATA_PENDING_CHORE_APPROVALS] = []

        # Persist & notify
        coordinator._persist()
        coordinator.async_set_updated_data(coordinator._data)
        LOGGER.info("Manually reset all chores to pending, removed claims/approvals")

    # --- Register Services ---
    hass.services.async_register(
        DOMAIN, SERVICE_CLAIM_CHORE, handle_claim_chore, schema=CLAIM_CHORE_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_APPROVE_CHORE, handle_approve_chore, schema=APPROVE_CHORE_SCHEMA
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_DISAPPROVE_CHORE,
        handle_disapprove_chore,
        schema=DISAPPROVE_CHORE_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN, SERVICE_REDEEM_REWARD, handle_redeem_reward, schema=REDEEM_REWARD_SCHEMA
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_APPROVE_REWARD,
        handle_approve_reward,
        schema=APPROVE_REWARD_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_DISAPPROVE_REWARD,
        handle_disapprove_reward,
        schema=DISAPPROVE_REWARD_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN, SERVICE_APPLY_PENALTY, handle_apply_penalty, schema=APPLY_PENALTY_SCHEMA
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_RESET_ALL_DATA,
        handle_reset_all_data,
        schema=RESET_ALL_DATA_SCHEMA,
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_RESET_ALL_CHORES,
        handle_reset_all_chores,
        schema=RESET_ALL_CHORES_SCHEMA,
    )

    LOGGER.info("KidsChores services have been registered successfully")


async def async_unload_services(hass: HomeAssistant):
    """Unregister KidsChores services when unloading the integration."""
    services = [
        SERVICE_CLAIM_CHORE,
        SERVICE_APPROVE_CHORE,
        SERVICE_DISAPPROVE_CHORE,
        SERVICE_REDEEM_REWARD,
        SERVICE_DISAPPROVE_REWARD,
        SERVICE_APPLY_PENALTY,
        SERVICE_APPROVE_REWARD,
        SERVICE_RESET_ALL_DATA,
        SERVICE_RESET_ALL_CHORES,
    ]

    for service in services:
        if hass.services.has_service(DOMAIN, service):
            hass.services.async_remove(DOMAIN, service)

    LOGGER.info("KidsChores services have been unregistered")


def _get_first_kidschores_entry(hass: HomeAssistant) -> Optional[str]:
    """Retrieve the first KidsChores config entry ID."""
    domain_entries = hass.data.get(DOMAIN)
    if not domain_entries:
        return None
    return next(iter(domain_entries.keys()), None)


def _get_kid_id_by_name(
    coordinator: KidsChoresDataCoordinator, kid_name: str
) -> Optional[str]:
    """Help function to get kid_id by kid_name."""
    for kid_id, kid_info in coordinator.kids_data.items():
        if kid_info.get("name") == kid_name:
            return kid_id
    return None


def _get_chore_id_by_name(
    coordinator: KidsChoresDataCoordinator, chore_name: str
) -> Optional[str]:
    """Help function to get chore_id by chore_name."""
    for chore_id, chore_info in coordinator.chores_data.items():
        if chore_info.get("name") == chore_name:
            return chore_id
    return None


def _get_reward_id_by_name(
    coordinator: KidsChoresDataCoordinator, reward_name: str
) -> Optional[str]:
    """Help function to get reward_id by reward_name."""
    for reward_id, reward_info in coordinator.rewards_data.items():
        if reward_info.get("name") == reward_name:
            return reward_id
    return None


def _get_penalty_id_by_name(
    coordinator: KidsChoresDataCoordinator, penalty_name: str
) -> Optional[str]:
    """Help function to get penalty_id by penalty_name."""
    for penalty_id, penalty_info in coordinator.penalties_data.items():
        if penalty_info.get("name") == penalty_name:
            return penalty_id
    return None
