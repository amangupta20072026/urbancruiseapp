/**
 * ------------------------------------------------------------------
 * Customer Home fixtures
 * ------------------------------------------------------------------
 * Thin re-export layer between the raw mock in
 * `mocks/data/customerHome.ts` and the hook layer that consumes it.
 * Screens/hooks import from HERE, never directly from `mocks/data/`
 * — same rule as `ucCustomers.ts` and `ucCustomerHistory.ts`. Two
 * reasons:
 *
 *   1. Keeps the raw mock swappable — tests can point this file at
 *      a snapshot JSON without touching consumers.
 *   2. When the backend is ready, we delete this file and switch
 *      the hook to `apiClient.get`. No search-and-replace across
 *      the codebase.
 *
 * DELETE this file entirely when the backend goes live.
 * ------------------------------------------------------------------ */

import { mockCustomerHomeById } from '@mocks/data/customerHome';
import type {
  ActivityItem,
  QuotationSummary,
  UpcomingTrip,
} from '@features/customer/home/types';

/** Empty composite — used as the fallback when a user has no data. */
const EMPTY_HOME: {
  quotation: null;
  upcomingTrip: null;
  recentActivity: ActivityItem[];
} = {
  quotation: null,
  upcomingTrip: null,
  recentActivity: [],
};

/**
 * Active quotation summary for a given user, or `null` if none.
 * `null` is the empty state — the home screen renders
 * `RequestQuotationCard` instead of `QuotationReadyCard`.
 */
export function getFixtureQuotationForUser(
  userId: string,
): QuotationSummary | null {
  return mockCustomerHomeById[userId]?.quotation ?? EMPTY_HOME.quotation;
}

/**
 * Next upcoming trip for a given user, or `null` if none.
 * `null` hides the "Upcoming Trip" section entirely.
 */
export function getFixtureUpcomingTripForUser(
  userId: string,
): UpcomingTrip | null {
  return mockCustomerHomeById[userId]?.upcomingTrip ?? EMPTY_HOME.upcomingTrip;
}

/**
 * Full recent-activity feed for a given user, newest-first.
 * Returns an empty array if the user is unknown or has no history —
 * caller does its own slicing (home shows the latest 3, full activity
 * screen shows everything).
 */
export function getFixtureRecentActivityForUser(
  userId: string,
): ActivityItem[] {
  return (
    mockCustomerHomeById[userId]?.recentActivity ?? EMPTY_HOME.recentActivity
  );
}
