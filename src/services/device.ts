/**
 * ------------------------------------------------------------------
 * Device Info — wire shape for auth_sessions
 * ------------------------------------------------------------------
 * Wraps react-native-device-info into a single tiny record we can
 * send with every login-establishing request. The server writes
 * this into `auth_sessions.device_id` / `.device_name` / `.platform`
 * / `.app_version` so the user can later see (and revoke) "which
 * devices are logged in as me".
 *
 * WHY THIS FILE EXISTS (vs. calling DeviceInfo directly at the
 * callsite): three of the four getters are async, some can throw
 * on emulators / restricted devices, and we want ONE resilient
 * shape everyone agrees on. Fallbacks keep login working even when
 * a getter fails — the server just won't be able to distinguish
 * this device from other "unknown-device" sessions.
 *
 * Callers should treat this as best-effort telemetry, not identity.
 * ------------------------------------------------------------------
 */

import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

export type DeviceInfoPayload = {
  /** Persistent per-install ID. `getUniqueId()` is stable across app
   *  restarts and (on Android) survives reinstalls; on iOS it's an
   *  IDFV, which resets when the last app from your team is deleted. */
  id: string;
  /** Human-readable string like "Pixel 8 · Android 15". Shown to the
   *  user on the Sessions screen — do not put any raw fingerprint
   *  here, keep it presentational. */
  name: string;
  platform: 'ios' | 'android';
  /** `${version} (${build})`, e.g. "1.4.2 (127)". Kept as one field
   *  so the server row is one column, not two. */
  appVersion: string;
};

const FALLBACK_ID = 'unknown-device';
const FALLBACK_NAME = 'Unknown device';
const FALLBACK_VERSION = '0.0.0 (0)';

/**
 * Best-effort resolver. Never throws — every getter is guarded so a
 * login can succeed on any device, even a rooted emulator that
 * blocks the underlying native call.
 *
 * Order matters: `getUniqueId` is async and the most likely to
 * stall on a locked keychain; run it first and let the rest fall
 * behind it in the same microtask.
 */
export async function getDeviceInfo(): Promise<DeviceInfoPayload> {
  const platform: DeviceInfoPayload['platform'] =
    Platform.OS === 'ios'
      ? 'ios'
      : 'android';

  const [id, model, systemVersion] = await Promise.all([
    safeAsync(() => DeviceInfo.getUniqueId(), FALLBACK_ID),
    safeAsync(() => Promise.resolve(DeviceInfo.getModel()), 'Unknown model'),
    safeAsync(() => Promise.resolve(DeviceInfo.getSystemVersion()), '?'),
  ]);

  const version = safeSync(() => DeviceInfo.getVersion(), '0.0.0');
  const build = safeSync(() => DeviceInfo.getBuildNumber(), '0');

  return {
    id,
    // e.g. "Pixel 8 · Android 15" / "iPhone 15 · iOS 18.1"
    name: `${model} · ${
      platform === 'ios' ? 'iOS' : 'Android'
    } ${systemVersion}`,
    platform,
    appVersion: `${version} (${build})`,
  };
}

/* -----------------------------------------------------------------
 * Internals
 * ----------------------------------------------------------------- */

async function safeAsync<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    const v = await fn();
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function safeSync<T>(fn: () => T, fallback: T): T {
  try {
    const v = fn();
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

// Re-exported for the (rare) callsite that wants a Sessions-screen
// row and already has a DeviceInfoPayload — this collapses a
// two-line "platform + version" template into a one-liner.
export function formatDeviceLine(d: DeviceInfoPayload): string {
  return `${d.name} · v${d.appVersion}`;
}

/* Fallbacks are exported for tests. */
export const __fallbacks = {
  id: FALLBACK_ID,
  name: FALLBACK_NAME,
  version: FALLBACK_VERSION,
};
