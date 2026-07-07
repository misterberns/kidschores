/**
 * Extract a user-facing string from an axios/FastAPI error.
 *
 * FastAPI validation errors (HTTP 422) return `detail` as an ARRAY of objects
 * ({ type, loc, msg, input, ctx }), not a string. Passing that array straight to
 * `setError(...)` and rendering it as a React child throws React error #31 and
 * crashes the whole page via the ErrorBoundary. This helper always returns a string.
 */
export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;

  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((d) => (typeof d === 'string' ? d : (d as { msg?: string })?.msg))
      .filter((m): m is string => typeof m === 'string' && m.trim().length > 0);
    if (messages.length > 0) {
      return messages.join(', ');
    }
  }

  const message = (err as { message?: unknown })?.message;
  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  return fallback;
}
