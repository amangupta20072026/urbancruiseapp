/**
 * ------------------------------------------------------------------
 * DriverLocationService
 * ------------------------------------------------------------------
 * Public JS API for driver trip tracking. Feature code calls exactly
 * three functions:
 *
 *   startDriverTracking()           — begin Android FGS + watchPosition
 *   stopDriverTracking()            — clear watch + stop FGS
 *   subscribeToLocationFixes(cb)    — receive location fixes
 *
 * Plus one utility for the permission layer:
 *
 *   isDeviceLocationEnabled()       — Location Services (GPS) master
 *                                     switch state. Used by
 *                                     PermissionService.isDeviceLocationOn.
 *
 * INVARIANT: this service assumes the caller has already ensured the
 * `backgroundLocation` capability via PermissionService. It does not
 * check permissions itself — that would create a circular boundary
 * (permissions service → driver location service → permissions).
 * If you call `startDriverTracking()` without the perm granted, the
 * OS will silently deny location fixes.
 *
 * Architecture split:
 *   - Android:    FGS (Kotlin class) keeps process alive; JS runs
 *                 Geolocation.watchPosition() which uses LocationManager
 *                 under the hood. The FGS itself does NO location work.
 *   - iOS:        UIBackgroundModes: ["location"] in Info.plist plus
 *                 pausesLocationUpdatesAutomatically = false handles
 *                 background delivery. No native class needed — the
 *                 startForegroundService() call is a no-op on iOS.
 *
 * Threshold tuning:
 *   distanceFilter and interval come from Config.LOCATION_DISTANCE /
 *   LOCATION_INTERVAL — see .env.example. Sane defaults are 10m and
 *   5000ms; going tighter drains battery, wider loses fidelity.
 * ------------------------------------------------------------------
 */

import { NativeModules, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

import { ENV } from '@config/env';
import { logError } from '@services/telemetry/logError';

/* -----------------------------------------------------------------
 * Types
 * ----------------------------------------------------------------- */

export type LocationFix = {
  latitude: number;
  longitude: number;
  /** Horizontal accuracy in metres — treat >50m as suspect. */
  accuracy: number;
  /** m/s. Null when the device can't infer speed (e.g. stationary). */
  speed: number | null;
  /** Compass heading in degrees. Null when the device can't infer. */
  heading: number | null;
  /** Fix timestamp — ms since epoch, as reported by the device. */
  timestamp: number;
};

export type LocationSubscriber = (fix: LocationFix) => void;

type DriverLocationNativeModule = {
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  isLocationEnabled: () => Promise<boolean>;
};

/* -----------------------------------------------------------------
 * Native bridge (Android only — iOS no-ops)
 * ----------------------------------------------------------------- */

function androidBridge(): DriverLocationNativeModule | null {
  if (Platform.OS !== 'android') return null;
  const mod = (NativeModules as Record<string, unknown>)
    .DriverLocationModule as DriverLocationNativeModule | undefined;
  return mod ?? null;
}

async function startForegroundService(): Promise<void> {
  const bridge = androidBridge();
  if (bridge === null) return; // iOS or unlinked module
  await bridge.startTracking();
}

async function stopForegroundService(): Promise<void> {
  const bridge = androidBridge();
  if (bridge === null) return;
  try {
    await bridge.stopTracking();
  } catch (err) {
    // FGS stop can fail if the service was already stopped by the OS
    // (memory pressure, OEM optimisation). Not fatal — log and move on.
    logError(err, {
      boundary: 'driverLocation.stopForegroundService',
    });
  }
}

/* -----------------------------------------------------------------
 * Watch state — one active watch at most, many subscribers.
 * ----------------------------------------------------------------- */

let watchId: number | null = null;
const subscribers = new Set<LocationSubscriber>();

function emit(fix: LocationFix): void {
  // Iterate a snapshot so a subscriber that unsubscribes from within
  // its own callback doesn't mutate the set mid-iteration.
  for (const cb of Array.from(subscribers)) {
    try {
      cb(fix);
    } catch (err) {
      // A bad subscriber must not tear down other subscribers.
      logError(err, {
        boundary: 'driverLocation.subscriberCallback',
      });
    }
  }
}

function startWatch(): void {
  if (watchId !== null) return;

  watchId = Geolocation.watchPosition(
    position => {
      emit({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed,
        heading: position.coords.heading,
        timestamp: position.timestamp,
      });
    },
    error => {
      // Errors here include:
      //   PERMISSION_DENIED — the perm was revoked mid-trip
      //   POSITION_UNAVAILABLE — GPS off, or no fix in the timeout window
      //   TIMEOUT — no fix within `timeout`ms
      // We log and let the caller decide (the trip screen shows a
      // banner via useCapabilityStatus / the app-resume watcher).
      logError(new Error(`geolocation: ${error.code} ${error.message}`), {
        boundary: 'driverLocation.watchPosition',
      });
    },
    {
      accuracy: {
        // Android: HIGH_ACCURACY (uses GPS + fused).
        // iOS: mapped to kCLLocationAccuracyBest.
        android: 'high',
        ios: 'best',
      },
      enableHighAccuracy: true,
      distanceFilter: ENV.locationDistance,
      interval: ENV.locationInterval,
      fastestInterval: Math.max(1000, Math.floor(ENV.locationInterval / 2)),
      // If the driver has NOT granted background location and the app
      // backgrounds, iOS will pause updates unless this is false.
      // Android ignores this — it's controlled by the FGS.
      showsBackgroundLocationIndicator: true,
      // Do not force LocationManager — let the library pick fused
      // (Google Play Services) which is more efficient.
      forceRequestLocation: true,
      forceLocationManager: false,
      showLocationDialog: false,
    },
  );
}

function stopWatch(): void {
  if (watchId === null) return;
  Geolocation.clearWatch(watchId);
  watchId = null;
}

/* -----------------------------------------------------------------
 * Public API
 * ----------------------------------------------------------------- */

/**
 * Begin driver trip tracking. Idempotent — calling twice is a no-op.
 * Preconditions (NOT enforced here):
 *   - PermissionService has confirmed `backgroundLocation` granted
 *   - Device Location Services (GPS) master switch is ON
 */
export async function startDriverTracking(): Promise<void> {
  await startForegroundService();
  startWatch();
}

/**
 * End driver trip tracking. Idempotent — safe to call from a cleanup
 * effect or a lifecycle hook that may fire multiple times.
 */
export async function stopDriverTracking(): Promise<void> {
  stopWatch();
  await stopForegroundService();
}

/**
 * Subscribe to location fixes. Returns an unsubscribe function.
 * Multiple subscribers are supported — a fix is broadcast to all.
 *
 *   useEffect(() => subscribeToLocationFixes(onFix), []);
 *
 * Does NOT start the watch on its own — the trip screen calls
 * `startDriverTracking()` when the driver taps "Start Leg".
 */
export function subscribeToLocationFixes(cb: LocationSubscriber): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

/** True if the watch is currently active. Read-only. */
export function isTrackingActive(): boolean {
  return watchId !== null;
}

/**
 * True if the device's Location Services master switch is ON.
 *
 * Android: routed through the native module to LocationManager
 * (`isLocationEnabled` on API 28+, provider check on 24–27).
 * iOS: no library API to query without private main-thread calls;
 * returns `true` optimistically — if Location Services are off, the
 * watchPosition error path surfaces it via the trip screen banner.
 *
 * Any Android bridge failure is treated as `true` — a false negative
 * would incorrectly block a driver whose GPS is on, which is a worse
 * UX than a false positive that shows the banner briefly before the
 * app-resume watcher clears it.
 */
export async function isDeviceLocationEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const bridge = androidBridge();
  if (bridge === null) return true;
  try {
    return await bridge.isLocationEnabled();
  } catch {
    return true;
  }
}
