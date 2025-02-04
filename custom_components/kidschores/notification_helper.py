# File: notification_helper.py
"""Sends notifications using Home Assistant's notify services.

This module implements a helper for sending notifications in the KidsChores integration.
It supports sending notifications via Home Assistant’s notify services (HA Companion notifications)
and includes an optional payload of actions and extra data (to pass context like kid/chore IDs).
All texts and labels are referenced from constants.
"""

from __future__ import annotations
import logging
from typing import Optional, List, Dict

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError

from .const import DOMAIN, LOGGER


async def async_send_notification(
    hass: HomeAssistant,
    notify_service: str,
    title: str,
    message: str,
    actions: Optional[List[Dict[str, str]]] = None,
    extra_data: Optional[Dict[str, str]] = None,
    use_persistent: bool = False,
) -> None:
    """Send a notification using the specified notify service.

    Args:
        hass: The Home Assistant instance.
        notify_service: The notify service name (e.g. "notify.mobile_app_myphone").
        title: The notification title.
        message: The notification message.
        actions: Optional list of action dictionaries (each with keys "action" and "title").
        extra_data: Optional dictionary of extra data to pass (e.g. kid_id, chore_id).
        use_persistent: Whether to allow persistent notifications as a fallback.

    Raises:
        HomeAssistantError: If the service call fails.

    """
    payload = {"title": title, "message": message}
    if actions:
        payload["data"] = {"actions": actions}
    if extra_data:
        if "data" not in payload:
            payload["data"] = {}
        payload["data"].update(extra_data)
    try:
        await hass.services.async_call(
            notify_service,
            "notify",
            payload,
            blocking=True,
        )
        LOGGER.debug("Notification sent via '%s': %s", notify_service, payload)
    except Exception as err:
        LOGGER.error(
            "Failed to send notification via '%s': %s. Payload: %s",
            notify_service,
            err,
            payload,
        )
        raise HomeAssistantError(
            f"Failed to send notification via '{notify_service}': {err}"
        ) from err
