/**
 * ------------------------------------------------------------------
 * useVendorDashboard — greeting, stats, vehicle status, recent bookings
 * ------------------------------------------------------------------
 * Backend contract (GET endpoints.vendor.dashboard.summary(), i.e.
 * /vendor/dashboard — not built on the backend yet):
 *   returns VendorDashboardData (see ../types.ts). No money fields.
 *
 * Until the endpoint ships, the TEMP block serves the mock with the
 * identical shape. To go live: replace the TEMP block with the
 * apiClient call and delete the mock.
 * ------------------------------------------------------------------
 */

import { useQuery } from '@tanstack/react-query';

// Uncomment when the backend is ready:
// import { apiClient } from '@api/axios';
// import { endpoints } from '@api/endpoints';
import { queryKeys } from '@constants/queryKeys';
import { vendorDashboardMock } from '@mocks/data/vendorDashboardMock';
import { delayLikeApi } from '@mocks/helpers/delay';

import type { VendorDashboardData } from '../types';

async function fetchVendorDashboard(): Promise<VendorDashboardData> {
  // TODO(backend):
  // const { data } = await apiClient.get<VendorDashboardData>(
  //   endpoints.vendor.dashboard.summary(),
  // );
  // return data;

  /* ---------------------------- TEMP ---------------------------- */
  await delayLikeApi();
  return vendorDashboardMock();
  /* -------------------------- END TEMP -------------------------- */
}

export function useVendorDashboard() {
  return useQuery({
    queryKey: queryKeys.vendor.dashboard.summary(),
    queryFn: fetchVendorDashboard,
    staleTime: 60_000,
  });
}
