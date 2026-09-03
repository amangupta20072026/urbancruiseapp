/**
 * ------------------------------------------------------------------
 * usePermission — React hooks over PermissionService
 * ------------------------------------------------------------------
 *   useCapabilityStatus(cap)
 *     - reactive subscription to permissionsSlice
 *     - kicks off a background live-check on mount / role change
 *     - returns { status, deviceLocationOn, isChecking }
 *
 *   useEnsurePermission(cap)
 *     - stable callback that runs the full ensure() flow on demand
 *     - resolves with EnsureResult so the caller can react
 *
 * Both hooks read the current role from Redux; callers never pass it.
 * That closes the RBAC gate at the hook layer AND at the service layer.
 * ------------------------------------------------------------------
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Capability } from '@rbac/capabilities';
import { useAppSelector } from '@store/hooks';

import { checkCapability, ensureCapability } from './PermissionService';
import type { CapabilityStatus, EnsureResult } from './types';

/* -----------------------------------------------------------------
 * useCapabilityStatus
 * ----------------------------------------------------------------- */

export type CapabilityStatusView = {
  status: CapabilityStatus;
  deviceLocationOn: boolean | null;
  isChecking: boolean;
};

export function useCapabilityStatus(cap: Capability): CapabilityStatusView {
  const entry = useAppSelector(s => s.permissions.entries[cap]);
  const role = useAppSelector(s => s.app.userRole);
  const [isChecking, setIsChecking] = useState<boolean>(entry === undefined);

  // Live-check on mount and when the role changes. Guarded so a
  // hot-reload / rapid remount doesn't stack overlapping requests.
  const inflight = useRef(false);
  useEffect(() => {
    if (inflight.current) return;
    inflight.current = true;
    setIsChecking(true);
    checkCapability(cap, role)
      .catch(() => {
        /* liveCheck failure is handled inside the service */
      })
      .finally(() => {
        inflight.current = false;
        setIsChecking(false);
      });
  }, [cap, role]);

  return {
    status: entry?.status ?? 'unknown',
    deviceLocationOn: entry?.deviceLocationOn ?? null,
    isChecking,
  };
}

/* -----------------------------------------------------------------
 * useEnsurePermission
 * ----------------------------------------------------------------- */

export type EnsureFn = () => Promise<EnsureResult>;

export function useEnsurePermission(cap: Capability): EnsureFn {
  const role = useAppSelector(s => s.app.userRole);

  return useCallback(() => ensureCapability(cap, role), [cap, role]);
}
