/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * useUcBookingList — UC role, all bookings (cursor-paginated)
 * ------------------------------------------------------------------
 * Same contract and caching model as `useUcQuotationList`:
 *
 *   - TanStack `useInfiniteQuery`, one cache entry per
 *     (status, search) combination.
 *   - `keepPreviousData` so switching chips or typing never flashes
 *     an empty list.
 *   - NOT persisted to MMKV (`meta: { persist: false }`): this list
 *     spans every customer and can be very large — same choice as
 *     the vendors / staff / drivers lists and customer history.
 *   - Invalidate every variant after a booking mutation with:
 *       queryClient.invalidateQueries({
 *         queryKey: queryKeys.uc.bookings.all(),
 *       })
 *
 * Backend contract (GET endpoints.uc.bookings.list()):
 *   params:  { status, search, cursor, limit }
 *     - status: 'all' | 'upcoming' | 'ongoing' | 'completed' |
 *               'cancelled' ('cancelled' also returns no_show rows)
 *     - search: customer name, booking ref, city, or a COMPLETE
 *               phone number (partial digits must not match — the
 *               app masks phones, so partial matching would leak
 *               the hidden digits)
 *   returns: { items, nextCursor, total, counts }
 *     - order:      scheduledAt DESC, id DESC (stable cursor)
 *     - nextCursor: opaque, null on the last page
 *     - total:      rows matching status + search
 *     - counts:     per-chip totals for the SAME search but
 *                   IGNORING status, so every badge stays accurate
 *
 * Until the endpoint ships, `fetchUcBookings` serves the fixture with
 * the identical shape. To go live: delete the TEMP block, uncomment
 * the apiClient call, delete src/mocks/fixtures/ucBookings.ts.
 * ------------------------------------------------------------------
 */

import { useMemo } from 'react';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

// Uncomment when backend is ready:
// import { apiClient } from '@api/axios';
// import { endpoints } from '@api/endpoints';
import { queryKeys } from '@constants/queryKeys';
import { phoneMatchesQuery } from '@shared/utils';
import { getFixtureUcBookings } from '@mocks/fixtures/ucBookings';
import { delayLikeApi } from '@mocks/helpers/delay';

import type {
  UcBookingListItem,
  UcBookingStatusCounts,
  UcBookingStatusFilter,
} from '../types';

const PAGE_SIZE = 20;

export type UseUcBookingListArgs = {
  status?: UcBookingStatusFilter;
  search?: string;
};

type BookingListQueryParams = {
  status: UcBookingStatusFilter;
  search: string;
  cursor: string | null;
  limit: number;
};

type BookingListPage = {
  items: UcBookingListItem[];
  /** Opaque pointer to the next batch. `null` means end of list. */
  nextCursor: string | null;
  /** Rows matching status + search. */
  total: number;
  /** Per-chip totals for search, ignoring status. */
  counts: UcBookingStatusCounts;
};

const EMPTY_COUNTS: UcBookingStatusCounts = {
  all: 0,
  upcoming: 0,
  ongoing: 0,
  completed: 0,
  cancelled: 0,
};

/* ------------------------------------------------------------------ */
/* Filter helpers — exported for unit tests                           */
/* ------------------------------------------------------------------ */

/** Whether a booking belongs under a chip. no_show → Cancelled. */
export function matchesStatusFilter(
  b: Pick<UcBookingListItem, 'status'>,
  filter: UcBookingStatusFilter,
): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'cancelled':
      return b.status === 'cancelled' || b.status === 'no_show';
    default:
      return b.status === filter;
  }
}

/** Mirrors the server rule in the header. Empty needle matches all. */
export function matchesBookingSearch(
  b: Pick<
    UcBookingListItem,
    'customerName' | 'customerPhone' | 'bookingRef' | 'fromCity' | 'toCity'
  >,
  needle: string,
): boolean {
  const q = needle.trim();
  if (!q) return true;
  const lower = q.toLowerCase();
  return (
    b.customerName.toLowerCase().includes(lower) ||
    b.bookingRef.toLowerCase().includes(lower) ||
    b.fromCity.toLowerCase().includes(lower) ||
    b.toCity.toLowerCase().includes(lower) ||
    phoneMatchesQuery(b.customerPhone, q)
  );
}

/* ------------------------------------------------------------------ */
/* Fetch                                                              */
/* ------------------------------------------------------------------ */

async function fetchUcBookings(
  params: BookingListQueryParams,
): Promise<BookingListPage> {
  // TODO(backend): replace the TEMP block below with:
  // const { data } = await apiClient.get<BookingListPage>(
  //   endpoints.uc.bookings.list(),
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
  const base = getFixtureUcBookings().filter(b =>
    matchesBookingSearch(b, search),
  );

  const counts: Record<UcBookingStatusFilter, number> = {
    ...EMPTY_COUNTS,
    all: base.length,
  };
  for (const b of base) {
    if (b.status === 'no_show') counts.cancelled += 1;
    else counts[b.status] += 1;
  }

  // Fixture is already sorted scheduledAt DESC, id DESC.
  const matched =
    status === 'all' ? base : base.filter(b => matchesStatusFilter(b, status));

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

export function useUcBookingList({
  status = 'all',
  search = '',
}: UseUcBookingListArgs = {}) {
  const query = useInfiniteQuery<BookingListPage, Error>({
    queryKey: queryKeys.uc.bookings.list({ status, search }),
    queryFn: ({ pageParam }) =>
      fetchUcBookings({
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
