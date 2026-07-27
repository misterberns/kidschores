/**
 * Weekday labels for `applicable_days`, index-aligned with Python's
 * `datetime.weekday()`: 0 = Monday … 6 = Sunday. The backend stores and
 * compares these indices directly (chores today-view, reset job, streaks),
 * so the label order here IS the wire format — do not reorder.
 * (Pre-v0.16.2 the admin UI used a Sunday-first array, storing every
 * selection off by one day.)
 */
export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
