/**
 * ------------------------------------------------------------------
 * Booking card route — which cities the card shows
 * ------------------------------------------------------------------
 * The card reads "from → to". When a trip starts and ends in the same
 * city (round trip, pickup & drop) that would read "Mumbai → Mumbai",
 * which says nothing about where the trip goes, so ONE different city
 * is shown between them: "Mumbai → Pune → Mumbai".
 *
 * Trips with different start and end cities never get a middle city.
 *
 * `pickViaCity` is the rule. The list item carries its result as
 * `viaCity` (the backend should compute it with the same rule), and
 * the mocks assert the two agree.
 * ------------------------------------------------------------------
 */

import type { BookingItineraryStop, CustomerBookingListItem } from '../types';

/**
 * The one city to show between a trip's start and end city, or null.
 *
 *  1. Only for trips that end where they started.
 *  2. A stop the customer stays at (`stay`) wins: on a pickup & drop
 *     trip that is the destination ("Bengaluru → Mysuru → Bengaluru").
 *  3. Otherwise the first stop in a different city.
 */
export function pickViaCity(
  itinerary: readonly BookingItineraryStop[],
): string | null {
  const first = itinerary[0]?.city;
  const last = itinerary[itinerary.length - 1]?.city;
  if (!first || first !== last) return null;

  const middle = itinerary.slice(1, -1).filter(stop => stop.city !== first);
  return (middle.find(stop => stop.stay) ?? middle[0])?.city ?? null;
}

/** Cities to draw on the card, in order: 2 normally, 3 with a via. */
export function getRouteCities(
  item: Pick<CustomerBookingListItem, 'from' | 'to' | 'viaCity'>,
): readonly string[] {
  const sameEnds = item.from === item.to;
  if (sameEnds && item.viaCity && item.viaCity !== item.from) {
    return [item.from, item.viaCity, item.to];
  }
  return [item.from, item.to];
}
