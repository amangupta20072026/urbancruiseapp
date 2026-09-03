/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * PermissionService — Public API surface (SCAFFOLD)
 * ------------------------------------------------------------------
 * Single entry point for every permission interaction in the app.
 *
 * Feature code MUST NEVER call `PermissionsAndroid`, `check()`, or
 * `request()` directly. Features call `ensureCapability(cap)` and
 * branch on the returned `EnsureResult`. That's the only contract.
 *
 * State machine per capability, executed inside `ensureCapability`:
 *
 *   1. RBAC gate           — current role allowed to request `cap`?
 *                            No → resolve `unavailable / rbac`.
 *   2. Cache read          — is the last-known status still trustworthy?
 *   3. Live OS check       — always if cache says 'unknown' or stale;
 *                            otherwise only on force.
 *   4. If 'granted'        — jump to (7).
 *   5. If 'denied'         — show rationale sheet → (if descriptor
 *                            requires) show prominent-disclosure modal
 *                            → OS prompt → cache the result.
 *   6. If 'blocked'        — show blocked-recovery sheet with
 *                            "Open Settings". User returns via
 *                            appResumeWatcher which re-runs (3).
 *   7. Precondition check  — for location caps whose descriptor sets
 *                            `requiresDeviceLocationOn`, verify GPS
 *                            master switch is on. If not, resolve
 *                            `preconditionFailed / gpsOff` and let
 *                            the caller render an inline banner.
 *
 * IMPLEMENTATION STATUS:
 *   This file exposes the FINAL public API but the bodies are stubs
 *   that throw `NOT_IMPLEMENTED`. Runtime lands in a follow-up
 *   commit. Callers can already import, typecheck, and design UI
 *   against this surface.
 * ------------------------------------------------------------------
 */

import { canRoleRequest, type Capability } from '@rbac/capabilities';
import type { UserRole } from '@rbac/roles';

import type { CapabilityStatus, EnsureResult } from './types';
import { PermissionServiceError } from './types';

/* -----------------------------------------------------------------
 * checkCapability — non-prompting query
 * ----------------------------------------------------------------- */

export type CheckOptions = {
  /** Bypass any cached status and force a live OS check. */
  readonly force?: boolean;
};

/**
 * Query the current status of a capability WITHOUT prompting.
 * Reads from the permissionsSlice cache unless `force: true`.
 * Safe to call in render — the returned promise resolves synchronously
 * from cache in the common case.
 */
export async function checkCapability(
  cap: Capability,
  role: UserRole | null,
  opts: CheckOptions = {},
): Promise<CapabilityStatus> {
  void cap;
  void role;
  void opts;
  throw new PermissionServiceError(
    'NOT_IMPLEMENTED',
    'checkCapability: runtime pending — scaffold only.',
  );
}

/* -----------------------------------------------------------------
 * ensureCapability — the prompting flow
 * ----------------------------------------------------------------- */

/**
 * Guarantee a capability is available, prompting the user if needed.
 * Runs the full state machine described in the file header.
 *
 * Callers pattern:
 *
 *   const r = await ensureCapability('camera', role);
 *   if (r.status !== 'granted') {
 *     return handleDenial(r);   // banner / disabled state / etc.
 *   }
 *   launchCamera(...);
 *
 * RBAC violations (a Customer session trying to request Driver's
 * backgroundLocation) short-circuit here to `unavailable / rbac`
 * and fire a telemetry violation — they mean a screen leaked into
 * the wrong role's stack.
 */
export async function ensureCapability(
  cap: Capability,
  role: UserRole | null,
): Promise<EnsureResult> {
  if (!canRoleRequest(cap, role)) {
    return { status: 'unavailable', reason: 'rbac' };
  }
  void cap;
  throw new PermissionServiceError(
    'NOT_IMPLEMENTED',
    'ensureCapability: runtime pending — scaffold only.',
  );
}

/* -----------------------------------------------------------------
 * Settings deep-links
 * ----------------------------------------------------------------- */

/**
 * Deep-link into the OS Settings page for this app. Used by the
 * blocked-recovery sheet. Resolves once the intent has been fired
 * — NOT once the user returns; the app-resume watcher handles that.
 */
export async function openAppSettings(): Promise<void> {
  throw new PermissionServiceError(
    'NOT_IMPLEMENTED',
    'openAppSettings: runtime pending — scaffold only.',
  );
}

/**
 * Deep-link into the OS Location Services (GPS master switch) page.
 * Used when a location capability is granted but device Location
 * Services are OFF (`preconditionFailed / gpsOff`). Distinct from
 * `openAppSettings` — this opens the SYSTEM location toggle, not the
 * per-app permission page.
 */
export async function openLocationSettings(): Promise<void> {
  throw new PermissionServiceError(
    'NOT_IMPLEMENTED',
    'openLocationSettings: runtime pending — scaffold only.',
  );
}

/* -----------------------------------------------------------------
 * App-resume watcher
 *
 * Subscribes to `AppState === 'active'`; re-checks all cached
 * capabilities against the OS. If a previously-granted capability
 * is now blocked (user revoked from Settings), dispatches
 * `statusChanged` so every screen re-renders with correct affordances.
 *
 * Called ONCE from App.tsx (or a bootstrap step). The returned
 * unsubscribe is for tests / hot-reload cleanup — not for feature
 * code to toggle.
 * ----------------------------------------------------------------- */

export type Unsubscribe = () => void;

export function startAppResumeWatcher(): Unsubscribe {
  throw new PermissionServiceError(
    'NOT_IMPLEMENTED',
    'startAppResumeWatcher: runtime pending — scaffold only.',
  );
}
