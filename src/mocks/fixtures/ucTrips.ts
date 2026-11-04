/**
 * ------------------------------------------------------------------
 * UC trips fixtures — all trips, all customers
 * ------------------------------------------------------------------
 * Product rule: one trip per booking. Built from the SAME
 * deterministic corpus as the UC bookings fixture and each customer's
 * Trip History (`fixtureAllTrips`), so a trip's status, route,
 * amount and booking ref match on every tab.
 *
 * Built lazily on first use and cached (~31k rows).
 *
 * DELETE this file entirely when GET /uc/trips goes live.
 * ------------------------------------------------------------------
 */

import { asTripId } from '@app-types/ids';
import { seatingCapacityFor } from '@mocks/data/customerHistory';
import type { Trip } from '@features/uc/customers/types';
import type { UcTripListItem, UcTripStatus } from '@features/uc/trips/types';

import { fixtureAllTrips } from './ucCustomerHistory';
import { fixtureUcCustomersAll } from './ucCustomers';

const STATUS_FROM_TRIP: Readonly<Record<Trip['status'], UcTripStatus>> = {
  upcoming: 'upcoming',
  in_progress: 'ongoing',
  completed: 'completed',
  cancelled: 'cancelled',
  no_show: 'no_show',
};

let cache: readonly UcTripListItem[] | null = null;

/**
 * MOCK ONLY: a stable fake phone number per trip, so the Call button
 * can be seen in development. Real numbers come from GET /uc/trips.
 */
function mockDriverPhone(tripId: string): string {
  let h = 0;
  for (let i = 0; i < tripId.length; i += 1) {
    h = (h * 31 + tripId.charCodeAt(i)) % 1000000007;
  }
  return `+9198${String(h % 100000000).padStart(8, '0')}`;
}

/**
 * Every trip, newest pickup first (ties broken by id, so the order —
 * and therefore the mock cursor — is fully deterministic).
 */
export function getFixtureUcTrips(): readonly UcTripListItem[] {
  if (cache) return cache;

  const customersById = new Map(fixtureUcCustomersAll.map(c => [c.id, c]));
  const rows: UcTripListItem[] = [];

  for (const trip of fixtureAllTrips) {
    const customer = customersById.get(trip.customerId);
    // Every trip is generated from a customer; guarded so a fixture
    // edit can't crash the list.
    if (!customer) continue;

    rows.push({
      id: asTripId(trip.id),
      tripRef: trip.id,
      bookingRef: trip.bookingRef,
      status: STATUS_FROM_TRIP[trip.status],
      progressStep: trip.progressStep,
      tripType: trip.tripType,
      customerId: customer.id,
      customerName: customer.name,
      fromCity: trip.fromCity,
      toCity: trip.toCity,
      fromLocation: trip.fromLocation,
      toLocation: trip.toLocation,
      scheduledAt: trip.scheduledAt,
      // The mock has no separate start time; the card falls back to
      // scheduledAt.
      startedAt: null,
      completedAt: trip.completedAt,
      passengers: trip.passengers,
      vehicleName: trip.vehicleType,
      // Same source as the UC Bookings fixture, so both tabs agree.
      seatingCapacity: seatingCapacityFor(trip.vehicleType),
      vehicleNumber: trip.vehicleNumber,
      driverName: trip.driverName,
      driverPhone: trip.driverName ? mockDriverPhone(trip.id) : undefined,
      distanceKm: trip.distanceKm,
      durationMinutes: trip.durationMinutes,
      rating: trip.rating,
      amount: trip.amount,
    });
  }

  rows.sort((a, b) => {
    const byTime =
      new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
    if (byTime !== 0) return byTime;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });

  cache = rows;
  return cache;
}

/**
 * The next `limit` upcoming trips, SOONEST FIRST — what the UC
 * dashboard's "Upcoming Trips" shows. Trips whose time has already
 * passed are skipped. The real backend must apply the same rule in
 * GET /uc/dashboard (status 'upcoming', scheduledAt ASC, limit).
 */
export function getFixtureUpcomingTrips(
  limit: number,
  now: Date = new Date(),
): UcTripListItem[] {
  const nowMs = now.getTime();
  return getFixtureUcTrips()
    .filter(
      t =>
        t.status === 'upcoming' && new Date(t.scheduledAt).getTime() >= nowMs,
    )
    .sort((a, b) => {
      const byTime =
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      if (byTime !== 0) return byTime;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    })
    .slice(0, limit);
}
