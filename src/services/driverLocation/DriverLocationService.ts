/**
 * ---------------------------------------------------------------------------
 * DriverLocationService
 * ---------------------------------------------------------------------------
 *
 * Public JS API for driver trip location tracking.
 *
 * Responsibilities:
 *
 *   - Start Android foreground service.
 *   - Start exactly one watchPosition() subscription.
 *   - Broadcast fixes to subscribers.
 *   - Stop watchPosition().
 *   - Stop Android foreground service.
 *
 * Android:
 *
 *   DriverLocationForegroundService
 *       +
 *   react-native-geolocation-service
 *
 * iOS:
 *
 *   Native Android FGS bridge is not used.
 *
 * ---------------------------------------------------------------------------
 */

import { NativeModules, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

import { ENV } from '@config/env';
import { logError } from '@services/telemetry/logError';
import { store } from '@store';
import { preconditionFailed } from '@store/slices/permissionsSlice';

/* --------------------------------------------------------------------------
 * Types
 * -------------------------------------------------------------------------- */

export type LocationFix = {
  latitude: number;
  longitude: number;

  /** Horizontal accuracy in metres. */
  accuracy: number;

  /** Speed in metres/second, when available. */
  speed: number | null;

  /** Heading in degrees, when available. */
  heading: number | null;

  /** Device fix timestamp in milliseconds since Unix epoch. */
  timestamp: number;
};

export type LocationSubscriber = (fix: LocationFix) => void;

type DriverLocationNativeModule = {
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  isLocationEnabled: () => Promise<boolean>;
};

/* --------------------------------------------------------------------------
 * Native bridge
 * -------------------------------------------------------------------------- */

function androidBridge(): DriverLocationNativeModule | null {
  if (Platform.OS !== 'android') {
    return null;
  }

  const modules = NativeModules as Record<string, unknown>;

  const module = modules.DriverLocationModule as
    | DriverLocationNativeModule
    | undefined;

  return module ?? null;
}

async function startForegroundService(): Promise<void> {
  const bridge = androidBridge();

  /*
   * iOS / unavailable native module.
   */
  if (bridge === null) {
    return;
  }

  await bridge.startTracking();
}

async function stopForegroundService(): Promise<void> {
  const bridge = androidBridge();

  if (bridge === null) {
    return;
  }

  try {
    await bridge.stopTracking();
  } catch (error) {
    /*
     * If Android has already killed/stopped the service, stopping it again
     * should not make the trip cleanup fail.
     *
     * We still log the native error for diagnostics.
     */
    logError(error, {
      boundary: 'driverLocation.stopForegroundService',
    });
  }
}

/* --------------------------------------------------------------------------
 * Watch state
 * -------------------------------------------------------------------------- */

let watchId: number | null = null;

/*
 * Monotonically increasing operation generation.
 *
 * This prevents an older asynchronous start operation from starting a
 * location watch after a newer stop operation has already happened.
 */
let trackingGeneration = 0;

const subscribers = new Set<LocationSubscriber>();

/* --------------------------------------------------------------------------
 * Subscriber handling
 * -------------------------------------------------------------------------- */

function emit(fix: LocationFix): void {
  /*
   * Iterate over a snapshot so subscribers can safely unsubscribe from
   * inside their own callback.
   */
  for (const callback of Array.from(subscribers)) {
    try {
      callback(fix);
    } catch (error) {
      /*
       * One broken subscriber must never tear down the location watcher
       * or prevent other subscribers from receiving the fix.
       */
      logError(error, {
        boundary: 'driverLocation.subscriberCallback',
      });
    }
  }
}

/* --------------------------------------------------------------------------
 * Location watcher
 * -------------------------------------------------------------------------- */

function startWatch(generation: number): void {
  /*
   * If a newer stop/start operation happened while the native FGS was
   * starting, do not create a stale watcher.
   */
  if (generation !== trackingGeneration) {
    return;
  }

  /*
   * Only one watch is allowed.
   */
  if (watchId !== null) {
    return;
  }

  const id = Geolocation.watchPosition(
    position => {
      /*
       * Ignore callbacks belonging to a stale watcher generation.
       */
      if (generation !== trackingGeneration) {
        return;
      }

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
      /*
       * Ignore errors from a watcher that has already been invalidated.
       */
      if (generation !== trackingGeneration) {
        return;
      }

      /*
       * iOS blind spot bridge.
       *
       * On iOS, isDeviceLocationEnabled() returns `true` optimistically
       * because CLLocationManager's authoritative check requires main-
       * thread gymnastics we don't want to add. So the PermissionService
       * cannot pre-emptively surface "GPS off" for iOS drivers.
       *
       * watchPosition, however, WILL report it via its error callback
       * with codes 1 (PERMISSION_DENIED) or 2 (POSITION_UNAVAILABLE)
       * when Location Services is off system-wide. Bridge those into
       * the permissionsSlice as a preconditionFailed('gpsOff') for the
       * currently-active location capability so the trip screen shows
       * a "Turn on Location" banner instead of an infinite spinner.
       */
      if (Platform.OS === 'ios' && (error.code === 1 || error.code === 2)) {
        try {
          store.dispatch(
            preconditionFailed({
              capability: 'foregroundLocation',
              reason: 'gpsOff',
            }),
          );
        } catch (dispatchError) {
          logError(dispatchError, {
            boundary: 'driverLocation.iosGpsPreconditionBridge',
          });
        }
      }

      logError(new Error(`geolocation: ${error.code} ${error.message}`), {
        boundary: 'driverLocation.watchPosition',
      });
    },

    {
      accuracy: {
        android: 'high',
        ios: 'best',
      },

      enableHighAccuracy: true,

      distanceFilter: ENV.locationDistance,

      interval: ENV.locationInterval,

      fastestInterval: Math.max(1000, Math.floor(ENV.locationInterval / 2)),

      /*
       * Android location delivery is kept alive by the FGS.
       */
      showsBackgroundLocationIndicator: true,

      /*
       * Let the library use the fused provider on Android.
       */
      forceRequestLocation: true,

      forceLocationManager: false,

      /*
       * We don't want react-native-geolocation-service to display its
       * own location settings dialog.
       */
      showLocationDialog: false,
    },
  );

  watchId = id;
}

/**
 * Stop the active JS location watcher.
 */
function stopWatch(): void {
  if (watchId === null) {
    return;
  }

  Geolocation.clearWatch(watchId);

  watchId = null;
}

/* --------------------------------------------------------------------------
 * Public API
 * -------------------------------------------------------------------------- */

/**
 * Begin driver trip tracking.
 *
 * Idempotent:
 *
 *   - already tracking -> no second watch
 *   - not tracking -> start FGS + watcher
 *
 * Preconditions:
 *
 *   - appropriate location permission has been granted
 *   - device Location Services are enabled
 *   - caller starts this from a workflow permitted by Android's FGS
 *     background-start rules
 */
export async function startDriverTracking(): Promise<void> {
  /*
   * New tracking generation.
   */
  const generation = trackingGeneration + 1;

  trackingGeneration = generation;

  /*
   * Ask Android to start/promote the FGS first.
   *
   * Only after this succeeds do we start watchPosition().
   */
  await startForegroundService();

  /*
   * End Trip may have happened while the native service was starting.
   *
   * If so, do not resurrect location tracking.
   */
  if (generation !== trackingGeneration) {
    return;
  }

  startWatch(generation);
}

/**
 * End driver trip tracking.
 *
 * Ordering is intentional:
 *
 *   1. Invalidate any pending start.
 *   2. Stop JS watchPosition().
 *   3. Stop Android foreground service.
 *
 * This means a late native start completion cannot recreate the watch after
 * End Trip.
 */
export async function stopDriverTracking(): Promise<void> {
  /*
   * Invalidate all older async start operations FIRST.
   */
  trackingGeneration += 1;

  /*
   * Stop receiving location callbacks immediately.
   */
  stopWatch();

  /*
   * Then stop Android FGS.
   */
  await stopForegroundService();
}

/**
 * Subscribe to driver location fixes.
 *
 * Multiple subscribers are supported.
 *
 * Returns an unsubscribe function.
 */
export function subscribeToLocationFixes(
  callback: LocationSubscriber,
): () => void {
  subscribers.add(callback);

  return () => {
    subscribers.delete(callback);
  };
}

/**
 * Returns true when the JS location watcher is active.
 *
 * This is intentionally not an Android service-state query.
 */
export function isTrackingActive(): boolean {
  return watchId !== null;
}

/**
 * Returns whether Android's device-level Location Services switch is ON.
 *
 * This is different from runtime location permission.
 *
 * iOS:
 *   Returns true optimistically because this native Android API does not
 *   exist here.
 */
export async function isDeviceLocationEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  const bridge = androidBridge();

  if (bridge === null) {
    return true;
  }

  try {
    return await bridge.isLocationEnabled();
  } catch (error) {
    /*
     * Treat bridge failure as unknown/optimistic rather than blocking the
     * driver.
     */
    logError(error, {
      boundary: 'driverLocation.isDeviceLocationEnabled',
    });

    return true;
  }
}
