/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * useWorkplaceDashboard — tasks + announcements for the 'general' home
 * ------------------------------------------------------------------
 * MOCK ONLY. No endpoint exists: neither `pinaak` nor `saarthi` has a
 * table for tasks or announcements. The real-API branch below is
 * written out so that shipping one is a single flag flip plus an
 * entry in endpoints.ts — the screen itself needs no change.
 *
 * Structured like useStaffList / useCustomerList so every UC data hook
 * reads the same way.
 * ------------------------------------------------------------------
 */

import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@constants/queryKeys';
import { fixtureWorkplaceDashboard } from '@mocks/fixtures/ucWorkplace';
import { delayLikeApi } from '@mocks/helpers/delay';

import type { WorkplaceDashboardData } from '../types';

/** Flip to false once GET /uc/workplace exists, then delete the fixture. */
const USE_MOCK = true;

async function fetchWorkplaceDashboard(): Promise<WorkplaceDashboardData> {
  if (USE_MOCK) {
    await delayLikeApi();
    return fixtureWorkplaceDashboard;
  }
  // The real call goes here. Deliberately not written against a guessed
  // URL: add it to endpoints.ts when the endpoint is agreed.
  throw new Error('Workplace dashboard endpoint is not available yet.');
}

export function useWorkplaceDashboard() {
  const query = useQuery<WorkplaceDashboardData, Error>({
    queryKey: queryKeys.uc.workplace.dashboard(),
    queryFn: fetchWorkplaceDashboard,
    meta: { persist: false },
  });

  return {
    tasks: query.data?.tasks ?? [],
    announcements: query.data?.announcements ?? [],
    isLoading: query.isPending,
    isRefreshing: query.isFetching && !query.isPending,
    error: query.error,
    refresh: () => {
      void query.refetch();
    },
  };
}
