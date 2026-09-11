/**
 * ------------------------------------------------------------------
 * FCM token service — register / refresh / unregister with backend
 * ------------------------------------------------------------------
 * PURPOSE
 *   FCM assigns each app install a stable "registration token". The
 *   backend needs that token to target the device. This service is
 *   the ONLY place in the app that:
 *
 *     - asks FCM for the current token,
 *     - listens for FCM-driven token rotations,
 *     - POSTs the token to the backend (register), and
 *     - DELETEs the token on the backend + FCM (unregister on logout).
 *
 * MODULAR API (v22+)
 *   All calls use the tree-shakeable modular API per the RNFirebase
 *   docs (rnfirebase.io/messaging/usage, /reference/messaging).
 *   Namespaced `firebase.messaging()` is deprecated in v22 and would
 *   no-op after v26's namespaced-API removal.
 *
 * iOS AUTO-REGISTRATION
 *   `firebase.json` has `messaging_auto_init_enabled: true` so iOS
 *   auto-registers with APNs on first app open. `getToken` internally
 *   waits for the APNs token before returning. See:
 *   rnfirebase.io/messaging/usage → "Auto Registration (iOS)".
 *
 * FAILURE POSTURE
 *   Push is a NON-CRITICAL feature. Every function here is best-
 *   effort — no throw ever bubbles up to the login flow. If FCM is
 *   broken, permission was denied, or the backend is unreachable,
 *   we log via telemetry and continue. The app still works; the
 *   user just misses pushes until the next opportunity.
 * ------------------------------------------------------------------
 */

import { getApp } from '@react-native-firebase/app';
import {
  getMessaging,
  getToken,
  deleteToken,
  onTokenRefresh,
} from '@react-native-firebase/messaging';

import { apiClient } from '@api/axios';
import { endpoints } from '@api/endpoints';
import { getDeviceInfo, type DeviceInfoPayload } from '@services/device';
import { logError } from '@services/telemetry/logError';
import { logEvent } from '@services/telemetry/logEvent';

/* ------------------------------------------------------------------
 * Wire shape
 * ------------------------------------------------------------------ */

/**
 * Body of POST /notifications/tokens. Same shape as the persisted
 * `push_tokens` row on the backend — the backend upserts on the
 * (user_id, device_id) unique key so re-registering with a rotated
 * token replaces the previous value atomically.
 */
export type RegisterFcmTokenBody = {
  /** The FCM registration token. Opaque to us; FCM controls it. */
  token: string;
  /** Persistent per-install ID from react-native-device-info. Used
   *  as part of the upsert key so re-installs don't leak stale rows. */
  deviceId: string;
  /** 'ios' | 'android'. Used by the backend to route via the
   *  correct APNs / GCM path when calling FCM v1. */
  platform: DeviceInfoPayload['platform'];
  /** Human-readable model + OS, echoed into `push_tokens.device_name`
   *  so a future "Signed-in devices" screen can label rows. */
  deviceName: string;
  /** `"1.0.0 (5)"` — for a future "which app version got this push?"
   *  debugging column. Not used for targeting. */
  appVersion: string;
};

/* ------------------------------------------------------------------
 * Internals
 * ------------------------------------------------------------------ */

/** In-memory de-dupe so we don't POST the same token twice in a row.
 *  Cleared on unregister so the next login always POSTs at least once. */
let lastRegisteredToken: string | null = null;

/** Single onTokenRefresh subscription per process. Guarded so React
 *  StrictMode's double effect-invoke in dev cannot install duplicates. */
let refreshUnsubscribe: (() => void) | null = null;

async function postRegister(token: string): Promise<void> {
  const device = await getDeviceInfo();
  const body: RegisterFcmTokenBody = {
    token,
    deviceId: device.id,
    platform: device.platform,
    deviceName: device.name,
    appVersion: device.appVersion,
  };
  await apiClient.post(endpoints.notifications.tokens.register(), body);
}

/* ------------------------------------------------------------------
 * Public API
 * ------------------------------------------------------------------ */

/**
 * Fetch the current FCM registration token and POST it to the
 * backend. Idempotent — a repeat call with the same token is a no-op
 * (guarded by in-process cache). Call this AFTER a successful login
 * and on every app-authenticated cold start.
 *
 * Does not throw — a failure here must never block login.
 */
export async function registerFcmToken(): Promise<void> {
  try {
    const messaging = getMessaging(getApp());
    const token = await getToken(messaging);
    if (!token) {
      // Can legitimately be null on iOS simulators, or on Android
      // devices that failed the initial FCM registration. Not an
      // error — nothing to report.
      logEvent('fcm.token_unavailable');
      return;
    }
    if (token === lastRegisteredToken) return;

    await postRegister(token);
    lastRegisteredToken = token;
    logEvent('fcm.token_registered');
  } catch (err) {
    logError(err, { boundary: 'fcm.registerToken' });
  }
}

/**
 * Install the FCM onTokenRefresh subscription. FCM rotates tokens
 * on its own schedule (app reinstall, backup restore, notifications
 * disabled/re-enabled in system settings, etc). We MUST re-register
 * every rotated token or the backend will keep pushing to a dead
 * address.
 *
 * Returns an unsubscribe fn; the caller (a Gate component under
 * isAuthenticated) unsubs on unmount to prevent stray writes after
 * logout.
 *
 * Safe to call more than once — later calls are no-ops until the
 * previous subscription is torn down.
 */
export function startFcmTokenRefreshListener(): () => void {
  if (refreshUnsubscribe) return refreshUnsubscribe;

  try {
    const messaging = getMessaging(getApp());
    refreshUnsubscribe = onTokenRefresh(messaging, async token => {
      try {
        if (token === lastRegisteredToken) return;
        await postRegister(token);
        lastRegisteredToken = token;
        logEvent('fcm.token_refreshed');
      } catch (err) {
        logError(err, { boundary: 'fcm.tokenRefresh.post' });
      }
    });
  } catch (err) {
    logError(err, { boundary: 'fcm.tokenRefresh.install' });
    refreshUnsubscribe = null;
  }

  return () => {
    refreshUnsubscribe?.();
    refreshUnsubscribe = null;
  };
}

/**
 * Clean unregister on logout:
 *   1. DELETE /notifications/tokens/:deviceId   — backend forgets us
 *   2. deleteToken()                            — FCM invalidates the token
 *   3. Reset in-memory cache                    — next login re-posts
 *
 * Order matters: hit the backend FIRST while the auth token is still
 * valid. If deleteToken() ran first, an FCM error would risk leaving
 * a live token registered against a logged-out session.
 *
 * Best-effort — logout MUST NOT wait on or fail because of push
 * plumbing, matching the "logout always succeeds locally" contract
 * in useLogout.ts.
 */
export async function unregisterFcmToken(): Promise<void> {
  try {
    const device = await getDeviceInfo();

    try {
      await apiClient.delete(
        endpoints.notifications.tokens.unregister(device.id),
      );
    } catch (err) {
      // Server call failed (network / already-invalid session).
      // Continue — FCM-side cleanup is still worth attempting.
      logError(err, { boundary: 'fcm.unregister.backend' });
    }

    try {
      const messaging = getMessaging(getApp());
      await deleteToken(messaging);
    } catch (err) {
      logError(err, { boundary: 'fcm.unregister.deleteToken' });
    }

    lastRegisteredToken = null;
    logEvent('fcm.token_unregistered');
  } catch (err) {
    logError(err, { boundary: 'fcm.unregister' });
  }
}
