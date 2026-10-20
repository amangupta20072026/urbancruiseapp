/**
 * ------------------------------------------------------------------
 * Time-of-day greeting — shared by every role's home screen
 * ------------------------------------------------------------------
 * Maps the device's local hour to a greeting. Used by the Customer
 * home and the UC dashboard, so every role is greeted the same way.
 *
 *   00:00 – 11:59  →  Good morning
 *   12:00 – 16:59  →  Good afternoon
 *   17:00 – 23:59  →  Good evening
 *
 * Product decision: after midnight is "Good morning" (the new day
 * has started), not "Good evening".
 *
 * Pure functions — pass a Date in tests to pin the clock; production
 * callers can omit it.
 * ------------------------------------------------------------------
 */

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

const GREETING: Readonly<Record<TimeOfDay, string>> = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
};

/** The period of the day, for callers that switch on it (e.g. a
 *  different emoji or accent per period). */
export function getTimeOfDay(now: Date = new Date()): TimeOfDay {
  const hour = now.getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/** 'Good morning' / 'Good afternoon' / 'Good evening'. */
export function getGreeting(now: Date = new Date()): string {
  return GREETING[getTimeOfDay(now)];
}
