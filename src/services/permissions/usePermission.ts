/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * usePermission — React hooks over PermissionService (SCAFFOLD)
 * ------------------------------------------------------------------
 * Two hooks — that's it. Everything else is a private helper.
 *
 *   useCapabilityStatus(cap)
 *     - subscribes to permissionsSlice for reactive status
 *     - returns { status, deviceLocationOn, isChecking }
 *     - safe to call in render
 *     - callers do NOT pass role — the hook reads it from Redux,
 *       which closes the RBAC gate at the hook layer too
 *
 *   useEnsurePermission(cap)
 *     - returns a stable callback that runs the full ensure() flow
 *     - rationale sheet → prominent disclosure (if needed) → OS
 *       prompt → cache write → blocked-recovery on hard denial
 *     - resolves with the final EnsureResult so the caller can react
 *
 * IMPLEMENTATION STATUS: hook signatures are FINAL; bodies are
 * scaffold and will throw NOT_IMPLEMENTED at runtime. Screens can
 * be wired to the hook shape now and light up when the service body
 * lands.
 * ------------------------------------------------------------------
 */

import { useCallback } from 'react';

import type { Capability } from '@rbac/capabilities';
import { useAppSelector } from '@store/hooks';

import type { CapabilityStatus, EnsureResult } from './types';
import { PermissionServiceError } from './types';

/* -----------------------------------------------------------------
 * useCapabilityStatus
 * ----------------------------------------------------------------- */

export type CapabilityStatusView = {
  status: CapabilityStatus;
  /**
   * For location capabilities: last-known device Location Services
   * state. `null` for non-location capabilities or when not yet
   * checked. Screens use this to render the "Turn on location" banner
   * separately from the permission-denied banner.
   */
  deviceLocationOn: boolean | null;
  /** True while a live check is in flight and no cached result exists. */
  isChecking: boolean;
};

export function useCapabilityStatus(cap: Capability): CapabilityStatusView {
  const entry = useAppSelector(s => s.permissions.entries[cap]);

  // Runtime: an effect here will call PermissionService.checkCapability
  // on mount + on role change, flipping isChecking. Scaffold returns
  // the current cache slice only.
  return {
    status: entry?.status ?? 'unknown',
    deviceLocationOn: entry?.deviceLocationOn ?? null,
    isChecking: false,
  };
}

/* -----------------------------------------------------------------
 * useEnsurePermission
 * ----------------------------------------------------------------- */

export type EnsureFn = () => Promise<EnsureResult>;

export function useEnsurePermission(cap: Capability): EnsureFn {
  const role = useAppSelector(s => s.app.userRole);

  return useCallback(async () => {
    void role;
    void cap;
    throw new PermissionServiceError(
      'NOT_IMPLEMENTED',
      'useEnsurePermission: runtime pending — scaffold only.',
    );
  }, [cap, role]);
}
