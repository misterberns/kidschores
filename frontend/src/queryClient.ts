import { QueryClient, MutationCache } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';

// Typed mutation meta: errorFallback replaces a per-mutation onError toast;
// suppressErrorToast opts a mutation out of the global error toast entirely.
declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      errorFallback?: string;
      suppressErrorToast?: boolean;
    };
  }
}

/** FastAPI `detail` from an error response, or null. Deliberately NOT
 *  getApiErrorMessage: that util falls through to error.message, and axios's
 *  boilerplate "Request failed with status code 400" is worse than the
 *  mutation's own errorFallback. */
function responseDetail(error: unknown): string | null {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((d) => (typeof d === 'string' ? d : (d as { msg?: string })?.msg))
      .filter((m): m is string => typeof m === 'string' && m.trim().length > 0);
    if (messages.length > 0) return messages.join(', ');
  }
  return null;
}

export function createQueryClient() {
  return new QueryClient({
    // The error toast lives on the MutationCache, NOT defaultOptions.mutations.onError:
    // cache-level onError runs for EVERY failed mutation IN ADDITION to per-mutation
    // handlers, whereas a per-mutation onError silently REPLACES a defaultOptions one
    // (TanStack v5 shallow-merge). That shadowing is how the chore-claim 400 became
    // invisible pre-v0.16.2.
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.meta?.suppressErrorToast) return;
        // Network errors, 403 and 5xx are toasted by the axios interceptor
        // (api/client.ts); 401 is handled by the auth refresh flow. Toasting
        // them here too would double-toast.
        if (!axios.isAxiosError(error) || !error.response) return;
        const status = error.response.status;
        if (status === 401 || status === 403 || status >= 500) return;
        toast.error(
          responseDetail(error) ?? mutation.meta?.errorFallback ?? 'Something went wrong. Please try again.'
        );
      },
    }),
    defaultOptions: {
      queries: {
        // Never retry 4xx — a 403/404 won't succeed on retry, and each attempt
        // re-fires the global "Access denied" toast (the kid-tablet toast storm).
        retry: (failureCount, error: unknown) => {
          if (axios.isAxiosError(error) && error.response && error.response.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
      },
    },
  });
}
