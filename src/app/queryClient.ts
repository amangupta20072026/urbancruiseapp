/**
 * ------------------------------------------------------------------
 * QueryClient — Root TanStack Query Config
 * ------------------------------------------------------------------
 * Sensible mobile defaults:
 *   - retry twice on network/server errors, never on 4xx client errors
 *   - refetch when phone regains network
 *   - no window-focus refetch (RN has no real window focus)
 *   - staleTime 30s  → background refetch on remount
 *   - gcTime 24h     → cache retained after last observer unmounts,
 *                       so persistence has something to write to disk
 *
 * IMPORTANT: gcTime must be >= persister's maxAge (see App.tsx),
 * otherwise the disk cache is discarded after 5 minutes idle and
 * cold-start warm hydration provides no benefit.
 * ------------------------------------------------------------------
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { ApiError, type ApiErrorKind } from '@api/errors';
import { toast } from '@services/toast';

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

/**
 * ------------------------------------------------------------------
 * Centralised error → toast policy
 * ------------------------------------------------------------------
 * A single decision point for "should this failure surface a toast".
 * Callers opt OUT with `meta: { silent: true }` on the query/mutation.
 *
 * Rationale by kind:
 *   unauthorized  — refresh interceptor handles it; user sees a
 *                    logout, not a toast.
 *   forbidden     — the screen that triggered it knows the domain
 *                    context better than a generic toast.
 *   notFound      — usually a routing / stale-id issue best shown
 *                    inline as an EmptyState / ErrorView.
 *   validation    — inline field errors; toast would duplicate.
 *   conflict      — inline (booking already taken, quotation revised).
 *   Everything else (network, timeout, server, rateLimited, unknown)
 *   is transient / infrastructure and benefits from a toast.
 *
 * Mutations are noisier by default: users initiated them, so a
 * failure toast is almost always the right call unless the caller
 * has its own error UI.
 * ------------------------------------------------------------------ */

const SILENT_KINDS: ReadonlySet<ApiErrorKind> = new Set([
  'unauthorized',
  'forbidden',
  'notFound',
  'validation',
  'conflict',
]);

function shouldToast(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true; // unexpected — surface it
  return !SILENT_KINDS.has(error.kind);
}

function extractMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
}

export const queryClient = new QueryClient({
  /**
   * QueryCache.onError fires for every failed query. Queries usually
   * have their own inline error UI (ErrorView / EmptyState), so we
   * only toast for the small set where a toast genuinely helps —
   * transient infra issues where the inline UI would just say
   * "try again" and the user needs a global nudge.
   */
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.silent === true) return;
      if (!shouldToast(error)) return;
      toast.error(extractMessage(error));
    },
  }),

  /**
   * MutationCache.onError fires for every failed mutation. Mutations
   * are user-initiated (tap Submit, Confirm, Pay), so a failure toast
   * is almost always right. Callers can suppress with meta.silent when
   * they own a bespoke error UI (e.g. an OTP screen showing an inline
   * "Invalid code" hint).
   */
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (mutation.meta?.silent === true) return;
      if (!shouldToast(error)) return;
      toast.error(extractMessage(error));
    },
  }),

  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 seconds
      gcTime: ONE_DAY_MS, // must be >= persister maxAge

      retry: (failureCount, error) => {
        if (error instanceof ApiError) {
          if (
            error.kind === 'unauthorized' ||
            error.kind === 'forbidden' ||
            error.kind === 'notFound' ||
            error.kind === 'validation'
          ) {
            return false;
          }
        }
        return failureCount < 2;
      },

      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * Augment TanStack Query's meta typing so both flags are type-checked
 * at call sites instead of being stringly-typed side-channels.
 *
 *   silent   — suppress the default error toast (see caches above)
 *   persist  — opt this query OUT of the disk persister (see App.tsx
 *              and queryPersister.ts). Used for infinite-scroll pages
 *              and other queries whose cache would balloon disk usage.
 */
declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: { silent?: boolean; persist?: boolean };
    mutationMeta: { silent?: boolean; persist?: boolean };
  }
}