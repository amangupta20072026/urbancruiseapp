import { useQuery } from '@tanstack/react-query';
import { dashboardMock } from '../../../../mocks/data/dashboardMock';
import { getFixtureUpcomingTrips } from '../../../../mocks/fixtures/ucTrips';
import { DASHBOARD_UPCOMING_TRIPS_LIMIT, type DashboardData } from '../types';

// TODO(backend): move to src/constants/queryKeys.ts
export const UC_DASHBOARD_KEY = ['uc', 'dashboard'] as const;

async function fetchDashboard(): Promise<DashboardData> {
  // TODO(backend): const { data } = await api.get<DashboardData>(endpoints.uc.dashboard);
  // return data;
  // The backend must return `upcomingTrips` already sorted soonest
  // first and limited to DASHBOARD_UPCOMING_TRIPS_LIMIT (see types.ts).
  await new Promise<void>(resolve => setTimeout(resolve, 300));
  return {
    ...dashboardMock,
    upcomingTrips: getFixtureUpcomingTrips(DASHBOARD_UPCOMING_TRIPS_LIMIT),
  };
}

/** Greeting, stat cards and the next upcoming trips. */
export function useDashboard() {
  return useQuery({
    queryKey: UC_DASHBOARD_KEY,
    queryFn: fetchDashboard,
    staleTime: 60_000,
  });
}
