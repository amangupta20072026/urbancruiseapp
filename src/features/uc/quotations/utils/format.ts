/**
 * ------------------------------------------------------------------
 * UC Quotations — formatting + status tone helpers
 * ------------------------------------------------------------------
 * Pure functions, safe to call in render. Status colours come only
 * from the brand palette in `@theme` (fg + its paired tint).
 * ------------------------------------------------------------------
 */

import { Colors } from '@theme';

import {
  UC_TRIP_TYPE_LABEL,
  type UcQuotationListItem,
  type UcQuotationStatus,
} from '../types';

/* ================================================================
 * Dates
 * ================================================================ */

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "12 Sep 2025" */
export function formatDayMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Created stamp on the card's ID line: time for today ("10:30 AM"),
 * date otherwise ("09 Sep 2025") — recent work is read by time,
 * older work by date.
 */
export function formatCreatedStamp(
  iso: string,
  now: Date = new Date(),
): string {
  const d = new Date(iso);
  if (isSameLocalDay(d, now)) {
    return d
      .toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
      .toUpperCase();
  }
  return formatDayMonthYear(iso);
}

/**
 * "08 Nov 2026 - 09 Nov 2026". A one-day trip shows the same date on
 * both sides ("08 Nov 2026 - 08 Nov 2026"); both dates come from the
 * server, nothing is derived from `days`.
 */
export function formatTravelDateRange(
  q: Pick<UcQuotationListItem, 'travelDateStart' | 'travelDateEnd'>,
): string {
  return `${formatDayMonthYear(q.travelDateStart)} - ${formatDayMonthYear(
    q.travelDateEnd,
  )}`;
}

/** "1 Day" / "3 Days" */
export function formatDays(days: number): string {
  return `${days} ${days === 1 ? 'Day' : 'Days'}`;
}

/* ================================================================
 * Vehicle
 * ================================================================ */

/**
 * "Force Traveller · 13 Seater", or just "Force Traveller" when the
 * seat count is unknown (null) or not a positive whole number. Same
 * wording as the UC Bookings card.
 */
export function formatVehicle(
  q: Pick<UcQuotationListItem, 'vehicleName' | 'seatingCapacity'>,
): string {
  const seats = q.seatingCapacity;
  return seats !== null && Number.isInteger(seats) && seats > 0
    ? `${q.vehicleName} · ${seats} Seater`
    : q.vehicleName;
}

/* ================================================================
 * Route
 * ================================================================ */

/**
 * "Delhi → Agra", "Delhi → Rishikesh → Haridwar", or "Delhi Local"
 * for single-city local trips.
 */
export function formatRoute(
  q: Pick<UcQuotationListItem, 'stops' | 'tripType'>,
): string {
  if (q.tripType === 'local' || q.stops.length <= 1) {
    return `${q.stops[0] ?? '—'} Local`;
  }
  return q.stops.join(' → ');
}

export function formatTripType(
  q: Pick<UcQuotationListItem, 'tripType'>,
): string {
  return UC_TRIP_TYPE_LABEL[q.tripType];
}

/* ================================================================
 * Status tone (brand palette only)
 * ================================================================ */

export type StatusTone = { fg: string; bg: string };

export const STATUS_TONE: Readonly<Record<UcQuotationStatus, StatusTone>> = {
  draft: { fg: Colors.textSecondary, bg: Colors.surfaceMuted },
  sent: { fg: Colors.info, bg: Colors.infoTint },
  accepted: { fg: Colors.success, bg: Colors.successTint },
  rejected: { fg: Colors.error, bg: Colors.errorTint },
};
