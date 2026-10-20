/**
 * ------------------------------------------------------------------
 * UC dashboard — data types
 * ------------------------------------------------------------------
 * Shapes the dashboard screen renders. Today they come from mocks;
 * the real `/uc/dashboard` endpoints must return these shapes.
 * ------------------------------------------------------------------
 */

import type { ISODateTime } from '@app-types/datetime';
import type { BookingStatus } from '@shared/bookings';

export type { BookingStatus };

export type Trend = 'up' | 'down';

export const STAT_KEYS = [
  'trips',
  'customers',
  'bookings',
  'quotations',
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

export type RecentBooking = {
  /** Booking number, e.g. "UC12345" (shown as "#UC12345"). */
  id: string;
  customerName: string;
  /** Pickup date and time. */
  pickupAt: ISODateTime;
  pickup: string;
  drop: string;
  /** Already formatted, e.g. "₹1,250". */
  fare: string;
  status: BookingStatus;
};

export type DashboardData = {
  greeting: { name: string };
  stats: StatMetric[];
  recentBookings: RecentBooking[];
};

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
};

export type BookingTrend = {
  range: TrendRange;
  /** One point per day, oldest first, ending today. */
  points: TrendPoint[];
};
