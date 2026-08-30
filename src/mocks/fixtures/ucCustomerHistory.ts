/**
 * ------------------------------------------------------------------
 * Trip history fixtures
 * ------------------------------------------------------------------
 * Thin re-export layer between the raw generator in
 * `mocks/data/customerHistory.ts` and the hook layer that consumes
 * it. Screens/hooks import from HERE, never directly from `mocks/data/`
 * — same rule as `ucCustomers.ts`. Two reasons:
 *
 *   1. Keeps the raw generator swappable (e.g. we can point this
 *      file at a snapshot JSON in tests without touching consumers).
 *   2. When the backend is ready, we delete this file and switch the
 *      hook to `apiClient.get`. No search-and-replace across the
 *      codebase.
 *
 * DELETE this file entirely when the backend goes live.
 * ------------------------------------------------------------------
 */

import { mockTripsByCustomerId } from '@mocks/data/customerHistory';
import type { Trip } from '@features/uc/customers/types';

/**
 * All trips for a given customer, newest-first. Returns an empty
 * array if the customer has no trips or doesn't exist — matches
 * the "no trips" and "unknown id" cases uniformly, so the hook
 * doesn't need to distinguish.
 */
export function getFixtureTripsForCustomer(customerId: string): Trip[] {
  return mockTripsByCustomerId[customerId] ?? [];
}

/**
 * Full trip corpus, flattened. Only useful for cross-cutting mock
 * screens (e.g. an ops dashboard's "all recent trips"). The
 * per-customer history screen never uses this.
 */
export const fixtureAllTrips: Trip[] = Object.values(
  mockTripsByCustomerId,
).flat();
