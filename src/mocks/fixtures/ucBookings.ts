/**
 * ------------------------------------------------------------------
 * UC bookings fixtures — all bookings, all customers
 * ------------------------------------------------------------------
 * Built from the SAME deterministic trip corpus that powers each
 * customer's Trip History (`fixtureAllTrips`), joined with the
 * customer fixtures for name / phone / category. So a booking seen
 * here has the same ref, route, amount and status on that
 * customer's history screen — no mismatch between the two tabs.
 *
 * Built lazily on first use and cached: ~31k rows, and the UC flow
 * should not pay the join cost until the Bookings tab asks for it.
 * (The trip generator itself already runs when the UC flow loads.)
 *
 * DELETE this file entirely when GET /uc/bookings goes live.
 * ------------------------------------------------------------------
 */

import { asBookingId } from '@app-types/ids';
import type { Trip } from '@features/uc/customers/types';
import type {
  UcBookingListItem,
  UcBookingStatus,
} from '@features/uc/bookings/types';

import { seatingCapacityFor } from '@mocks/data/customerHistory';
import { fixtureAllTrips } from './ucCustomerHistory';
import { fixtureUcCustomersAll } from './ucCustomers';

const STATUS_FROM_TRIP: Readonly<Record<Trip['status'], UcBookingStatus>> = {
  upcoming: 'upcoming',
  in_progress: 'ongoing',
  completed: 'completed',
  cancelled: 'cancelled',
  no_show: 'no_show',
};

let cache: readonly UcBookingListItem[] | null = null;

/**
 * Every booking, newest pickup first (ties broken by id, so the
 * order — and therefore the mock cursor — is fully deterministic).
 */
export function getFixtureUcBookings(): readonly UcBookingListItem[] {
  if (cache) return cache;

  const customersById = new Map(fixtureUcCustomersAll.map(c => [c.id, c]));
  const rows: UcBookingListItem[] = [];

  for (const trip of fixtureAllTrips) {
    const customer = customersById.get(trip.customerId);
    // Every trip is generated from a customer, so this never skips
    // in practice; guarded so a fixture edit can't crash the list.
    if (!customer) continue;

    rows.push({
      id: asBookingId(trip.id),
      bookingRef: trip.bookingRef,
      status: STATUS_FROM_TRIP[trip.status],
      progressStep: trip.progressStep,
      tripType: trip.tripType,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phoneIndia,
      customerCategory: customer.category,
      fromCity: trip.fromCity,
      toCity: trip.toCity,
      scheduledAt: trip.scheduledAt,
      passengers: trip.passengers,
      vehicleName: trip.vehicleType,
      seatingCapacity: seatingCapacityFor(trip.vehicleType),
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
