/**
 * ------------------------------------------------------------------
 * Customer Home — mock data
 * ------------------------------------------------------------------
 * Seeds the three feeds the home screen consumes:
 *
 *   1. Active quotation summary (or null)
 *   2. Next upcoming trip (or null)
 *   3. Recent activity feed (last 3 shown; more available for the
 *      future full activity screen)
 *
 * Deterministic — same reload produces the same data. Keyed by user
 * id so when we later seed multiple mock users, each has their own
 * home. In v1 there's only Aman Gupta, so the map has one entry.
 *
 * All money values use `rupeesToMoney` — never raw floats. Same rule
 * as the rest of the codebase.
 *
 * DELETE this file entirely when the backend endpoints ship.
 * ------------------------------------------------------------------ */

import { asISODateTime } from '@app-types/datetime';
import { rupeesToMoney } from '@app-types/currency';
import { mockCurrentUser } from '@mocks/data/currentUser';
import type {
  ActivityItem,
  QuotationSummary,
  UpcomingTrip,
} from '@features/customer/home/types';

/* ------------------------------------------------------------------
 * Per-user composite
 * ------------------------------------------------------------------
 * One record per user id. `quotation` and `upcomingTrip` may be null
 * to model the empty states. `recentActivity` is a full history slice
 * — the hook slices to the latest N for display.
 * ------------------------------------------------------------------ */

export type MockHomeData = {
  quotation: QuotationSummary | null;
  upcomingTrip: UpcomingTrip | null;
  recentActivity: ActivityItem[];
};

/* ------------------------------------------------------------------ */
/* Aman Gupta — the demo user                                         */
/* ------------------------------------------------------------------ */

const AMAN_ID = mockCurrentUser.id;

/* Reference dates — everything else derives from this so if we bump
 * the "current moment" for demo purposes, all dates shift together.
 * Chosen to match the design mock's "12 May 2026" travel date. */
const TRAVEL_DATE_ISO = '2026-05-12T09:00:00Z';
const QUOTATION_PREPARED_ISO = '2026-05-11T04:30:00Z'; // 10:30 AM IST (mock shows "10:30 AM")
const PAYMENT_RECEIVED_ISO = '2026-05-10T05:45:00Z'; // 11:15 AM IST
const TRIP_CONFIRMED_ISO = '2026-05-09T22:50:00Z'; // 04:20 AM IST next day-ish; mock reads "04:20 PM"

const AMAN_HOME: MockHomeData = {
  quotation: {
    id: 'QTN-2026-05-000487',
    fromCity: 'Delhi',
    toCity: 'Jaipur',
    travelDate: asISODateTime(TRAVEL_DATE_ISO),
    optionsCount: 3,
    status: 'ready',
  },

  upcomingTrip: {
    id: 'TRP-2026-05-000921',
    status: 'confirmed',
    fromCity: 'Delhi',
    toCity: 'Agra',
    scheduledAt: asISODateTime(TRAVEL_DATE_ISO),
    vehicleName: 'Toyota Innova Crysta',
    /* Local placeholder path; the card component maps this through
     * a require() so the RN bundler picks it up. Later we swap to
     * a real vehicle photo (CDN URL from backend) — the field name
     * stays `vehicleImageUrl` for that transition. */
    vehicleImageUrl: 'placeholder-vehicle-innova',
  },

  recentActivity: [
    {
      id: 'ACT-2026-05-000001',
      kind: 'quotation_prepared',
      title: 'Quotation Prepared',
      subtitle: 'Delhi → Jaipur · 3 Options',
      timestamp: asISODateTime(QUOTATION_PREPARED_ISO),
    },
    {
      id: 'ACT-2026-05-000002',
      kind: 'payment_received',
      title: 'Payment Received',
      subtitle: 'Advance payment of ₹3,750 received',
      timestamp: asISODateTime(PAYMENT_RECEIVED_ISO),
      amount: rupeesToMoney(3750),
    },
    {
      id: 'ACT-2026-05-000003',
      kind: 'trip_confirmed',
      title: 'Trip Confirmed',
      subtitle: 'Delhi → Agra · 12 May 2026',
      timestamp: asISODateTime(TRIP_CONFIRMED_ISO),
    },
    /* Additional history — not shown on the home screen (only the
     * latest 3 are), but the full activity screen will show these
     * once it's built. Kept here so the feed already has depth. */
    {
      id: 'ACT-2026-05-000004',
      kind: 'quotation_reviewed',
      title: 'Quotation Reviewed',
      subtitle: 'Selected: Innova Crysta at ₹22,500',
      timestamp: asISODateTime('2026-05-08T14:15:00Z'),
      amount: rupeesToMoney(22500),
    },
    {
      id: 'ACT-2026-05-000005',
      kind: 'trip_completed',
      title: 'Trip Completed',
      subtitle: 'Mumbai → Pune · 03 May 2026 · ★ 4.8',
      timestamp: asISODateTime('2026-05-03T11:00:00Z'),
    },
    {
      id: 'ACT-2026-05-000006',
      kind: 'payment_pending',
      title: 'Payment Pending',
      subtitle: 'Balance ₹18,750 due before travel date',
      timestamp: asISODateTime('2026-05-02T09:30:00Z'),
      amount: rupeesToMoney(18750),
    },
    {
      id: 'ACT-2026-05-000007',
      kind: 'trip_cancelled',
      title: 'Trip Cancelled',
      subtitle: 'Delhi → Manali · 28 Apr 2026',
      timestamp: asISODateTime('2026-04-27T18:20:00Z'),
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Registry                                                           */
/* ------------------------------------------------------------------ */

/**
 * Home-data corpus, keyed by user id. When we add more mock users
 * (multi-user demo, screenshot tests with distinct personas),
 * append entries here.
 */
export const mockCustomerHomeById: Record<string, MockHomeData> = {
  [AMAN_ID]: AMAN_HOME,
};
