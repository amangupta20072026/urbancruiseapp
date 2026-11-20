/**
 * ------------------------------------------------------------------
 * Customer Home — mock data
 * ------------------------------------------------------------------
 * Seeds the two feeds the home screen consumes:
 *
 *   1. Active quotation summary (or null)
 *   2. Next upcoming trip (or null)
 *
 * Deterministic — same reload produces the same data. Keyed by user
 * id so when we later seed multiple mock users, each has their own
 * home. In v1 there's only Aman Gupta, so the map has one entry.
 *
 * DELETE this file entirely when the backend endpoints ship.
 * ------------------------------------------------------------------ */

import { asISODateTime } from '@app-types/datetime';
import { mockCurrentUser } from '@mocks/data/currentUser';
import type {
  QuotationSummary,
  UpcomingTrip,
} from '@features/customer/home/types';

/* ------------------------------------------------------------------
 * Per-user composite
 * ------------------------------------------------------------------
 * One record per user id. `quotation` and `upcomingTrip` may be null
 * to model the empty states.
 * ------------------------------------------------------------------ */

export type MockHomeData = {
  quotation: QuotationSummary | null;
  upcomingTrip: UpcomingTrip | null;
};

/* ------------------------------------------------------------------ */
/* Aman Gupta — the demo user                                         */
/* ------------------------------------------------------------------ */

const AMAN_ID = mockCurrentUser.id;

/* Reference dates — everything else derives from this so if we bump
 * the "current moment" for demo purposes, all dates shift together.
 * Chosen to match the design mock's "12 May 2026" travel date. */
const TRAVEL_DATE_ISO = '2026-05-12T09:00:00Z';
const TRAVEL_END_DATE_ISO = '2026-05-15T12:30:00Z';
const EXPECTED_DROP_ISO = '2026-05-12T13:30:00Z'; // 07:00 PM IST
const DRIVER_REPORTING_ISO = '2026-05-12T08:00:00Z'; // 01:30 PM IST

const AMAN_HOME: MockHomeData = {
  quotation: {
    id: 'QTN-2026-05-000487',
    // Values below match the Home quotation card design.
    quotationNumber: 'QUO-2026-239147',
    approvalStatus: 'pending',
    tripType: 'round_trip',
    fromCity: 'Delhi',
    toCity: 'Jaipur',
    travelDate: asISODateTime(TRAVEL_DATE_ISO),
    travelEndDate: asISODateTime(TRAVEL_END_DATE_ISO),
    durationDays: 5,
    optionsCount: 3,
    passengerCount: 2,
    status: 'ready',
  },

  upcomingTrip: {
    id: 'TRP-2026-05-000921',
    // Values below match the Home trip card design.
    tripNumber: 'TRP-2026-0847',
    status: 'confirmed',
    tripType: 'one_way',
    fromCity: 'Delhi',
    toCity: 'Agra',
    scheduledAt: asISODateTime(TRAVEL_DATE_ISO),
    travelEndDate: asISODateTime(TRAVEL_END_DATE_ISO),
    durationDays: 5,
    passengerCount: 2,
    vehicleName: 'Toyota Innova Crysta',
    vehicleColor: 'White',
    vehicleRegNo: 'UP16AB1234',
    /* Local placeholder path; the card component maps this through
     * a require() so the RN bundler picks it up. Later we swap to
     * a real vehicle photo (CDN URL from backend) — the field name
     * stays `vehicleImageUrl` for that transition. */
    vehicleImageUrl: 'placeholder-vehicle-innova',
    distanceKm: 233,
    estimatedDurationMinutes: 270,
    expectedDropAt: asISODateTime(EXPECTED_DROP_ISO),
    driver: { name: 'Amit Kumar', phone: '+91 98765 43210' },
    driverReportingAt: asISODateTime(DRIVER_REPORTING_ISO),
  },
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
