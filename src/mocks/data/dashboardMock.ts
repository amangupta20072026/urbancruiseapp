/**
 * Mock UC dashboard data — used until the real /uc/dashboard
 * endpoints ship. When the backend goes live, this file is deleted.
 */

import { asISODateTime } from '@app-types/datetime';
import { toLocalDay } from '@features/uc/dashboard/utils/format';
import type {
  BookingTrend,
  DashboardData,
  TrendRange,
} from '@features/uc/dashboard/types';

export const dashboardMock: DashboardData = {
  greeting: { name: 'Admin' },
  stats: [
    {
      key: 'trips',
      label: 'Total Trips',
      value: '128',
      deltaPct: 12.5,
      trend: 'up',
      compareLabel: 'vs yesterday',
    },
    {
      key: 'customers',
      label: 'Total Customers',
      value: '1,245',
      deltaPct: 8.2,
      trend: 'up',
      compareLabel: 'vs yesterday',
    },
    {
      key: 'bookings',
      label: 'Total Bookings',
      value: '356',
      deltaPct: 15.3,
      trend: 'up',
      compareLabel: 'vs yesterday',
    },
    {
      key: 'quotations',
      label: 'Total Quotations',
      value: '214',
      deltaPct: 10.6,
      trend: 'up',
      compareLabel: 'vs yesterday',
    },
  ],
  recentBookings: [
    {
      id: 'UC12345',
      customerName: 'Rahul Sharma',
      pickupAt: asISODateTime('2025-08-01T10:30:00+05:30'),
      pickup: 'Connaught Place',
      drop: 'Gurugram',
      fare: '₹1,250',
      status: 'upcoming',
    },
    {
      id: 'UC12346',
      customerName: 'Priya Mehta',
      pickupAt: asISODateTime('2025-07-31T09:15:00+05:30'),
      pickup: 'Indira Gandhi Airport',
      drop: 'Noida',
      fare: '₹980',
      status: 'ongoing',
    },
    {
      id: 'UC12347',
      customerName: 'Amit Kumar',
      pickupAt: asISODateTime('2025-07-30T08:40:00+05:30'),
      pickup: 'Mumbai',
      drop: 'Pune',
      fare: '₹3,500',
      status: 'completed',
    },
    {
      id: 'UC12348',
      customerName: 'Sneha Patil',
      pickupAt: asISODateTime('2025-07-29T07:20:00+05:30'),
      pickup: 'Bangalore',
      drop: 'Mysuru',
      fare: '₹2,800',
      status: 'cancelled',
    },
    {
      id: 'UC12349',
      customerName: 'Vikram Tiwari',
      pickupAt: asISODateTime('2025-07-28T06:10:00+05:30'),
      pickup: 'Delhi',
      drop: 'Jaipur',
      fare: '₹1,750',
      status: 'upcoming',
    },
  ],
};

/** Counts for the last 7 days, oldest first (from the design). */
const LAST_7 = [14, 27, 42, 23, 37, 44, 52];

/**
 * Deterministic daily counts for `range` days ending on `today`. The
 * latest 7 days are the same for every range, so switching the range
 * never changes today's number.
 */
export function bookingTrendMock(
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
        : 12 + ((daysAgo * 37) % 31);
    return { date: toLocalDay(date), count };
  });
  return { range, points };
}
