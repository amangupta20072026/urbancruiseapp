/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * useDriverList — UC directory, drivers tab
 * ------------------------------------------------------------------
 * Cursor-paginated infinite list for Directory > Drivers, with an
 * additional vendor-scope filter. Structurally mirrors the other
 * three directory hooks.
 * ------------------------------------------------------------------
 */

import { useMemo } from 'react';
import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';

import { apiClient } from '@api/axios';
import { endpoints } from '@api/endpoints';
import { queryKeys } from '@constants/queryKeys';
import { fixtureUcDriversAll } from '@mocks/fixtures/ucDrivers';
import { delayLikeApi } from '@mocks/helpers/delay';

import {
  DEFAULT_DRIVER_FILTERS,
  type Driver,
  type DriverFilters,
} from '../types';

const USE_MOCK = true;
const PAGE_SIZE = 20;

export type UseDriverListArgs = {
  search?: string;
  filters?: DriverFilters;
};

type DriverListParams = {
  search: string;
  filters: DriverFilters;
  cursor: string | null;
  limit: number;
};

type DriverListPage = {
  items: Driver[];
  nextCursor: string | null;
  total: number;
};

function sortDrivers(items: Driver[], sortBy: DriverFilters['sortBy']): Driver[] {
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
      return copy.sort((a, b) => b.completedTrips - a.completedTrips);
  }
}

async function fetchDrivers(params: DriverListParams): Promise<DriverListPage> {
  if (!USE_MOCK) {
    const { data } = await apiClient.get<DriverListPage>(
      endpoints.uc.drivers.list(),
      { params },
    );
    return data;
  }

  await delayLikeApi();

  const { search, filters, cursor, limit } = params;
  const q = search.trim().toLowerCase();

  const matched = fixtureUcDriversAll.filter(d => {
    if (q) {
      const hit =
        d.name.toLowerCase().includes(q) ||
        d.phone.includes(q) ||
        (d.phoneAlt?.includes(q) ?? false) ||
        (d.email?.toLowerCase().includes(q) ?? false) ||
        d.city.toLowerCase().includes(q) ||
        d.vendorName.toLowerCase().includes(q) ||
        d.licenseNo.toLowerCase().includes(q);
      if (!hit) return false;
    }
    if (
      filters.verification !== 'all' &&
      d.verification !== filters.verification
    )
      return false;
    if (filters.vendorId && d.vendorId !== filters.vendorId) return false;
    return true;
  });

  const sorted = sortDrivers(matched, filters.sortBy);
  const start = cursor ? Number(cursor) : 0;
  const items = sorted.slice(start, start + limit);
  const nextIndex = start + items.length;
  const nextCursor = nextIndex < sorted.length ? String(nextIndex) : null;

  return { items, nextCursor, total: sorted.length };
}

export function useDriverList({
  search = '',
  filters = DEFAULT_DRIVER_FILTERS,
}: UseDriverListArgs = {}) {
  const query = useInfiniteQuery<DriverListPage, Error>({
    queryKey: queryKeys.uc.drivers.list({ search, filters }),
    queryFn: ({ pageParam }) =>
      fetchDrivers({
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
