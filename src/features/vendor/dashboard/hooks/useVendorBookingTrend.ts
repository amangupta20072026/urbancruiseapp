/**
 * ------------------------------------------------------------------
 * useVendorBookingTrend — daily booking counts for the trend chart
 * ------------------------------------------------------------------
 * Backend contract (GET endpoints.vendor.dashboard.trend(), i.e.
 * /vendor/dashboard/trend — not built on the backend yet):
 *   params { days: range } → BookingTrend with ONE point per day,
 *   oldest first, ending today, and NO `margin` (vendors see counts
 *   only).
 *
 * Cached per range; while a new range loads, the previous line stays
 * on screen instead of the chart blanking out.
 * ------------------------------------------------------------------
 */

import { keepPreviousData, useQuery } from '@tanstack/react-query';

// Uncomment when the backend is ready:
// import { apiClient } from '@api/axios';
// import { endpoints } from '@api/endpoints';
import { queryKeys } from '@constants/queryKeys';
import { vendorBookingTrendMock } from '@mocks/data/vendorDashboardMock';
import { delayLikeApi } from '@mocks/helpers/delay';
import type { BookingTrend, TrendRange } from '@features/uc/dashboard/types';

async function fetchVendorBookingTrend(
  range: TrendRange,
): Promise<BookingTrend> {
  // TODO(backend):
  // const { data } = await apiClient.get<BookingTrend>(
  //   endpoints.vendor.dashboard.trend(),
  //   { params: { days: range } },
  // );
  // return data;

  /* ---------------------------- TEMP ---------------------------- */
  await delayLikeApi();
  return vendorBookingTrendMock(range);
  /* -------------------------- END TEMP -------------------------- */
}

export function useVendorBookingTrend(range: TrendRange) {
  return useQuery({
    queryKey: queryKeys.vendor.dashboard.bookingTrend(range),
    queryFn: () => fetchVendorBookingTrend(range),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
