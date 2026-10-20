import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { bookingTrendMock } from '../../../../mocks/data/dashboardMock';
import type { BookingTrend, TrendRange } from '../types';
import { UC_DASHBOARD_KEY } from './useDashboard';

async function fetchBookingTrend(range: TrendRange): Promise<BookingTrend> {
  // TODO(backend): GET the trend for `range` days, e.g.
  //   const { data } = await api.get<BookingTrend>(
  //     endpoints.uc.dashboardTrend, { params: { days: range } });
  //   return data;

  await new Promise<void>(resolve => setTimeout(resolve, 300));

  return bookingTrendMock(range);
}

/**
 * Daily bookings for the last `range` days. Cached per range; while a
 * new range loads, the previous line stays on screen instead of the
 * chart blanking out.
 */
export function useBookingTrend(range: TrendRange) {
  return useQuery({
    queryKey: [...UC_DASHBOARD_KEY, 'bookingTrend', range] as const,
    queryFn: () => fetchBookingTrend(range),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
