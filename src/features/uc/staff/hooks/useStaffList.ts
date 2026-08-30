/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * useStaffList — UC directory, staff tab
 * ------------------------------------------------------------------
 * Cursor-paginated infinite list for Directory > UC Staff.
 * Mirrors useCustomerList / useVendorList structurally so all four
 * directory hooks look the same at a glance.
 * ------------------------------------------------------------------
 */

import { useMemo } from 'react';
import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';

import { apiClient } from '@api/axios';
import { endpoints } from '@api/endpoints';
import { queryKeys } from '@constants/queryKeys';
import { fixtureUcStaffAll } from '@mocks/fixtures/ucStaff';
import { delayLikeApi } from '@mocks/helpers/delay';

import {
  DEFAULT_STAFF_FILTERS,
  type Staff,
  type StaffFilters,
} from '../types';

const USE_MOCK = true;
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

function sortStaff(items: Staff[], sortBy: StaffFilters['sortBy']): Staff[] {
  const copy = [...items];
  switch (sortBy) {
    case 'newest':
      return copy.sort(
        (a, b) =>
          new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime(),
      );
    case 'oldest':
      return copy.sort(
        (a, b) =>
          new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime(),
      );
    case 'nameAsc':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
  }
}

async function fetchStaff(params: StaffListParams): Promise<StaffListPage> {
  if (!USE_MOCK) {
    const { data } = await apiClient.get<StaffListPage>(
      endpoints.uc.staff.list(),
      { params },
    );
    return data;
  }

  await delayLikeApi();

  const { search, filters, cursor, limit } = params;
  const q = search.trim().toLowerCase();

  const matched = fixtureUcStaffAll.filter(s => {
    if (q) {
      const hit =
        s.name.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        (s.phoneAlt?.includes(q) ?? false) ||
        s.email.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q);
      if (!hit) return false;
    }
    if (filters.active === 'active' && !s.active) return false;
    if (filters.active === 'inactive' && s.active) return false;
    return true;
  });

  const sorted = sortStaff(matched, filters.sortBy);
  const start = cursor ? Number(cursor) : 0;
  const items = sorted.slice(start, start + limit);
  const nextIndex = start + items.length;
  const nextCursor = nextIndex < sorted.length ? String(nextIndex) : null;

  return { items, nextCursor, total: sorted.length };
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
