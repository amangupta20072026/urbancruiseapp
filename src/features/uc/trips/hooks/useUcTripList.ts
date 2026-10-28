/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * useUcTripList — UC role, all trips (cursor-paginated)
 * ------------------------------------------------------------------
 * Same contract and caching model as `useUcBookingList`:
 *
 *   - TanStack `useInfiniteQuery`, one cache entry per
 *     (status, search) combination.
 *   - `keepPreviousData` so switching chips or typing never flashes
 *     an empty list.
 *   - NOT persisted to MMKV (`meta: { persist: false }`): the list
 *     spans every customer and can be very large.
 *   - Invalidate every variant after a trip mutation with:
 *       queryClient.invalidateQueries({ queryKey: queryKeys.uc.trips.all() })
 *
 * Backend contract (GET endpoints.uc.trips.list()):
 *   params:  { status, search, cursor, limit }
 *     - status: 'all' | 'upcoming' | 'ongoing' | 'completed' |
 *               'cancelled' ('cancelled' also returns no_show rows)
 *     - search: trip ID, booking ref, either city, or customer name
 *               (case-insensitive "contains")
 *   returns: { items, nextCursor, total, counts }
 *     - order:      scheduledAt DESC, id DESC (stable cursor)
 *     - nextCursor: opaque, null on the last page
 *     - total:      rows matching status + search
 *     - counts:     per-chip totals for the SAME search but
 *                   IGNORING status, so every badge stays accurate
 *
 * Until the endpoint ships, `fetchUcTrips` serves the fixture with
 * the identical shape. To go live: delete the TEMP block, uncomment
 * the apiClient call, delete src/mocks/fixtures/ucTrips.ts.
 * ------------------------------------------------------------------
 */

import { useMemo } from 'react';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

// Uncomment when backend is ready:
// import { apiClient } from '@api/axios';
// import { endpoints } from '@api/endpoints';
import { queryKeys } from '@constants/queryKeys';
import { getFixtureUcTrips } from '@mocks/fixtures/ucTrips';
import { delayLikeApi } from '@mocks/helpers/delay';

import type {
  UcTripListItem,
  UcTripStatusCounts,
  UcTripStatusFilter,
} from '../types';

const PAGE_SIZE = 20;

export type UseUcTripListArgs = {
  status?: UcTripStatusFilter;
  search?: string;
};

type TripListQueryParams = {
  status: UcTripStatusFilter;
  search: string;
  cursor: string | null;
  limit: number;
};

type TripListPage = {
  items: UcTripListItem[];
  /** Opaque pointer to the next batch. `null` means end of list. */
  nextCursor: string | null;
  /** Rows matching status + search. */
  total: number;
  /** Per-chip totals for search, ignoring status. */
  counts: UcTripStatusCounts;
};

const EMPTY_COUNTS: UcTripStatusCounts = {
  all: 0,
  upcoming: 0,
  ongoing: 0,
  completed: 0,
  cancelled: 0,
};

/* ------------------------------------------------------------------ */
/* Filter helpers — exported for unit tests                           */
/* ------------------------------------------------------------------ */

/** Whether a trip belongs under a chip. no_show → Cancelled. */
export function matchesTripStatusFilter(
  t: Pick<UcTripListItem, 'status'>,
  filter: UcTripStatusFilter,
): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'cancelled':
      return t.status === 'cancelled' || t.status === 'no_show';
    default:
      return t.status === filter;
  }
}

/** Mirrors the server rule in the header. Empty needle matches all. */
export function matchesTripSearch(
  t: Pick<
    UcTripListItem,
    'tripRef' | 'bookingRef' | 'fromCity' | 'toCity' | 'customerName'
  >,
  needle: string,
): boolean {
  const q = needle.trim().toLowerCase();
  if (!q) return true;
  return (
    t.tripRef.toLowerCase().includes(q) ||
    t.bookingRef.toLowerCase().includes(q) ||
    t.fromCity.toLowerCase().includes(q) ||
    t.toCity.toLowerCase().includes(q) ||
    t.customerName.toLowerCase().includes(q)
  );
}

/* ------------------------------------------------------------------ */
/* Fetch                                                              */
/* ------------------------------------------------------------------ */

async function fetchUcTrips(
  params: TripListQueryParams,
): Promise<TripListPage> {
  // TODO(backend): replace the TEMP block below with:
  // const { data } = await apiClient.get<TripListPage>(
  //   endpoints.uc.trips.list(),
  //   {
  //     params: {
  //       status: params.status,
  //       search: params.search,
  //       cursor: params.cursor,
  //       limit: params.limit,
  //     },
  //   },
  // );
  // return data;

  /* ---------------------------- TEMP ---------------------------- */
  await delayLikeApi();

  const { status, search, cursor, limit } = params;
  const base = getFixtureUcTrips().filter(t => matchesTripSearch(t, search));

  const counts: Record<UcTripStatusFilter, number> = {
    ...EMPTY_COUNTS,
    all: base.length,
  };
  for (const t of base) {
    if (t.status === 'no_show') counts.cancelled += 1;
    else counts[t.status] += 1;
  }

  // Fixture is already sorted scheduledAt DESC, id DESC.
  const matched =
    status === 'all'
      ? base
      : base.filter(t => matchesTripStatusFilter(t, status));

  const start = cursor ? Number(cursor) : 0;
  const items = matched.slice(start, start + limit);
  const nextIndex = start + items.length;

  return {
    items,
    nextCursor: nextIndex < matched.length ? String(nextIndex) : null,
    total: matched.length,
    counts,
  };
  /* -------------------------- END TEMP -------------------------- */
}

/* ------------------------------------------------------------------ */
/* Hook                                                               */
/* ------------------------------------------------------------------ */

export function useUcTripList({
  status = 'all',
  search = '',
}: UseUcTripListArgs = {}) {
  const query = useInfiniteQuery<TripListPage, Error>({
    queryKey: queryKeys.uc.trips.list({ status, search }),
    queryFn: ({ pageParam }) =>
      fetchUcTrips({
        status,
        search,
        cursor: pageParam as string | null,
        limit: PAGE_SIZE,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => lastPage.nextCursor,
    placeholderData: keepPreviousData,
    meta: { persist: false },
  });

  const data = useMemo(
    () => query.data?.pages.flatMap(p => p.items) ?? [],
    [query.data],
  );

  const firstPage = query.data?.pages[0];

  return {
    data,
    total: firstPage?.total ?? 0,
    /** Undefined until the first page lands, so chips show no "0" flicker. */
    counts: firstPage?.counts,
    isLoading: query.isPending,
    // Pull-to-refresh only. A chip/search change also fetches, but it
    // shows the previous rows as placeholder — not a refresh.
    isRefreshing:
      query.isFetching &&
      !query.isPending &&
      !query.isFetchingNextPage &&
      !query.isPlaceholderData,
    /** True while a new chip/search result loads over the old rows. */
    isSwitching: query.isPlaceholderData && query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: () => {
      void query.fetchNextPage();
    },
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
  };
}
