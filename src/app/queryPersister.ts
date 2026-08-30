/**
 * ------------------------------------------------------------------
 * React Query Persister — MMKV backed (async API)
 * ------------------------------------------------------------------
 * Persists the TanStack Query cache across cold starts so screens
 * like Dashboard / Customers-list render from cache instantly and
 * revalidate in the background.
 *
 * We use `createAsyncStoragePersister` (the non-deprecated API).
 * MMKV is synchronous under the hood, so we wrap its ops in
 * `Promise.resolve()` — this is the recommended pattern per the
 * TanStack docs and imposes zero perf cost (no real I/O wait,
 * just a microtask).
 *
 * IMPORTANT: `gcTime` on the QueryClient must be >= `maxAge` set
 * in App.tsx's persistOptions. Our queryClient sets gcTime=24h.
 *
 * Sensitive queries (auth/me, payment tokens) must set
 * `meta: { persist: false }` and get filtered out at dehydrate.
 * ------------------------------------------------------------------
 */

import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { createMMKV } from 'react-native-mmkv';
import type { PersistedClient } from '@tanstack/react-query-persist-client';

const queryStore = createMMKV({ id: 'urbancruise-query-cache' });

/**
 * AsyncStorage-shaped adapter over the sync MMKV instance.
 * The `Promise.resolve()` wrap is idiomatic — see:
 * https://tanstack.com/query/latest/docs/framework/react/plugins/createAsyncStoragePersister
 */
const mmkvAsyncAdapter = {
  getItem: (key: string): Promise<string | null> => {
    const value = queryStore.getString(key);
    return Promise.resolve(value === undefined ? null : value);
  },
  setItem: (key: string, value: string): Promise<void> => {
    queryStore.set(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    queryStore.remove(key);
    return Promise.resolve();
  },
};

export const queryPersister = createAsyncStoragePersister({
  storage: mmkvAsyncAdapter,
  key: 'urbancruise-react-query',
  // Throttled writes — default 1s is fine, but pin the value for clarity.
  throttleTime: 1000,
  serialize: JSON.stringify,
  deserialize: JSON.parse,
});

/**
 * Optional post-dehydrate sanitizer. Filters any query flagged with
 * `meta.persist === false` before it's written to disk. Use as a
 * belt-and-braces alongside `shouldDehydrateQuery` on the provider.
 */
export function shouldPersistQuery(client: PersistedClient): PersistedClient {
  return {
    ...client,
    clientState: {
      ...client.clientState,
      queries: client.clientState.queries.filter(
        q => q.meta?.persist !== false,
      ),
    },
  };
}
