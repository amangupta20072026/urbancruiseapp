/**
 * ------------------------------------------------------------------
 * findCachedCustomer — a customer from the Directory list already in memory
 * ------------------------------------------------------------------
 * Trip History opens from a customer in the Directory list, so that
 * customer is already in the TanStack Query cache (every customers list
 * variant, every loaded page). Reading it from there avoids a second
 * request, and there is no single-customer endpoint yet.
 *
 * Returns null when the customer isn't in memory (e.g. the app was
 * restarted on this screen: Directory lists are not saved to disk).
 * ------------------------------------------------------------------
 */

import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@constants/queryKeys';

import type { DirectoryPage } from '../../_directory/hooks/useDirectoryList';
import type { Customer } from '../types';

export function findCachedCustomer(
  queryClient: QueryClient,
  customerId: string,
): Customer | null {
  if (!customerId) return null;
  const entries = queryClient.getQueriesData<
    InfiniteData<DirectoryPage<Customer>>
  >({ queryKey: queryKeys.uc.customers.all() });
  for (const [, data] of entries) {
    for (const page of data?.pages ?? []) {
      const hit = page.items.find(c => c.id === customerId);
      if (hit) return hit;
    }
  }
  return null;
}
