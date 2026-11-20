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
 * DEMO DATA FOR ANY USER — DEBUG BUILDS ONLY
 *   The raw mock is keyed by the demo user's id (mockCurrentUser,
 *   'USR-CUST-000001'). A real OTP login gets its own id from the
 *   backend, so it found no entry and Home showed only empty states.
 *   In debug builds (`__DEV__`) a user with no entry of their own now
 *   gets the demo user's Home. Release builds keep the old behaviour
 *   — a user with no entry sees empty states — so real customers can
 *   never see fake quotations, trips or payments.
 *
 * DELETE this file entirely when the backend goes live.
 * ------------------------------------------------------------------ */

import {
  mockCustomerHomeById,
  type MockHomeData,
} from '@mocks/data/customerHome';
import { mockCurrentUser } from '@mocks/data/currentUser';
import type {
  QuotationSummary,
  UpcomingTrip,
} from '@features/customer/home/types';

/** Empty composite — used as the fallback when a user has no data. */
const EMPTY_HOME: {
  quotation: null;
  upcomingTrip: null;
} = {
  quotation: null,
  upcomingTrip: null,
};

/**
 * This user's mock Home. Debug builds fall back to the demo user's
 * Home when this user has none (see the header note); release builds
 * return undefined, which the getters below turn into empty states.
 */
function homeFor(userId: string): MockHomeData | undefined {
  const own = mockCustomerHomeById[userId];
  if (own) return own;
  return __DEV__ ? mockCustomerHomeById[mockCurrentUser.id] : undefined;
}

/**
 * Active quotation summary for a given user, or `null` if none.
 * `null` is the empty state — the home screen renders
 * `RequestQuotationCard` instead of `QuotationReadyCard`.
 */
export function getFixtureQuotationForUser(
  userId: string,
): QuotationSummary | null {
  return homeFor(userId)?.quotation ?? EMPTY_HOME.quotation;
}

/**
 * Next upcoming trip for a given user, or `null` if none.
 * `null` hides the "Upcoming Trip" section entirely.
 */
export function getFixtureUpcomingTripForUser(
  userId: string,
): UpcomingTrip | null {
  return homeFor(userId)?.upcomingTrip ?? EMPTY_HOME.upcomingTrip;
}
