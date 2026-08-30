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

import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@api/errors';

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

export const queryClient = new QueryClient({
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
