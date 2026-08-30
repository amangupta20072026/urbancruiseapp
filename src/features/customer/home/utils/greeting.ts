/**
 * ------------------------------------------------------------------
 * Time-of-day greeting helper
 * ------------------------------------------------------------------
 * Maps the current local hour to one of three friendly greetings.
 * Used by the Home screen's GreetingBlock.
 *
 * Bands chosen to match Indian daily rhythm (which is where this
 * app's users are):
 *
 *   05:00 – 11:59  →  Good morning
 *   12:00 – 16:59  →  Good afternoon
 *   17:00 – 04:59  →  Good evening
 *
 * Boundaries are intentional — "Good morning" at 5am rather than 6am
 * accommodates early travel starts; "Good evening" from 5pm through
 * to midnight and pre-dawn matches typical late-night usage patterns.
 *
 * Pure function — inject a Date for testability so unit tests can
 * pin the clock. Callers pass no arguments in production; the default
 * `new Date()` covers the real case.
 * ------------------------------------------------------------------ */

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

/** The greeting phrase for a given clock time. */
export function getGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** The band name, for cases where we want to switch on the period
 * (e.g. different emoji per band, different accent colour). */
export function getTimeOfDay(now: Date = new Date()): TimeOfDay {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}
