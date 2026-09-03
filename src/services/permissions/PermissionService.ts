/**
 * ------------------------------------------------------------------
 * PermissionService — Runtime implementation
 * ------------------------------------------------------------------
 * Single entry point for every permission interaction in the app.
 * Features NEVER call `PermissionsAndroid`, `check()`, or `request()`
 * directly — they call `ensureCapability(cap)` and branch on the
 * returned `EnsureResult`.
 *
 * Per-capability flow (executed inside `ensureCapability`):
 *
 *   1. RBAC gate           — canRoleRequest(cap, role)? If not,
 *                            resolve `unavailable / rbac` and fire a
 *                            telemetry violation.
 *   2. Live OS check       — via react-native-permissions.
 *   3. Branch on status:
 *      granted  / limited  → precondition check (if location cap)
 *                            then resolve.
 *      denied              → rationale sheet → (if descriptor requires)
 *                            prominent disclosure → OS prompt → cache.
 *      blocked             → blocked-recovery sheet with Open Settings.
 *      unavailable         → resolve `unavailable / device`.
 *   4. Every transition dispatches into permissionsSlice so screens
 *      react.
 *   5. Every transition emits a telemetry event.
 *
 * NON-GOALS:
 *   - Rendering the sheets (see sheetHandlers.ts — pluggable).
 *   - Actually fetching a location fix (that's the location service).
 *   - Persisting cache across cold starts (deliberately not — the OS
 *     is the source of truth; see permissionsSlice header).
 * ------------------------------------------------------------------
 */

import { AppState, Linking, Platform, type AppStateStatus } from 'react-native';
import {
  check,
  checkNotifications,
  openSettings as rnpOpenSettings,
  request,
  requestNotifications,
  RESULTS,
  type PermissionStatus,
} from 'react-native-permissions';

import {
  canRoleRequest,
  getCapability,
  type Capability,
} from '@rbac/capabilities';
import type { UserRole } from '@rbac/roles';
import { store } from '@store';
import { statusChanged } from '@store/slices/permissionsSlice';
import { isDeviceLocationEnabled } from '@services/driverLocation';

import {
  BACKGROUND_LOCATION_PERM,
  CAMERA_PERM,
  FOREGROUND_LOCATION_PERM,
} from './platformMap';
import { getSheetHandlers } from './sheetHandlers';
import { emitPermissionEvent } from './telemetry';
import type { CapabilityStatus, EnsureResult } from './types';
import { PermissionServiceError } from './types';

/* -----------------------------------------------------------------
 * Non-prompting query
 * ----------------------------------------------------------------- */

export type CheckOptions = {
  /** Bypass the cached status and force a live OS check. */
  readonly force?: boolean;
};

export async function checkCapability(
  cap: Capability,
  role: UserRole | null,
  opts: CheckOptions = {},
): Promise<CapabilityStatus> {
  if (!canRoleRequest(cap, role)) {
    return 'unavailable';
  }

  if (!opts.force) {
    const cached = store.getState().permissions.entries[cap];
    if (cached && cached.status !== 'unknown') return cached.status;
  }

  const live = await liveCheck(cap);
  writeCache(cap, live);
  emitPermissionEvent(cap, 'check', { status: live });
  return live;
}

/* -----------------------------------------------------------------
 * Prompting flow — dispatches to per-capability handler
 * ----------------------------------------------------------------- */

export async function ensureCapability(
  cap: Capability,
  role: UserRole | null,
): Promise<EnsureResult> {
  if (!canRoleRequest(cap, role)) {
    emitPermissionEvent(cap, 'rbac_violation', { role });
    return { status: 'unavailable', reason: 'rbac' };
  }

  switch (cap) {
    case 'notifications':
      return ensureNotifications(cap);
    case 'foregroundLocation':
      return ensureForegroundLocation(cap);
    case 'backgroundLocation':
      return ensureBackgroundLocation(cap);
    case 'camera':
      return ensureCamera(cap);
    case 'photoPicker':
    case 'phoneDialer':
    case 'downloadPdf':
      // Zero-permission capabilities. RBAC gate passed above; nothing
      // more to do. Callers still invoke `ensureCapability` for API
      // symmetry so feature code has one shape.
      writeCache(cap, 'granted');
      return { status: 'granted' };
  }
}

/* -----------------------------------------------------------------
 * Settings deep-links
 * ----------------------------------------------------------------- */

export async function openAppSettings(): Promise<void> {
  try {
    await rnpOpenSettings();
  } catch {
    // Very rare — some OEMs restrict the intent. Fallback: no-op.
    // The user is looking at a blocked-recovery sheet with clear copy
    // — they can navigate manually.
  }
}

export async function openLocationSettings(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
      return;
    } catch {
      // Some OEMs block the intent; fall through to app settings.
    }
  }
  // iOS: no reliable public URL to the Location Services master toggle.
  // Best we can do is send them to the app's own settings page — the
  // banner text guides them from there.
  await openAppSettings();
}

/* -----------------------------------------------------------------
 * App-resume watcher
 *
 * Subscribes to AppState 'active'; re-checks all cached capabilities
 * against the OS. Handles the "user revoked from Settings while app
 * was backgrounded" case.
 * ----------------------------------------------------------------- */

export type Unsubscribe = () => void;

export function startAppResumeWatcher(): Unsubscribe {
  let previous: AppStateStatus = AppState.currentState;

  const sub = AppState.addEventListener('change', async next => {
    const returningToForeground =
      /inactive|background/.test(previous) && next === 'active';
    previous = next;

    if (!returningToForeground) return;

    const role = store.getState().app.userRole;
    const cachedKeys = Object.keys(
      store.getState().permissions.entries,
    ) as Capability[];

    // Refresh in parallel; one failure must not block others.
    await Promise.all(
      cachedKeys.map(cap =>
        checkCapability(cap, role, { force: true }).catch(() => {
          /* swallow — cap-specific errors are logged by liveCheck */
        }),
      ),
    );
  });

  return () => sub.remove();
}

/* =================================================================
 * Per-capability ensurers (private)
 * ================================================================= */

async function ensureNotifications(cap: Capability): Promise<EnsureResult> {
  const current = mapRnpResult((await checkNotifications()).status);
  writeCache(cap, current);

  if (current === 'granted' || current === 'limited') {
    return { status: 'granted' };
  }
  if (current === 'blocked') return handleBlocked(cap);
  if (current === 'unavailable') {
    return { status: 'unavailable', reason: 'device' };
  }

  // denied — show rationale then request
  const proceed = await showRationale(cap);
  if (proceed === 'dismiss') {
    return { status: 'denied', canRetry: true };
  }

  emitPermissionEvent(cap, 'prompt_shown');
  const result = mapRnpResult(
    (await requestNotifications(['alert', 'badge', 'sound'])).status,
  );
  writeCache(cap, result);
  emitPermissionEvent(cap, result === 'granted' ? 'granted' : 'denied');

  if (result === 'granted' || result === 'limited') {
    return { status: 'granted' };
  }
  if (result === 'blocked') return handleBlocked(cap);
  return { status: 'denied', canRetry: false };
}

async function ensureCamera(cap: Capability): Promise<EnsureResult> {
  if (!CAMERA_PERM) return { status: 'unavailable', reason: 'unsupported-os' };

  const current = mapRnpResult(await check(CAMERA_PERM));
  writeCache(cap, current);

  if (current === 'granted') return { status: 'granted' };
  if (current === 'blocked') return handleBlocked(cap);
  if (current === 'unavailable') {
    return { status: 'unavailable', reason: 'device' };
  }

  const proceed = await showRationale(cap);
  if (proceed === 'dismiss') return { status: 'denied', canRetry: true };

  emitPermissionEvent(cap, 'prompt_shown');
  const result = mapRnpResult(await request(CAMERA_PERM));
  writeCache(cap, result);
  emitPermissionEvent(cap, result === 'granted' ? 'granted' : 'denied');

  if (result === 'granted') return { status: 'granted' };
  if (result === 'blocked') return handleBlocked(cap);
  return { status: 'denied', canRetry: false };
}

async function ensureForegroundLocation(
  cap: Capability,
): Promise<EnsureResult> {
  if (!FOREGROUND_LOCATION_PERM) {
    return { status: 'unavailable', reason: 'unsupported-os' };
  }

  const current = mapRnpResult(await check(FOREGROUND_LOCATION_PERM));
  writeCache(cap, current);

  if (current === 'granted' || current === 'limited') {
    return checkGpsPrecondition(cap, current);
  }
  if (current === 'blocked') return handleBlocked(cap);
  if (current === 'unavailable') {
    return { status: 'unavailable', reason: 'device' };
  }

  const proceed = await showRationale(cap);
  if (proceed === 'dismiss') return { status: 'denied', canRetry: true };

  emitPermissionEvent(cap, 'prompt_shown');
  const result = mapRnpResult(await request(FOREGROUND_LOCATION_PERM));
  writeCache(cap, result);
  emitPermissionEvent(cap, result === 'granted' ? 'granted' : 'denied');

  if (result === 'granted' || result === 'limited') {
    return checkGpsPrecondition(cap, result);
  }
  if (result === 'blocked') return handleBlocked(cap);
  return { status: 'denied', canRetry: false };
}

/**
 * Two-step incremental flow required by Android 11+ and iOS:
 *   1. Foreground first — must be granted before the OS will consider
 *      any background request.
 *   2. Prominent disclosure — Play policy requirement.
 *   3. Background request. On Android 11+ this deep-links into system
 *      Settings (not a dialog); the user's real choice is picked up
 *      by the app-resume watcher on their return.
 */
async function ensureBackgroundLocation(
  cap: Capability,
): Promise<EnsureResult> {
  // ── Step 1: foreground must be granted ─────────────────────────
  const fg = await ensureForegroundLocation('foregroundLocation');
  const fgOk =
    fg.status === 'granted' ||
    fg.status === 'limited' ||
    fg.status === 'preconditionFailed'; // GPS off is a runtime issue, not a perm block

  if (!fgOk) return fg;

  if (!BACKGROUND_LOCATION_PERM) {
    return { status: 'unavailable', reason: 'unsupported-os' };
  }

  // ── Step 2: current background status ──────────────────────────
  const current = mapRnpResult(await check(BACKGROUND_LOCATION_PERM));
  writeCache(cap, current);

  if (current === 'granted') return checkGpsPrecondition(cap, 'granted');
  if (current === 'blocked') return handleBlocked(cap);
  if (current === 'unavailable') {
    return { status: 'unavailable', reason: 'device' };
  }

  // ── Step 3: prominent disclosure BEFORE OS prompt (Play policy) ─
  const descriptor = getCapability(cap);
  emitPermissionEvent(cap, 'prominent_disclosure_shown');
  const disclosure = await getSheetHandlers().showProminentDisclosure(
    descriptor.rationale,
  );
  if (disclosure === 'dismiss') {
    emitPermissionEvent(cap, 'prominent_disclosure_dismissed');
    return { status: 'denied', canRetry: true };
  }

  // ── Step 4: OS request (opens Settings on Android 11+) ─────────
  emitPermissionEvent(cap, 'prompt_shown');
  const result = mapRnpResult(await request(BACKGROUND_LOCATION_PERM));
  writeCache(cap, result);
  emitPermissionEvent(cap, result === 'granted' ? 'granted' : 'denied');

  if (result === 'granted') return checkGpsPrecondition(cap, 'granted');
  if (result === 'blocked') return handleBlocked(cap);
  return { status: 'denied', canRetry: false };
}

/* =================================================================
 * Shared helpers (private)
 * ================================================================= */

async function liveCheck(cap: Capability): Promise<CapabilityStatus> {
  switch (cap) {
    case 'notifications':
      return mapRnpResult((await checkNotifications()).status);
    case 'foregroundLocation':
      return FOREGROUND_LOCATION_PERM
        ? mapRnpResult(await check(FOREGROUND_LOCATION_PERM))
        : 'unavailable';
    case 'backgroundLocation':
      return BACKGROUND_LOCATION_PERM
        ? mapRnpResult(await check(BACKGROUND_LOCATION_PERM))
        : 'unavailable';
    case 'camera':
      return CAMERA_PERM
        ? mapRnpResult(await check(CAMERA_PERM))
        : 'unavailable';
    case 'photoPicker':
    case 'phoneDialer':
    case 'downloadPdf':
      return 'granted';
  }
}

async function showRationale(cap: Capability): Promise<'continue' | 'dismiss'> {
  const descriptor = getCapability(cap);
  emitPermissionEvent(cap, 'rationale_shown');
  const choice = await getSheetHandlers().showRationale(descriptor.rationale);
  if (choice === 'dismiss') emitPermissionEvent(cap, 'rationale_dismissed');
  return choice;
}

async function handleBlocked(cap: Capability): Promise<EnsureResult> {
  emitPermissionEvent(cap, 'blocked');
  emitPermissionEvent(cap, 'blocked_recovery_shown');
  const descriptor = getCapability(cap);
  const choice = await getSheetHandlers().showBlockedRecovery(
    descriptor.rationale,
  );
  if (choice === 'openSettings') {
    emitPermissionEvent(cap, 'settings_opened');
    await openAppSettings();
  }
  return { status: 'blocked' };
}

async function checkGpsPrecondition(
  cap: Capability,
  status: 'granted' | 'limited',
): Promise<EnsureResult> {
  const on = await isDeviceLocationOn();
  writeCache(cap, status, on);

  if (!on) {
    emitPermissionEvent(cap, 'gps_off');
    return { status: 'preconditionFailed', reason: 'gpsOff' };
  }
  return status === 'limited' ? { status: 'limited' } : { status: 'granted' };
}

/**
 * Device GPS master-switch state.
 *
 * Delegated to `@services/driverLocation` which owns the native
 * bridge to LocationManager. Kept OUT of this file so PermissionService
 * has no dependency on `react-native-geolocation-service` — that
 * library assumes callers have already checked perms, which would
 * flip the dep direction (permissions ← location) upside down.
 *
 * The driverLocation implementation:
 *   - Android: LocationManager.isLocationEnabled (API 28+) via a
 *              native module; provider fallback on API 24–27.
 *   - iOS:     optimistic `true` — CLLocationManager's status check
 *              requires main-thread gymnastics; watchPosition's
 *              error path surfaces "off" state at the trip screen.
 *
 * A false positive here shows a "Turn on Location" banner briefly
 * that the app-resume watcher will clear. A false negative silently
 * blocks a driver whose GPS is on. We prefer the false positive.
 */
async function isDeviceLocationOn(): Promise<boolean> {
  return isDeviceLocationEnabled();
}

function mapRnpResult(result: PermissionStatus): CapabilityStatus {
  switch (result) {
    case RESULTS.GRANTED:
      return 'granted';
    case RESULTS.DENIED:
      return 'denied';
    case RESULTS.BLOCKED:
      return 'blocked';
    case RESULTS.LIMITED:
      return 'limited';
    case RESULTS.UNAVAILABLE:
      return 'unavailable';
    default:
      // The union above is exhaustive against RESULTS in v5.6.x, but
      // future library versions may add new values. Fail safe: treat
      // as unknown rather than throw.
      return 'unknown';
  }
}

function writeCache(
  cap: Capability,
  status: CapabilityStatus,
  deviceLocationOn: boolean | null = null,
): void {
  store.dispatch(statusChanged({ capability: cap, status, deviceLocationOn }));
}

/* -----------------------------------------------------------------
 * Escape hatch for exceptional conditions
 *
 * Kept exported so callers who explicitly want to know about a bug
 * (rather than silently get `unavailable`) can catch it. Not used by
 * the runtime itself.
 * ----------------------------------------------------------------- */

export { PermissionServiceError };
