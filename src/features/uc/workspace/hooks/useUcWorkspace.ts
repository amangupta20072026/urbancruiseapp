/**
 * ------------------------------------------------------------------
 * useUcWorkspace — which dashboard to render for this staff member
 * ------------------------------------------------------------------
 * One call to GET /api/v1/uc/workspace, made once after login and on
 * resume. Cached for the session; never written to disk, because it
 * describes the signed-in person.
 *
 * WHILE IT LOADS, AND IF IT FAILS, the app falls back to 'general' —
 * the workspace with the least in it. Failing open to the business
 * dashboard would show quotation and margin figures to someone whose
 * placement we could not confirm.
 * ------------------------------------------------------------------
 */

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@api/axios';
import { endpoints } from '@api/endpoints';
import { queryKeys } from '@constants/queryKeys';

import type { UcWorkspace, UcWorkspaceInfo } from '../types';

/** Least-privileged default — used before the call lands and if it fails. */
export const FALLBACK_WORKSPACE: UcWorkspace = 'general';

async function fetchWorkspace(): Promise<UcWorkspaceInfo> {
  const { data } = await apiClient.get<UcWorkspaceInfo>(
    endpoints.uc.workspace(),
  );
  return data;
}

export function useUcWorkspace() {
  const query = useQuery<UcWorkspaceInfo, Error>({
    queryKey: queryKeys.uc.workspace(),
    queryFn: fetchWorkspace,
    staleTime: 5 * 60 * 1000,
    meta: { persist: false },
  });

  return {
    workspace: query.data?.workspace ?? FALLBACK_WORKSPACE,
    canSeePersonalNumbers: query.data?.canSeePersonalNumbers ?? false,
    isLoading: query.isPending,
    error: query.error,
  };
}
