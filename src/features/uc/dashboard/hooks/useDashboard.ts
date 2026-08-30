import { useQuery } from '@tanstack/react-query';
import { dashboardMock } from '../../../../mocks/data/dashboardMock';
import type { DashboardData } from '../types';

// TODO(backend): move to src/constants/queryKeys.ts
const UC_DASHBOARD_KEY = ['uc', 'dashboard'] as const;

async function fetchDashboard(): Promise<DashboardData> {
  // TODO(backend): const { data } = await api.get<DashboardData>(endpoints.uc.dashboard);
  // return data;

  await new Promise<void>(resolve => setTimeout(resolve, 300));

  return dashboardMock;
}

export function useDashboard() {
  return useQuery({
    queryKey: UC_DASHBOARD_KEY,
    queryFn: fetchDashboard,
    staleTime: 60_000,
  });
}
