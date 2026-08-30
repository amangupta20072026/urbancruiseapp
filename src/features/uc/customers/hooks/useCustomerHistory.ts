/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * useCustomerHistory — trip history for a single UC customer
 * ------------------------------------------------------------------
 * Backed by TanStack Query's useInfiniteQuery, mirroring
 * `useCustomerList` exactly:
 *
 *   - each (customerId, filter) combo gets its own cache entry
 *     that accumulates pages as the user scrolls, remembered
 *     across screen mounts
 *   - warm start rehydrates from MMKV (see App.tsx)
 *   - a mutation elsewhere (e.g. after a new trip lands) can
 *     invalidate one customer's history with:
 *       queryClient.invalidateQueries({
 *         queryKey: queryKeys.uc.customers.history.all(customerId),
 *       })
 *   - `keepPreviousData` prevents a spinner flash when the filter
 *     changes — the old result stays visible while the new one fetches
 *
 * Filter semantics:
 *   - 'all' returns everything.
 *   - 'completed' returns only status='completed'.
 *   - 'cancelled' returns status='cancelled' OR 'no_show' — both
 *     are "trip didn't happen" from the customer's POV, and
 *     splitting no_show into its own chip would clutter the UI.
 *   - 'upcoming' returns status='upcoming' OR 'in_progress' —
 *     both are "future/not-yet-done" from the customer's POV.
 *
 * Backend integration:
 *   The real endpoint (once ready) is expected to accept
 *   { customerId, status, cursor, limit } and return
 *   { items, nextCursor, total }. Until then the queryFn reads
 *   from the deterministic fixture generator.
 *
 *   To go live:
 *     1. Delete the TEMP mock block inside fetchCustomerHistory.
 *     2. Uncomment the apiClient.get call.
 *     3. Delete src/mocks/data/customerHistory.ts and
 *        src/mocks/fixtures/ucCustomerHistory.ts.
 * ------------------------------------------------------------------
 */

import { useMemo } from 'react';
import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';

// Uncomment when backend is ready:
// import { apiClient } from '@api/axios';
// import { endpoints } from '@api/endpoints';
import { queryKeys } from '@constants/queryKeys';
import { getFixtureTripsForCustomer } from '@mocks/fixtures/ucCustomerHistory';
import { delayLikeApi } from '@mocks/helpers/delay';

import type { HistoryStatusFilter, Trip } from '../types';

const PAGE_SIZE = 20;

export type UseCustomerHistoryArgs = {
  customerId: string;
  status?: HistoryStatusFilter;
};

type HistoryPage = {
  items: Trip[];
  /** Opaque pointer to the next batch. `null` means end of list. */
  nextCursor: string | null;
  /** Total rows matching the current filter (for "Showing X of Y"). */
  total: number;
};

type HistoryQueryParams = {
  customerId: string;
  status: HistoryStatusFilter;
  cursor: string | null;
  limit: number;
};

/* ------------------------------------------------------------------ */
/* Filter helper                                                      */
/* ------------------------------------------------------------------ */

function matchesStatus(trip: Trip, status: HistoryStatusFilter): boolean {
  switch (status) {
    case 'all':
      return true;
    case 'completed':
      return trip.status === 'completed';
    case 'cancelled':
      return trip.status === 'cancelled' || trip.status === 'no_show';
    case 'upcoming':
      return trip.status === 'upcoming' || trip.status === 'in_progress';
  }
}

/* ------------------------------------------------------------------ */
/* Fetch                                                              */
/* ------------------------------------------------------------------ */

async function fetchCustomerHistory(
  params: HistoryQueryParams,
): Promise<HistoryPage> {
  // TODO(backend): replace mock block below with:
  //
  // const { data } = await apiClient.get<HistoryPage>(
  //   endpoints.uc.customers.history(params.customerId),
  //   { params: { status: params.status, cursor: params.cursor, limit: params.limit } },
  // );
  // return data;
  //
  // Backend should implement cursor pagination with a deterministic
  // sort (WHERE (scheduledAt, id) < (:cursorSortKey, :cursorId)
  // ORDER BY scheduledAt DESC, id DESC LIMIT :limit) so cursors stay
  // stable even if rows are inserted between requests.

  await delayLikeApi();

  const { customerId, status, cursor, limit } = params;

  const all = getFixtureTripsForCustomer(customerId);
  const matched = all.filter(t => matchesStatus(t, status));

  // Mock cursor: opaque index into the filtered set. Real backend
  // encodes the last row's sort key + id — same shape from the hook's
  // POV, so this is invisible to callers.
  const start = cursor ? Number(cursor) : 0;
  const items = matched.slice(start, start + limit);
  const nextIndex = start + items.length;
  const nextCursor = nextIndex < matched.length ? String(nextIndex) : null;

  return { items, nextCursor, total: matched.length };
}

/* ------------------------------------------------------------------ */
/* Hook                                                               */
/* ------------------------------------------------------------------ */

export function useCustomerHistory({
  customerId,
  status = 'all',
}: UseCustomerHistoryArgs) {
  const query = useInfiniteQuery<HistoryPage, Error>({
    queryKey: queryKeys.uc.customers.history.list(customerId, { status }),
    queryFn: ({ pageParam }) =>
      fetchCustomerHistory({
        customerId,
        status,
        cursor: pageParam as string | null,
        limit: PAGE_SIZE,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => lastPage.nextCursor,
    placeholderData: keepPreviousData,
    // Trip history can be large (300+ trips for corporate customers).
    // Persisting it to MMKV would bloat cold-start reads. Skip persistence;
    // the query is cheap to re-run and users rarely land here without
    // going through the list screen first (which is warm).
    meta: { persist: false },
    // Don't run until we have a customerId — protects against transient
    // route-mount states where params are undefined.
    enabled: customerId.length > 0,
  });

  const data = useMemo(
    () => query.data?.pages.flatMap(p => p.items) ?? [],
    [query.data],
  );

  const total = query.data?.pages[0]?.total ?? 0;

  return {
    data,
    total,
    isLoading: query.isPending,
    isRefreshing:
      query.isFetching && !query.isPending && !query.isFetchingNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: () => {
      void query.fetchNextPage();
    },
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
    refresh: () => {
      void query.refetch();
    },
  };
}

/* ------------------------------------------------------------------ */
/* Status counts — cheap synchronous read, updates when filter fires  */
/* ------------------------------------------------------------------ */

/**
 * Per-status counts for the chip row.
 *
 * Reads directly from the mock corpus — no query, no cache, no
 * loading state. When the backend goes live this becomes a real
 * lightweight endpoint (e.g. GET /uc/customers/:id/history/counts
 * returning { all, completed, cancelled, upcoming }) — same
 * return shape, so the chip row doesn't change.
 */
export function useCustomerHistoryCounts(
  customerId: string,
): Record<HistoryStatusFilter, number> {
  return useMemo(() => {
    if (!customerId) {
      return { all: 0, completed: 0, cancelled: 0, upcoming: 0 };
    }
    const trips = getFixtureTripsForCustomer(customerId);
    let completed = 0;
    let cancelled = 0;
    let upcoming = 0;
    for (const t of trips) {
      if (t.status === 'completed') completed += 1;
      else if (t.status === 'cancelled' || t.status === 'no_show')
        cancelled += 1;
      else if (t.status === 'upcoming' || t.status === 'in_progress')
        upcoming += 1;
    }
    return { all: trips.length, completed, cancelled, upcoming };
  }, [customerId]);
}
