/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * useVendorList — UC directory, vendors tab
 * ------------------------------------------------------------------
 * Cursor-paginated infinite list for the Directory > Vendors tab.
 * Structurally identical to useCustomerList: same query-key
 * hierarchy, same infinite-scroll semantics, same fixture-then-swap
 * backend plan.
 *
 * PII policy:
 *   Vendor rows include phone + email. As with customers, the query
 *   opts out of MMKV persistence via `meta: { persist: false }` so
 *   directory data doesn't survive process kills on disk.
 *
 * Backend swap:
 *   Flip USE_MOCK to false once /uc/vendors is live. The mutation
 *   input/output types are the contract.
 * ------------------------------------------------------------------
 */

import { useMemo } from 'react';
import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';

import { apiClient } from '@api/axios';
import { endpoints } from '@api/endpoints';
import { queryKeys } from '@constants/queryKeys';
import { fixtureUcVendorsAll } from '@mocks/fixtures/ucVendors';
import { delayLikeApi } from '@mocks/helpers/delay';

import {
  DEFAULT_VENDOR_FILTERS,
  type Vendor,
  type VendorFilters,
} from '../types';

const USE_MOCK = true;
const PAGE_SIZE = 20;

export type UseVendorListArgs = {
  search?: string;
  filters?: VendorFilters;
};

type VendorListParams = {
  search: string;
  filters: VendorFilters;
  cursor: string | null;
  limit: number;
};

type VendorListPage = {
  items: Vendor[];
  nextCursor: string | null;
  total: number;
};

/* ------------------------------------------------------------------ */
/* Sort + filter helpers                                              */
/* ------------------------------------------------------------------ */

function sortVendors(items: Vendor[], sortBy: VendorFilters['sortBy']): Vendor[] {
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
      return copy.sort((a, b) => a.companyName.localeCompare(b.companyName));
    case 'largestFleet':
      return copy.sort((a, b) => b.vehicleCount - a.vehicleCount);
  }
}

/* ------------------------------------------------------------------ */
/* Fetch                                                              */
/* ------------------------------------------------------------------ */

async function fetchVendors(params: VendorListParams): Promise<VendorListPage> {
  if (!USE_MOCK) {
    const { data } = await apiClient.get<VendorListPage>(
      endpoints.uc.vendors.list(),
      { params },
    );
    return data;
  }

  await delayLikeApi();

  const { search, filters, cursor, limit } = params;
  const q = search.trim().toLowerCase();

  const matched = fixtureUcVendorsAll.filter(v => {
    if (q) {
      const hit =
        v.companyName.toLowerCase().includes(q) ||
        v.ownerName.toLowerCase().includes(q) ||
        v.phone.includes(q) ||
        (v.phoneAlt?.includes(q) ?? false) ||
        v.email.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q);
      if (!hit) return false;
    }
    if (filters.status !== 'all' && v.status !== filters.status) return false;
    return true;
  });

  const sorted = sortVendors(matched, filters.sortBy);
  const start = cursor ? Number(cursor) : 0;
  const items = sorted.slice(start, start + limit);
  const nextIndex = start + items.length;
  const nextCursor = nextIndex < sorted.length ? String(nextIndex) : null;

  return { items, nextCursor, total: sorted.length };
}

/* ------------------------------------------------------------------ */
/* Hook                                                               */
/* ------------------------------------------------------------------ */

export function useVendorList({
  search = '',
  filters = DEFAULT_VENDOR_FILTERS,
}: UseVendorListArgs = {}) {
  const query = useInfiniteQuery<VendorListPage, Error>({
    queryKey: queryKeys.uc.vendors.list({ search, filters }),
    queryFn: ({ pageParam }) =>
      fetchVendors({
        search,
        filters,
        cursor: pageParam as string | null,
        limit: PAGE_SIZE,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => lastPage.nextCursor,
    placeholderData: keepPreviousData,
    // PII opt-out: don't persist phone/email lists to MMKV on disk.
    meta: { persist: false },
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
