/**
 * Mock UC dashboard data — used until the real /uc/dashboard
 * endpoints ship. When the backend goes live, this file is deleted.
 */

import { rupeesToMoney } from '@app-types/currency';
import { toLocalDay } from '@features/uc/dashboard/utils/format';
import type {
  BookingTrend,
  DashboardData,
  TrendRange,
} from '@features/uc/dashboard/types';

/** Upcoming trips come from the shared trip fixture (useDashboard). */
export const dashboardMock: Omit<DashboardData, 'upcomingTrips'> = {
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
    // MOCK margin: count × a per-booking margin of ₹600–₹780 that
    // varies by day. Sample values only — the real figure comes from
    // the backend (customer price without GST − vendor cost).
    const perBookingRupees = 600 + ((daysAgo * 53) % 181);
    return {
      date: toLocalDay(date),
      count,
      margin: rupeesToMoney(count * perBookingRupees),
    };
  });
  return { range, points };
}
