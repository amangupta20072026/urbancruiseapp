/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * useCustomerList — UC role, customers list (cursor-paginated)
 * ------------------------------------------------------------------
 * Single source of truth for "the list of UC customers for a given
 * search/filter combination." Backed by TanStack Query's
 * useInfiniteQuery, so:
 *
 *   - each (search, filters) combo gets its own cache entry that
 *     accumulates pages as the user scrolls, remembered across
 *     screen mounts
 *   - warm start rehydrates from MMKV (see App.tsx)
 *   - a mutation elsewhere can invalidate all list variants with:
 *       queryClient.invalidateQueries({
 *         queryKey: queryKeys.uc.customers.all(),
 *       })
 *   - `keepPreviousData` prevents a spinner flash when search/filters
 *     change — the old result stays visible while the new one fetches
 *
 * Why cursor, not page number:
 *   At 1,00,000+ customers, offset pagination (LIMIT/OFFSET) forces
 *   the database to scan and discard every row before the offset —
 *   it gets slower the further in you page. A cursor (an opaque
 *   pointer to "everything after this row") stays fast at any depth
 *   and is what the FlashList infinite-scroll UI needs anyway: it
 *   only ever asks for "the next batch," never "page 4,812."
 *
 * Backend integration:
 *   The real endpoint is registered at endpoints.uc.customers.list()
 *   and is expected to accept { search, filters, cursor, limit } and
 *   return { items, nextCursor, total } — nextCursor is `null` once
 *   the backend has no more rows to give. Until the backend is
 *   ready, the queryFn falls back to fixture data with the same
 *   shape, so the screen works today.
 *
 *   To go live: delete the TEMP mock block inside fetchUcCustomers
 *   and uncomment the apiClient.get call.
 * ------------------------------------------------------------------
 */

import { useMemo } from 'react';
import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';

// Uncomment when backend is ready:
// import { apiClient } from '@api/axios';
// import { endpoints } from '@api/endpoints';
import { queryKeys } from '@constants/queryKeys';
import { fixtureUcCustomersAll } from '@mocks/fixtures/ucCustomers';
import { delayLikeApi } from '@mocks/helpers/delay';

import {
  DEFAULT_CUSTOMER_FILTERS,
  type Customer,
  type CustomerFilters,
} from '../types';

const PAGE_SIZE = 20;

export type UseCustomerListArgs = {
  search?: string;
  filters?: CustomerFilters;
};

type CustomerListQueryParams = {
  search: string;
  filters: CustomerFilters;
  cursor: string | null;
  limit: number;
};

type CustomerListPage = {
  items: Customer[];
  /** Opaque pointer to the next batch. `null` means end of list. */
  nextCursor: string | null;
  /** Total rows matching the current search/filters (for "Showing X of Y"). */
  total: number;
};

/* ------------------------------------------------------------------ */
/* Filter helpers                                                     */
/* ------------------------------------------------------------------ */

/** Inclusive of dateFrom, exclusive of the day AFTER dateTo. */
function withinDateRange(
  createdAt: string,
  dateFrom: string | null,
  dateTo: string | null,
): boolean {
  const t = new Date(createdAt).getTime();

  if (dateFrom) {
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    if (t < from.getTime()) return false;
  }

  if (dateTo) {
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    if (t > to.getTime()) return false;
  }

  return true;
}

function inTripsBucket(
  totalBookings: number,
  bucket: CustomerFilters['tripsBucket'],
): boolean {
  switch (bucket) {
    case 'all':
      return true;
    case 'none':
      return totalBookings === 0;
    case '1to10':
      return totalBookings >= 1 && totalBookings <= 10;
    case '10plus':
      return totalBookings > 10;
  }
}

function sortCustomers(
  items: Customer[],
  sortBy: CustomerFilters['sortBy'],
): Customer[] {
  const copy = [...items];
  switch (sortBy) {
    case 'newest':
      return copy.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    case 'oldest':
      return copy.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    case 'nameAsc':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'mostTrips':
      return copy.sort((a, b) => b.totalBookings - a.totalBookings);
  }
}

/* ------------------------------------------------------------------ */
/* Fetch                                                              */
/* ------------------------------------------------------------------ */

async function fetchUcCustomers(
  params: CustomerListQueryParams,
): Promise<CustomerListPage> {
  // TODO(backend): replace mock block below with:
  // const { data } = await apiClient.get<CustomerListPage>(
  //   endpoints.uc.customers.list(),
  //   { params },
  // );
  // return data;
  //
  // The backend should implement cursor pagination with a
  // deterministic sort (e.g. WHERE (sort_key, id) > (:cursorSortKey,
  // :cursorId) ORDER BY sort_key, id LIMIT :limit) so cursors stay
  // stable even if rows are inserted between requests.

  await delayLikeApi();

  const { search, filters, cursor, limit } = params;
  const q = search.trim().toLowerCase();

  const matched = fixtureUcCustomersAll.filter(c => {
    // Text search
    if (q) {
      const hit =
        c.name.toLowerCase().includes(q) ||
        c.phoneIndia.includes(q) ||
        c.phoneGlobal.includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        (c.companyName?.toLowerCase().includes(q) ?? false);
      if (!hit) return false;
    }

    // Customer category filter
    if (filters.type !== 'all' && c.category !== filters.type) return false;

    // Registration date range
    if (!withinDateRange(c.createdAt, filters.dateFrom, filters.dateTo))
      return false;

    // Trips bucket
    if (!inTripsBucket(c.totalBookings, filters.tripsBucket)) return false;

    return true;
  });

  const sorted = sortCustomers(matched, filters.sortBy);

  // TEMP mock cursor: an opaque index into the sorted/filtered set.
  // A real cursor-based backend would encode the last row's sort key
  // + id instead — the shape returned to the hook is identical either
  // way, so this swap is invisible to the screen.
  const start = cursor ? Number(cursor) : 0;
  const items = sorted.slice(start, start + limit);
  const nextIndex = start + items.length;
  const nextCursor = nextIndex < sorted.length ? String(nextIndex) : null;

  return { items, nextCursor, total: sorted.length };
}

/* ------------------------------------------------------------------ */
/* Hook                                                               */
/* ------------------------------------------------------------------ */

export function useCustomerList({
  search = '',
  filters = DEFAULT_CUSTOMER_FILTERS,
}: UseCustomerListArgs = {}) {
  const query = useInfiniteQuery<CustomerListPage, Error>({
    queryKey: queryKeys.uc.customers.list({ search, filters }),
    queryFn: ({ pageParam }) =>
      fetchUcCustomers({
        search,
        filters,
        cursor: pageParam as string | null,
        limit: PAGE_SIZE,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => lastPage.nextCursor,
    placeholderData: keepPreviousData,
    // Uncomment if this list shouldn't be persisted to MMKV
    // (e.g. contains sensitive PII that shouldn't survive process kills):
    // meta: { persist: false },
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
