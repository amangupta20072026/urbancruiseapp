/**
 * ------------------------------------------------------------------
 * Vendor dashboard — pure helpers (unit-tested)
 * ------------------------------------------------------------------
 * Data from the server, or saved on the phone by an older app
 * version, may be missing, in another order, or carry values this
 * version doesn't know. These helpers turn it into exactly what the
 * screen can show, and never throw.
 * ------------------------------------------------------------------
 */

import { isValid } from 'date-fns';

import { getGreeting } from '@shared/utils';

import {
  isVehicleStatusKey,
  isVendorStatKey,
  VEHICLE_STATUS_KEYS,
  VENDOR_STAT_KEYS,
  VENDOR_UPCOMING_TRIPS_LIMIT,
  type VehicleStatusCount,
  type VendorStatMetric,
  type VendorUpcomingTrip,
} from '../types';

/** "Good morning, Rajesh!" — or "Good morning!" when the name is blank. */
export function vendorGreetingLine(
  name: string | null | undefined,
  now: Date,
): string {
  const greeting = getGreeting(now);
  const trimmed = name?.trim();
  return trimmed ? `${greeting}, ${trimmed}!` : `${greeting}!`;
}

/**
 * Known stats only, in VENDOR_STAT_KEYS order, one per key (first
 * wins). Unknown keys are dropped.
 */
export function orderVendorStats(
  stats: readonly VendorStatMetric[] | null | undefined,
): VendorStatMetric[] {
  const byKey = new Map<string, VendorStatMetric>();
  for (const m of Array.isArray(stats) ? stats : []) {
    if (m && isVendorStatKey(m.key) && !byKey.has(m.key)) byKey.set(m.key, m);
  }
  return VENDOR_STAT_KEYS.flatMap(k => {
    const m = byKey.get(k);
    return m ? [m] : [];
  });
}

/**
 * Known statuses only, in VEHICLE_STATUS_KEYS order, one per key
 * (first wins). A status whose count isn't a whole number ≥ 0 is
 * hidden rather than shown wrong. A status the server didn't send is
 * hidden too, not shown as 0.
 */
export function orderVehicleStatus(
  items: readonly VehicleStatusCount[] | null | undefined,
): VehicleStatusCount[] {
  const byKey = new Map<string, VehicleStatusCount>();
  for (const s of Array.isArray(items) ? items : []) {
    if (
      s &&
      isVehicleStatusKey(s.key) &&
      Number.isInteger(s.count) &&
      s.count >= 0 &&
      !byKey.has(s.key)
    ) {
      byKey.set(s.key, s);
    }
  }
  return VEHICLE_STATUS_KEYS.flatMap(k => {
    const s = byKey.get(k);
    return s ? [s] : [];
  });
}

/**
 * At most VENDOR_UPCOMING_TRIPS_LIMIT trips, server order kept (the
 * server sends them soonest first). A trip whose start date isn't a
 * valid date is dropped: the card formats it, and a bad value must
 * not crash the screen.
 */
export function upcomingTripsForDisplay(
  items: readonly VendorUpcomingTrip[] | null | undefined,
): VendorUpcomingTrip[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter(
      t =>
        !!t &&
        typeof t.scheduledAt === 'string' &&
        isValid(new Date(t.scheduledAt)),
    )
    .slice(0, VENDOR_UPCOMING_TRIPS_LIMIT);
}
