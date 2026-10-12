/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * useUcQuotationList — UC role, quotations list (cursor-paginated)
 * ------------------------------------------------------------------
 * Same contract and caching model as `useCustomerList`:
 *
 *   - TanStack `useInfiniteQuery`, one cache entry per
 *     (status, search, filters) combination, persisted to MMKV for a
 *     warm start (see App.tsx).
 *   - `keepPreviousData` so switching chips or typing never flashes
 *     an empty list — the previous result stays until the new one
 *     lands.
 *   - Invalidate every variant after a mutation with:
 *       queryClient.invalidateQueries({
 *         queryKey: queryKeys.uc.quotations.all(),
 *       })
 *
 * Backend contract (GET endpoints.uc.quotations.list()):
 *   params:  { status, search, serviceType, tripType, sortBy, cursor, limit }
 *   returns: { items, nextCursor, total, counts }
 *     - nextCursor: opaque, null on the last page
 *     - total:      rows matching ALL params (drives "Showing X of Y")
 *     - counts:     per-status totals for the SAME search + sheet
 *                   filters but IGNORING `status`, so every chip
 *                   badge stays accurate whichever chip is selected
 *
 * Until the endpoint ships, `fetchUcQuotations` serves the fixture
 * with the identical shape. To go live: delete the TEMP block and
 * uncomment the apiClient call.
 * ------------------------------------------------------------------
 */

import { useMemo } from 'react';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

// Uncomment when backend is ready:
// import { apiClient } from '@api/axios';
// import { endpoints } from '@api/endpoints';
import { queryKeys } from '@constants/queryKeys';
import { fixtureUcQuotationsAll } from '@mocks/fixtures/ucQuotations';
import { delayLikeApi } from '@mocks/helpers/delay';

import {
  DEFAULT_UC_QUOTATION_FILTERS,
  UC_SERVICE_TYPE_LABEL,
  type UcQuotationFilters,
  type UcQuotationListItem,
  type UcQuotationStatusCounts,
  type UcQuotationStatusFilter,
} from '../types';

const PAGE_SIZE = 15;

export type UseUcQuotationListArgs = {
  status?: UcQuotationStatusFilter;
  search?: string;
  filters?: UcQuotationFilters;
};

type QuotationListQueryParams = {
  status: UcQuotationStatusFilter;
  search: string;
  filters: UcQuotationFilters;
  cursor: string | null;
  limit: number;
};

type QuotationListPage = {
  items: UcQuotationListItem[];
  /** Opaque pointer to the next batch. `null` means end of list. */
  nextCursor: string | null;
  /** Rows matching status + search + filters. */
  total: number;
  /** Per-status totals for search + filters, ignoring status. */
  counts: UcQuotationStatusCounts;
};

const EMPTY_COUNTS: UcQuotationStatusCounts = {
  all: 0,
  draft: 0,
  sent: 0,
  accepted: 0,
  rejected: 0,
};

/* ------------------------------------------------------------------ */
/* Mock helpers (TEMP — server does this once the endpoint ships)     */
/* ------------------------------------------------------------------ */

/** Digits-only comparison so "98765 43210", "9876543210" and "+91…" all match. */
function digitsOf(s: string): string {
  return s.replace(/\D/g, '');
}

function matchesSearch(q: UcQuotationListItem, needle: string): boolean {
  if (!needle) return true;
  const lower = needle.toLowerCase();
  if (q.customerName.toLowerCase().includes(lower)) return true;
  if (q.quotationNumber.toLowerCase().includes(lower.replace(/^#/, '')))
    return true;
  if (q.stops.some(s => s.toLowerCase().includes(lower))) return true;
  if (UC_SERVICE_TYPE_LABEL[q.serviceType].toLowerCase().includes(lower))
    return true;
  const needleDigits = digitsOf(needle);
  return (
    needleDigits.length >= 3 && digitsOf(q.customerPhone).includes(needleDigits)
  );
}

function matchesSheetFilters(
  q: UcQuotationListItem,
  f: UcQuotationFilters,
): boolean {
  if (f.serviceType !== 'all' && q.serviceType !== f.serviceType) return false;
  if (f.tripType !== 'all' && q.tripType !== f.tripType) return false;
  return true;
}

function sortQuotations(
  items: UcQuotationListItem[],
  sortBy: UcQuotationFilters['sortBy'],
): UcQuotationListItem[] {
  const copy = [...items];
  const time = (iso: string) => new Date(iso).getTime();
  switch (sortBy) {
    case 'newest':
      return copy.sort((a, b) => time(b.createdAt) - time(a.createdAt));
    case 'oldest':
      return copy.sort((a, b) => time(a.createdAt) - time(b.createdAt));
    case 'travelSoonest':
      return copy.sort((a, b) => time(a.travelDate) - time(b.travelDate));
    case 'amountHigh':
      // Unpriced drafts sink to the bottom.
      return copy.sort((a, b) => (b.amountPaise ?? -1) - (a.amountPaise ?? -1));
  }
}

/* ------------------------------------------------------------------ */
/* Fetch                                                              */
/* ------------------------------------------------------------------ */

async function fetchUcQuotations(
  params: QuotationListQueryParams,
): Promise<QuotationListPage> {
  // TODO(backend): replace the TEMP block below with:
  // const { data } = await apiClient.get<QuotationListPage>(
  //   endpoints.uc.quotations.list(),
  //   {
  //     params: {
  //       status: params.status,
  //       search: params.search,
  //       serviceType: params.filters.serviceType,
  //       tripType: params.filters.tripType,
  //       sortBy: params.filters.sortBy,
  //       cursor: params.cursor,
  //       limit: params.limit,
  //     },
  //   },
  // );
  // return data;

  /* ---------------------------- TEMP ---------------------------- */
  await delayLikeApi();

  const { status, search, filters, cursor, limit } = params;
  const needle = search.trim();

  const base = fixtureUcQuotationsAll.filter(
    q => matchesSearch(q, needle) && matchesSheetFilters(q, filters),
  );

  const counts: Record<UcQuotationStatusFilter, number> = {
    ...EMPTY_COUNTS,
    all: base.length,
  };
  for (const q of base) counts[q.status] += 1;

  const matched =
    status === 'all' ? base : base.filter(q => q.status === status);
  const sorted = sortQuotations(matched, filters.sortBy);

  const start = cursor ? Number(cursor) : 0;
  const items = sorted.slice(start, start + limit);
  const nextIndex = start + items.length;

  return {
    items,
    nextCursor: nextIndex < sorted.length ? String(nextIndex) : null,
    total: sorted.length,
    counts,
  };
  /* -------------------------- END TEMP -------------------------- */
}

/* ------------------------------------------------------------------ */
/* Hook                                                               */
/* ------------------------------------------------------------------ */

export function useUcQuotationList({
  status = 'all',
  search = '',
  filters = DEFAULT_UC_QUOTATION_FILTERS,
}: UseUcQuotationListArgs = {}) {
  const query = useInfiniteQuery<QuotationListPage, Error>({
    queryKey: queryKeys.uc.quotations.list({ status, search, filters }),
    queryFn: ({ pageParam }) =>
      fetchUcQuotations({
        status,
        search,
        filters,
        cursor: pageParam as string | null,
        limit: PAGE_SIZE,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => lastPage.nextCursor,
    placeholderData: keepPreviousData,
  });

  const data = useMemo(
    () => query.data?.pages.flatMap(p => p.items) ?? [],
    [query.data],
  );

  const firstPage = query.data?.pages[0];

  return {
    data,
    total: firstPage?.total ?? 0,
    counts: firstPage?.counts ?? EMPTY_COUNTS,
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
  };
}
