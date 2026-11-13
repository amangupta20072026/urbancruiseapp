/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * useStaffList — UC directory, staff tab
 * ------------------------------------------------------------------
 * Cursor-paginated infinite list for Directory > UC Staff, served by
 * GET /api/v1/uc/staff. Mirrors useCustomerList / useVendorList
 * structurally so all four directory hooks look the same at a glance.
 *
 * Search, filtering and sorting all happen on the SERVER. Nothing is
 * filtered here:
 *   - the complete-phone-match rule (a phone matches only the whole
 *     number, never part of it, because the UI masks phones) is
 *     applied in the backend repository;
 *   - `phoneAlt` (personal mobile) is present only for callers in the
 *     HR department, decided server-side by which view is queried.
 * ------------------------------------------------------------------
 */

import { useMemo } from 'react';
import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';

import { apiClient } from '@api/axios';
import { endpoints } from '@api/endpoints';
import { queryKeys } from '@constants/queryKeys';

import { DEFAULT_STAFF_FILTERS, type Staff, type StaffFilters } from '../types';

const PAGE_SIZE = 20;

export type UseStaffListArgs = {
  search?: string;
  filters?: StaffFilters;
};

type StaffListParams = {
  search: string;
  filters: StaffFilters;
  cursor: string | null;
  limit: number;
};

type StaffListPage = {
  items: Staff[];
  nextCursor: string | null;
  total: number;
};

async function fetchStaff(params: StaffListParams): Promise<StaffListPage> {
  const { data } = await apiClient.get<StaffListPage>(
    endpoints.uc.staff.list(),
    {
      params: {
        search: params.search,
        active: params.filters.active,
        sortBy: params.filters.sortBy,
        // Omitted on the first page; the server treats a missing cursor
        // as "start at the beginning" and rejects a cursor made for
        // another sort with 400 INVALID_CURSOR.
        ...(params.cursor ? { cursor: params.cursor } : {}),
        limit: params.limit,
      },
    },
  );
  return data;
}

export function useStaffList({
  search = '',
  filters = DEFAULT_STAFF_FILTERS,
}: UseStaffListArgs = {}) {
  const query = useInfiniteQuery<StaffListPage, Error>({
    queryKey: queryKeys.uc.staff.list({ search, filters }),
    queryFn: ({ pageParam }) =>
      fetchStaff({
        search,
        filters,
        cursor: pageParam as string | null,
        limit: PAGE_SIZE,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => lastPage.nextCursor,
    placeholderData: keepPreviousData,
    // Staff rows carry colleagues' phone numbers, and the HR-only
    // personal number varies by who is signed in. Never write to disk.
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
