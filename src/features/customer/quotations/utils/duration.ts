/**
 * ------------------------------------------------------------------
 * Quotation duration — shared display helpers
 * ------------------------------------------------------------------
 * One place for the day / rest-day wording, so the list card and
 * the Quotation Details trip card describe a trip the same way.
 *
 * REST DAYS (pickup & drop only):
 *   A pickup & drop trip is two separate legs — the car drops the
 *   customer at the destination, leaves, and comes back later to
 *   bring them home. The days in between are rest days: the car is
 *   not with the customer, so they are NOT counted in `days`.
 *
 *     22 Oct  drop    Pune → Mumbai      counted
 *     23–25   rest    (3 rest days)      not counted
 *     26 Oct  pickup  Mumbai → Pune      counted
 *
 *     → days = 2, restDays = 3, travel window 22–26 Oct
 * ------------------------------------------------------------------
 */

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "1 Day" / "4 Days" */
export function formatDays(days: number): string {
  return plural(days, 'Day', 'Days');
}

/** "1 Rest Day" / "3 Rest Days" */
export function formatRestDays(restDays: number): string {
  return plural(restDays, 'Rest Day', 'Rest Days');
}

/** True when the trip has rest days worth showing. */
export function hasRestDays(restDays: number | undefined): restDays is number {
  return typeof restDays === 'number' && restDays > 0;
}