/**
 * ------------------------------------------------------------------
 * UC dashboard — data types
 * ------------------------------------------------------------------
 * Shapes the dashboard screen renders. Today they come from mocks;
 * the real `/uc/dashboard` endpoints must return these shapes.
 * ------------------------------------------------------------------
 */

import type { BookingStatus } from '@shared/bookings';
import type { UcTripListItem } from '@features/uc/trips/types';
import type { Money } from '@app-types/currency';

export type { BookingStatus };

export type Trend = 'up' | 'down';

/**
 * Stat cards, IN DISPLAY ORDER (the dashboard sorts by this list, so
 * the server's order never changes the layout). The "Quotations vs
 * Converted" card is separate (DashboardData.conversion) and always
 * shows first, full width.
 */
export const STAT_KEYS = [
  'quotations',
  'bookings',
  'margin',
  'trips',
  'outstanding',
  'customers',
] as const;

export type StatKey = (typeof STAT_KEYS)[number];

/** True for a stat this app version knows how to show. Data from the
 *  server or the saved cache may carry an unknown one. */
export function isStatKey(value: unknown): value is StatKey {
  return (STAT_KEYS as readonly unknown[]).includes(value);
}

export type StatMetric = {
  key: StatKey;
  label: string;
  /** Already formatted for display, e.g. "128" or "1,245". */
  value: string;
  /** Size of the change, always ≥ 0; `trend` gives the direction. */
  deltaPct: number;
  trend: Trend;
  /** e.g. "vs yesterday". */
  compareLabel: string;
};

/**
 * "Quotations vs Converted". A quotation counts as converted once the
 * assigned lead — tele-sales or travel advisor — has called the
 * customer (product rule). The app has no call data, so the BACKEND
 * counts it; the app only shows the numbers and works out the %.
 */
export type QuotationConversion = {
  /** Quotations whose customer the assigned lead has called. ≥ 0. */
  converted: number;
  /** All quotations in the same period. ≥ converted. */
  total: number;
  /** Change of the conversion rate; always ≥ 0, `trend` gives the direction. */
  deltaPct: number;
  trend: Trend;
  /** e.g. "vs yesterday". */
  compareLabel: string;
};

/**
 * Total Outstanding card — collection TARGET vs ACHIEVED for THIS
 * MONTH (product rule). Target = amount to collect this month;
 * collected = amount actually collected so far this month. Money in
 * paise. Sent by the backend; the app works out the %.
 */
export type OutstandingCollection = {
  target: Money;
  collected: Money;
  /** e.g. "This month" or "Nov 2026". Shown next to the target. */
  periodLabel: string;
};

export type DashboardData = {
  greeting: { name: string };
  /**
   * Optional: missing (older saved data, or backend not ready) hides
   * the card instead of showing wrong numbers.
   */
  conversion?: QuotationConversion | null;
  /**
   * Optional: missing / inconsistent → the Outstanding card falls back
   * to the plain stat card (value + vs yesterday).
   */
  collection?: OutstandingCollection | null;
  /**
   * Values are already formatted by the backend, e.g. "356" or, for
   * margin / outstanding, "₹1,84,300" (Indian grouping).
   *   margin      — customer price without GST − vendor cost
   *   outstanding — sum of unpaid booking balances
   */
  stats: StatMetric[];
  /**
   * The next upcoming trips (status 'upcoming'), SOONEST FIRST
   * (scheduledAt ascending), at most DASHBOARD_UPCOMING_TRIPS_LIMIT.
   * Same row shape as GET /uc/trips, so the Trips tab helpers apply.
   */
  upcomingTrips: UcTripListItem[];
};

/** How many upcoming trips the dashboard shows. */
export const DASHBOARD_UPCOMING_TRIPS_LIMIT = 3;

/* ------------------------------------------------------------------ */
/* Bookings trend                                                     */
/* ------------------------------------------------------------------ */

/** Days covered by the Bookings Trend chart, in dropdown order. */
export const TREND_RANGES = [7, 15, 30, 90] as const;

export type TrendRange = (typeof TREND_RANGES)[number];

export const DEFAULT_TREND_RANGE: TrendRange = 7;

export const TREND_RANGE_LABEL: Readonly<Record<TrendRange, string>> = {
  7: 'Last 7 Days',
  15: 'Last 15 Days',
  30: 'Last 30 Days',
  90: 'Last 90 Days',
};

export type TrendPoint = {
  /** Local calendar day, 'YYYY-MM-DD'. */
  date: string;
  /** Bookings made that day. */
  count: number;
  /**
   * Urban Cruise's margin on that day's bookings, in PAISE (Money):
   * what customers pay (without GST) minus what is paid to vendors.
   * Can be negative. Optional / null while the backend can't compute it
   * (vendor cost not available yet) — the chart then shows bookings only.
   */
  margin?: Money | null;
};

export type BookingTrend = {
  range: TrendRange;
  /** One point per day, oldest first, ending today. */
  points: TrendPoint[];
};
