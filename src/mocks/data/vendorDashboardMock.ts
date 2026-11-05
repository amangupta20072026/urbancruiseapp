/**
 * ------------------------------------------------------------------
 * MOCK: Vendor dashboard
 * ------------------------------------------------------------------
 * Feeds useVendorDashboard / useVendorBookingTrend until the
 * `/vendor/dashboard` endpoints ship. SAMPLE VALUES ONLY — names,
 * places, vehicles and trip references are made up. Delete this module
 * when the hooks call the real API.
 * ------------------------------------------------------------------
 */

import { asTripId } from '@app-types/ids';
import { asISODateTime } from '@app-types/datetime';
import { toLocalDay } from '@features/uc/dashboard/utils/format';
import type { BookingTrend, TrendRange } from '@features/uc/dashboard/types';
import type { VendorDashboardData } from '@features/vendor/dashboard/types';

/** Trip start at `hour:minute` local time, `daysFromToday` days away. */
function pickupAt(
  daysFromToday: number,
  hour: number,
  minute: number,
  today: Date,
): string {
  return new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + daysFromToday,
    hour,
    minute,
  ).toISOString();
}

export function vendorDashboardMock(
  today: Date = new Date(),
): VendorDashboardData {
  return {
    greeting: { name: 'Rajesh' },
    stats: [
      {
        key: 'vehicles',
        label: 'Total Vehicles',
        value: '32',
        deltaPct: 12.5,
        trend: 'up',
        compareLabel: 'vs last month',
      },
      {
        key: 'drivers',
        label: 'Total Drivers',
        value: '28',
        deltaPct: 8.2,
        trend: 'up',
        compareLabel: 'vs last month',
      },
      {
        key: 'bookings',
        label: 'Total Bookings',
        value: '86',
        deltaPct: 15.3,
        trend: 'up',
        compareLabel: 'vs yesterday',
      },
      {
        key: 'trips',
        label: 'Total Trips',
        value: '64',
        deltaPct: 4.6,
        trend: 'down',
        compareLabel: 'vs yesterday',
      },
    ],
    vehicleStatus: [
      { key: 'on_trip', count: 25 },
      { key: 'upcoming', count: 4 },
      { key: 'under_service', count: 2 },
      { key: 'inactive', count: 1 },
    ],
    upcomingTrips: [
      {
        id: asTripId('v-t-12345'),
        tripRef: 'TRP-UC12345',
        tripType: 'one_way',
        fromCity: 'Connaught Place',
        toCity: 'Gurugram',
        scheduledAt: asISODateTime(pickupAt(1, 10, 30, today)),
        vehicleName: 'Toyota Innova Crysta',
        seatingCapacity: 7,
        driverName: 'Manoj Kumar',
      },
      {
        id: asTripId('v-t-12347'),
        tripRef: 'TRP-UC12347',
        tripType: 'round_trip',
        fromCity: 'Delhi',
        toCity: 'Jaipur',
        scheduledAt: asISODateTime(pickupAt(3, 6, 0, today)),
        vehicleName: 'Force Traveller',
        seatingCapacity: 13,
        // Not assigned yet: exercises the amber "Driver not assigned".
        driverName: null,
      },
      {
        id: asTripId('v-t-12350'),
        tripRef: 'TRP-UC12350',
        tripType: 'pickup_drop',
        fromCity: 'IGI Airport',
        toCity: 'Noida',
        scheduledAt: asISODateTime(pickupAt(4, 21, 15, today)),
        // Not assigned yet: exercises the amber "Vehicle not assigned".
        vehicleName: null,
        seatingCapacity: null,
        driverName: 'Suresh Yadav',
      },
    ],
  };
}

/** Last 7 days, oldest first (sample counts). */
const LAST_7 = [14, 27, 40, 23, 39, 46, 58] as const;

/**
 * Daily booking counts for `range` days, oldest first, ending today.
 * No `margin`: a vendor's trend shows booking counts only.
 */
export function vendorBookingTrendMock(
  range: TrendRange,
  today: Date = new Date(),
): BookingTrend {
  const points = Array.from({ length: range }, (_, i) => {
    const daysAgo = range - 1 - i;
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - daysAgo,
    );
    const count =
      daysAgo < LAST_7.length
        ? LAST_7[LAST_7.length - 1 - daysAgo]
        : 10 + ((daysAgo * 29) % 37);
    return { date: toLocalDay(date), count };
  });
  return { range, points };
}
