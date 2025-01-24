# File: storage_manager.py
"""Handles persistent data storage for the KidsChores integration.

Uses Home Assistant's Storage helper to save and load chore-related data, ensuring
the state is preserved across restarts. This includes data for kids, chores,
badges, rewards, penalties, and their statuses.
"""

from homeassistant.helpers.storage import Store
from .const import (
    LOGGER,
    STORAGE_KEY,
    STORAGE_VERSION,
    DATA_KIDS,
    DATA_CHORES,
    DATA_BADGES,
    DATA_REWARDS,
    DATA_PENALTIES,
    DATA_PARENTS,
)


class KidsChoresStorageManager:
    """Manages loading, saving, and accessing data from Home Assistant's storage.

    Utilizes internal_id as the primary key for all entities.
    """

    def __init__(self, hass, storage_key=STORAGE_KEY):
        """Initialize the storage manager.

        Args:
            hass: Home Assistant core object.
            storage_key: Key to identify storage location (default: STORAGE_KEY).

        """
        self.hass = hass
        self._storage_key = storage_key
        self._store = Store(hass, STORAGE_VERSION, storage_key)
        self._data = {}  # In-memory data cache for quick access.

    async def async_initialize(self):
        """Load data from storage during startup.

        If no data exists, initializes with an empty structure.
        """
        LOGGER.debug("KidsChoresStorageManager: Loading data from storage")
        existing_data = await self._store.async_load()

        if existing_data is None:
            # No existing data, create a new default structure.
            LOGGER.info("No existing storage found; initializing new data")
            self._data = {
                DATA_KIDS: {},  # Dictionary of kids keyed by internal_id.
                DATA_CHORES: {},  # Dictionary of chores keyed by internal_id.
                DATA_BADGES: {},  # Dictionary of badges keyed by internal_id.
                DATA_REWARDS: {},  # Dictionary of rewards keyed by internal_id.
                DATA_PENALTIES: {},  # Dictionary of penalties keyed by internal_id.
                DATA_PARENTS: {},  # Dictionary of parents keyed by internal_id.
            }
        else:
            # Load existing data into memory.
            self._data = existing_data
            LOGGER.info("Storage data loaded successfully")

    @property
    def data(self):
        """Retrieve the in-memory data cache.

        Returns:
            dict: The cached data structure.

        """
        return self._data

    def get_data(self):
        """Retrieve the data structure (alternative getter).

        Returns:
            dict: The cached data structure.

        """
        return self._data

    def set_data(self, new_data: dict):
        """Replace the entire in-memory data structure.

        Args:
            new_data (dict): New data structure to store.

        """
        self._data = new_data

    def get_kids(self):
        """Retrieve the kids data.

        Returns:
            dict: Kids data keyed by internal_id.

        """
        return self._data.get(DATA_KIDS, {})

    def get_parents(self):
        """Retrieve the parents data.

        Returns:
            dict: Parents data keyed by internal_id.

        """
        return self._data.get(DATA_PARENTS, {})

    def get_chores(self):
        """Retrieve the chores data.

        Returns:
            dict: Chores data keyed by internal_id.

        """
        return self._data.get(DATA_CHORES, {})

    def get_badges(self):
        """Retrieve the badges data.

        Returns:
            dict: Badges data keyed by internal_id.

        """
        return self._data.get(DATA_BADGES, {})

    def get_rewards(self):
        """Retrieve the rewards data.

        Returns:
            dict: Rewards data keyed by internal_id.

        """
        return self._data.get(DATA_REWARDS, {})

    def get_penalties(self):
        """Retrieve the penalties data.

        Returns:
            dict: Penalties data keyed by internal_id.

        """
        return self._data.get(DATA_PENALTIES, {})

    async def link_user_to_kid(self, user_id, kid_id):
        """Link a Home Assistant user ID to a specific kid by internal_id."""

        if "linked_users" not in self._data:
            self._data["linked_users"] = {}
        self._data["linked_users"][user_id] = kid_id
        await self._save()

    async def unlink_user(self, user_id):
        """Unlink a Home Assistant user ID from any kid."""

        if "linked_users" in self._data and user_id in self._data["linked_users"]:
            del self._data["linked_users"][user_id]
            await self._save()

    async def get_linked_kids(self):
        """Get all linked users and their associated kids."""

        return self._data.get("linked_users", {})

    async def async_save(self):
        """Save the current data structure to storage asynchronously.

        Logs errors if the operation fails.
        """
        try:
            await self._store.async_save(self._data)
            LOGGER.info("Data saved successfully to storage")
        except Exception as e:
            LOGGER.error("Failed to save data to storage: %s", e)

    async def async_clear_data(self):
        """Clear all stored data and reset to default structure.

        This can be used for a full reset if required.
        """
        LOGGER.warning("Clearing all KidsChores data and resetting storage")
        self._data = {
            DATA_KIDS: {},
            DATA_CHORES: {},
            DATA_BADGES: {},
            DATA_REWARDS: {},
            DATA_PARENTS: {},
            DATA_PENALTIES: {},
        }
        await self.async_save()

    async def async_update_data(self, key, value):
        """Update a specific section of the data structure.

        Args:
            key (str): Section to update (e.g., DATA_KIDS).
            value (dict): New value for the specified section.

        """
        if key in self._data:
            LOGGER.debug("Updating data for key: %s", key)
            self._data[key] = value
            await self.async_save()
        else:
            LOGGER.warning("Attempted to update unknown data key: %s", key)
