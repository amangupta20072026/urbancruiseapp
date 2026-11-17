/**
 * ------------------------------------------------------------------
 * Booking trip dates — day maths + card date format
 * ------------------------------------------------------------------
 * Shared by the Bookings list card and the Booking Details Trip
 * card, so a trip is always the same number of days on both.
 *
 * Booking dates are calendar days ("2026-09-15"), not instants, so
 * all maths is done at UTC midnight. Going through the device
 * timezone would shift the day for anyone west of UTC.
 * ------------------------------------------------------------------
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-09-15" → UTC midnight of that day, in milliseconds. */
export function isoDayToUtc(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/**
 * Inclusive number of days: 15 → 17 Sept is 3, a same-day trip is 1.
 * Never below 1, so an end date before the start (bad data) still
 * reads as a one-day trip instead of "0 Days".
 */
export function tripDayCount(startIso: string, endIso: string): number {
  const diff = Math.round(
    (isoDayToUtc(endIso) - isoDayToUtc(startIso)) / DAY_MS,
  );
  return Math.max(0, diff) + 1;
}

/** 3 → "3 Days", 1 → "1 Day". */
export function formatTripDays(days: number): string {
  return `${days} ${days === 1 ? 'Day' : 'Days'}`;
}

/** "2026-11-09" → "09 Nov 2026" (calendar day, timezone-proof). */
export function formatCardDate(iso: string): string {
  return new Date(isoDayToUtc(iso)).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
