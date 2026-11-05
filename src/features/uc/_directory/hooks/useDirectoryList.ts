/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * useDirectoryList — shared engine of the UC Directory list hooks
 * ------------------------------------------------------------------
 * useCustomerList / useVendorList / useDriverList each call this with
 * their URL and query parameters. One place for paging, caching and
 * the hook's return shape, so the three tabs always behave the same.
 *
 * Backend contract (GET /uc/customers | /uc/vendors | /uc/drivers):
 *   query  { ...filters, search, sortBy, cursor?, limit }  — flat params
 *   reply  { items, nextCursor, total }  (inside the { data } envelope,
 *          which apiClient unwraps)
 *   nextCursor is an opaque token; null when there are no more rows.
 *   total counts every row matching the search + filters.
 *
 * Caching (TanStack Query):
 *   - one cache entry per (search, filters), pages accumulate on scroll
 *   - keepPreviousData: the old list stays visible while new filters load
 *   - NOT persisted to disk (meta.persist = false): the rows hold phone
 *     numbers and emails of real people.
 * ------------------------------------------------------------------
 */

import { useMemo } from 'react';
import {
  keepPreviousData,
  useInfiniteQuery,
  type QueryKey,
} from '@tanstack/react-query';

import { apiClient } from '@api/axios';

/** Rows per request (the backend allows 1–50). */
export const DIRECTORY_PAGE_SIZE = 20;

export type DirectoryPage<T> = {
  items: T[];
  /** Opaque pointer to the next batch. `null` means end of list. */
  nextCursor: string | null;
  /** Rows matching the current search/filters ("Showing X of Y"). */
  total: number;
};

/** Query-string values; undefined / null / '' are left out. */
export type DirectoryParams = Record<string, string | null | undefined>;

function cleanParams(params: DirectoryParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string' && v.trim() !== '') out[k] = v.trim();
  }
  return out;
}

/** Guards against a malformed reply so a bad page can't crash the list. */
function toPage<T>(raw: unknown): DirectoryPage<T> {
  const r = (raw ?? {}) as Partial<DirectoryPage<T>>;
  return {
    items: Array.isArray(r.items) ? r.items : [],
    nextCursor:
      typeof r.nextCursor === 'string' && r.nextCursor !== ''
        ? r.nextCursor
        : null,
    total:
      typeof r.total === 'number' && Number.isFinite(r.total) ? r.total : 0,
  };
}

export function useDirectoryList<T>(args: {
  queryKey: QueryKey;
  url: string;
  /** Filters + search + sortBy; cursor and limit are added here. */
  params: DirectoryParams;
}) {
  const { queryKey, url, params } = args;

  const query = useInfiniteQuery<DirectoryPage<T>, Error>({
    queryKey,
    queryFn: async ({ pageParam, signal }) => {
      const { data } = await apiClient.get<unknown>(url, {
        params: cleanParams({
          ...params,
          cursor: pageParam as string | null,
          limit: String(DIRECTORY_PAGE_SIZE),
        }),
        signal,
      });
      return toPage<T>(data);
    },
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
