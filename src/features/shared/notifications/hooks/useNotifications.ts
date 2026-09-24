/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * useNotifications — TanStack Query hooks for the notification inbox
 * ------------------------------------------------------------------
 * HOW THE AXIOS ENVELOPE UNWRAP WORKS (why this matters):
 *
 *   Backend `paginated()` sends:
 *     { data: items[], page, pageSize, total, hasNext, requestId }
 *
 *   The axios interceptor in api/axios.ts sees `'data' in body &&
 *   'requestId' in body` and rewrites response.data → body.data.
 *   After that, `res.data` is just `items[]` — page/hasNext/total
 *   are lost.
 *
 *   Fix: destructure `{ data: items }` from the axios response and
 *   reconstruct the page shape ourselves from the request params
 *   we already have (page, pageSize). For hasNext we use the actual
 *   returned item count — if it's less than pageSize, there are no
 *   more pages.
 *
 * OPTIMISTIC READ:
 *   markRead / markAllRead flip the unread dot instantly in the cache.
 *   On error the previous snapshot is restored; on settle a background
 *   invalidation re-fetches from the server.
 *
 * PERSIST:
 *   meta.persist = false — notification data is time-sensitive.
 *   The TanStack MMKV persister skips this query.
 * ------------------------------------------------------------------
 */

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiClient } from '@api/axios';
import { endpoints } from '@api/endpoints';
import type { NotificationCategory, NotificationItem } from '../types';

/* ------------------------------------------------------------------
 * Page shape used by the query cache
 * ------------------------------------------------------------------ */

type NotificationPage = {
  items: NotificationItem[];
  page: number;
  pageSize: number;
  hasNext: boolean;
};

/* ------------------------------------------------------------------
 * Query key factory
 * ------------------------------------------------------------------ */

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (filters: { category?: NotificationCategory; unread?: boolean }) =>
    ['notifications', filters] as const,
};

/* ------------------------------------------------------------------
 * useNotificationsInfinite — infinite scroll inbox
 * ------------------------------------------------------------------ */

export function useNotificationsInfinite(filters: {
  category?: NotificationCategory;
  unread?: boolean;
}) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(filters),

    queryFn: async ({ pageParam = 1 }) => {
      const page = pageParam as number;
      const pageSize = 20;

      const params: Record<string, string | number | boolean> = {
        page,
        pageSize,
      };
      if (filters.category !== undefined) params.category = filters.category;
      if (filters.unread !== undefined) params.unread = filters.unread;

      /**
       * After the axios envelope interceptor runs, `res.data` is the
       * inner `data` array (items[]), not the full paginated envelope.
       * We type it as `NotificationItem[]` and reconstruct the page
       * metadata from our own request params + actual return count.
       */
      const { data: items } = await apiClient.get<NotificationItem[]>(
        endpoints.notifications.list(),
        { params },
      );

      const safeItems = Array.isArray(items) ? items : [];

      const notificationPage: NotificationPage = {
        items: safeItems,
        page,
        pageSize,
        // If we got fewer items than we asked for, there are no more pages.
        hasNext: safeItems.length === pageSize,
      };

      return notificationPage;
    },

    initialPageParam: 1,
    getNextPageParam: (last: NotificationPage) =>
      last.hasNext ? last.page + 1 : undefined,

    meta: { persist: false },
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

/* ------------------------------------------------------------------
 * useMarkNotificationRead
 * ------------------------------------------------------------------ */

export function useMarkNotificationRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      apiClient.post(endpoints.notifications.markRead(notificationId)),

    onMutate: async (notificationId: string) => {
      await qc.cancelQueries({ queryKey: notificationKeys.all });
      const prev = qc.getQueriesData({ queryKey: notificationKeys.all });

      qc.setQueriesData({ queryKey: notificationKeys.all }, (old: unknown) => {
        if (!isInfiniteData(old)) return old;
        return {
          ...old,
          pages: old.pages.map((page: NotificationPage) => ({
            ...page,
            items: page.items.map(item =>
              item.id === notificationId ? { ...item, unread: false } : item,
            ),
          })),
        };
      });

      return { prev };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        ctx.prev.forEach(([key, data]) => qc.setQueryData(key, data));
      }
    },

    onSettled: () => {
      void qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/* ------------------------------------------------------------------
 * useMarkAllNotificationsRead
 * ------------------------------------------------------------------ */

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post(endpoints.notifications.markAllRead()),

    onMutate: async () => {
      await qc.cancelQueries({ queryKey: notificationKeys.all });
      const prev = qc.getQueriesData({ queryKey: notificationKeys.all });

      qc.setQueriesData({ queryKey: notificationKeys.all }, (old: unknown) => {
        if (!isInfiniteData(old)) return old;
        return {
          ...old,
          pages: old.pages.map((page: NotificationPage) => ({
            ...page,
            items: page.items.map(item => ({ ...item, unread: false })),
          })),
        };
      });

      return { prev };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        ctx.prev.forEach(([key, data]) => qc.setQueryData(key, data));
      }
    },

    onSettled: () => {
      void qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/* ------------------------------------------------------------------
 * Helper — narrow unknown cache entry to InfiniteData shape
 * ------------------------------------------------------------------ */

function isInfiniteData(
  data: unknown,
): data is { pages: NotificationPage[]; pageParams: unknown[] } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'pages' in data &&
    Array.isArray((data as { pages: unknown }).pages)
  );
}
