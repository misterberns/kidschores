# File: notification_action_handler.py
"""Handle notification actions from HA companion notifications.

Handles actions triggered from HA companion notifications.
When a user taps an action button (e.g., Approve, Disapprove, or Remind 30),
this module listens for the event, extracts the action and context (e.g., kid_id, chore_id),
and calls the corresponding coordinator method.
"""

from homeassistant.core import HomeAssistant, Event
from homeassistant.exceptions import HomeAssistantError

from .const import (
    NOTIFICATION_EVENT,
    ACTION_APPROVE_CHORE,
    ACTION_APPROVE_REWARD,
    ACTION_DISAPPROVE_CHORE,
    ACTION_DISAPPROVE_REWARD,
    ACTION_REMIND_30,
    DEFAULT_REMINDER_DELAY,
    LOGGER,
)
from .coordinator import KidsChoresDataCoordinator


async def async_handle_notification_action(hass: HomeAssistant, event: Event) -> None:
    """
    Handle notification actions from HA companion notifications.

    Expects event.data to include:
      - action: one of ACTION_APPROVE_CHORE, ACTION_DISAPPROVE_CHORE, ACTION_REMIND_30
      - kid_id: str
      - chore_id: str
      - Optionally, parent_name
    """
    action = event.data.get("action")
    kid_id = event.data.get("kid_id")
    chore_id = event.data.get("chore_id")
    reward_id = event.data.get("reward_id")
    parent_name = event.data.get("parent_name", "ParentOrAdmin")

    if not kid_id or not chore_id or not action:
        LOGGER.error("Notification action event missing required data: %s", event.data)
        return

    # Retrieve the coordinator.
    domain_data = hass.data.get("kidschores", {})
    if not domain_data:
        LOGGER.error("No KidsChores data found in hass.data")
        return
    # Assuming a single config entry; get its entry_id.
    entry_id = next(iter(domain_data))
    coordinator: KidsChoresDataCoordinator = domain_data[entry_id].get("coordinator")
    if not coordinator:
        LOGGER.error("No coordinator found in KidsChores data")
        return

    try:
        if action == ACTION_APPROVE_CHORE:
            await coordinator.approve_chore(
                parent_name=parent_name,
                kid_id=kid_id,
                chore_id=chore_id,
            )
        elif action == ACTION_DISAPPROVE_CHORE:
            await coordinator.disapprove_chore(
                parent_name=parent_name,
                kid_id=kid_id,
                chore_id=chore_id,
            )
        elif action == ACTION_APPROVE_REWARD:
            await coordinator.approve_reward(
                parent_name=parent_name,
                kid_id=kid_id,
                reward_id=reward_id,
            )
        elif action == ACTION_DISAPPROVE_REWARD:
            await coordinator.disapprove_reward(
                parent_name=parent_name,
                kid_id=kid_id,
                reward_id=reward_id,
            )
        elif action == ACTION_REMIND_30:
            await coordinator.remind_in_minutes(
                kid_id=kid_id,
                chore_id=chore_id,
                reward_id=reward_id,
                minutes=DEFAULT_REMINDER_DELAY,
            )
        else:
            LOGGER.error("Received unknown notification action: %s", action)
    except HomeAssistantError as err:
        LOGGER.error("Error processing notification action %s: %s", action, err)
