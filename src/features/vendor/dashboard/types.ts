/**
 * ------------------------------------------------------------------
 * Vendor dashboard — data types
 * ------------------------------------------------------------------
 * Shapes the vendor dashboard renders. Today they come from mocks;
 * the real `/vendor/dashboard` endpoints must return these shapes.
 *
 * What a vendor sees (product rules):
 *   - No money anywhere on the dashboard: no earnings card and no
 *     amounts. The trend chart shows booking counts only
 *     (the backend must NOT send `margin` for vendors).
 *   - Stats: Total Vehicles, Total Drivers, Total Bookings, Total Trips.
 *   - Vehicle Status: On Trip · Upcoming · Under Service · Inactive.
 *   - Upcoming Trips: the next VENDOR_UPCOMING_TRIPS_LIMIT trips.
 * ------------------------------------------------------------------
 */

import type { TripType } from '@features/customer/quotations/types';
import type { Trend } from '@features/uc/dashboard/types';
import type { TripId } from '@app-types/ids';
import type { ISODateTime } from '@app-types/datetime';

/* ------------------------------------------------------------------ */
/* Stats                                                              */
/* ------------------------------------------------------------------ */

/**
 * Stat cards, IN DISPLAY ORDER (the screen sorts by this list, so the
 * server's order never changes the layout). Layout: 2×2 grid —
 * Vehicles + Drivers, then Bookings + Trips.
 */
export const VENDOR_STAT_KEYS = [
  'vehicles',
  'drivers',
  'bookings',
  'trips',
] as const;

export type VendorStatKey = (typeof VENDOR_STAT_KEYS)[number];

/** True for a stat this app version knows how to show. */
export function isVendorStatKey(value: unknown): value is VendorStatKey {
  return (VENDOR_STAT_KEYS as readonly unknown[]).includes(value);
}

export type VendorStatMetric = {
  key: VendorStatKey;
  label: string;
  /** Already formatted for display, e.g. "32" or "1,245". */
  value: string;
  /**
   * Size of the change, always ≥ 0; `trend` gives the direction. The
   * backend calculates it over the period named in `compareLabel`.
   */
  deltaPct: number;
  trend: Trend;
  /**
   * Comparison period, shown as is. Product rule per stat:
   *   vehicles, drivers  → "vs last month" (this month vs last month)
   *   bookings, trips    → "vs yesterday"  (today vs yesterday)
   */
  compareLabel: string;
};

/* ------------------------------------------------------------------ */
/* Vehicle status                                                     */
/* ------------------------------------------------------------------ */

/**
 * Vehicle status tiles, IN DISPLAY ORDER. The backend decides which
 * vehicle is in which group; the app only shows the counts.
 */
export const VEHICLE_STATUS_KEYS = [
  'on_trip',
  'upcoming',
  'under_service',
  'inactive',
] as const;

export type VehicleStatusKey = (typeof VEHICLE_STATUS_KEYS)[number];

export function isVehicleStatusKey(value: unknown): value is VehicleStatusKey {
  return (VEHICLE_STATUS_KEYS as readonly unknown[]).includes(value);
}

export type VehicleStatusCount = {
  key: VehicleStatusKey;
  /** Whole number ≥ 0. */
  count: number;
};

/* ------------------------------------------------------------------ */
/* Upcoming trips                                                     */
/* ------------------------------------------------------------------ */

/** How many upcoming trips the dashboard shows (same as UC). */
export const VENDOR_UPCOMING_TRIPS_LIMIT = 3;

/**
 * One of the vendor's upcoming trips. Fits the shared UpcomingTrips
 * card (UpcomingTripItem), so UC and Vendor show trips the same way.
 */
export type VendorUpcomingTrip = {
  id: TripId;
  /** Human-facing trip reference, e.g. "TRP-D-0222-00326". */
  tripRef: string;
  tripType: TripType;
  /** Source and destination, e.g. "Delhi", "Jaipur". */
  fromCity: string;
  toCity: string;
  /** Trip start date-time (UTC ISO). Rendered in device local time. */
  scheduledAt: ISODateTime;
  /** Vehicle model; null until the vendor assigns a vehicle. */
  vehicleName: string | null;
  /** Seats; null when unknown — the card then shows the name only. */
  seatingCapacity: number | null;
  /** null until the vendor assigns a driver. */
  driverName: string | null;
};

/* ------------------------------------------------------------------ */
/* Dashboard                                                          */
/* ------------------------------------------------------------------ */

export type VendorDashboardData = {
  greeting: {
    /** First name shown in "Good morning, Rajesh!". */
    name: string;
  };
  stats: VendorStatMetric[];
  /** One entry per VEHICLE_STATUS_KEYS key. */
  vehicleStatus: VehicleStatusCount[];
  /**
   * Next upcoming trips, soonest first (scheduledAt ascending; the
   * server sorts, the app keeps its order), at most
   * VENDOR_UPCOMING_TRIPS_LIMIT.
   */
  upcomingTrips: VendorUpcomingTrip[];
};
