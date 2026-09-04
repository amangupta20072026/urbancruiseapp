/**
 * ------------------------------------------------------------------
 * Platform map — Capability → react-native-permissions handle
 * ------------------------------------------------------------------
 * The ONE place in the codebase where OS permission constants are
 * named. If Google adds a new granular permission (they will),
 * this file changes; nothing else does.
 *
 * INVARIANT: every handle exposed here MUST be listed in:
 *   - AndroidManifest.xml (as <uses-permission ... />)
 *   - ios/Podfile         (in setup_permissions([...]))
 * Otherwise `request()` returns UNAVAILABLE at runtime and the user
 * never sees a prompt — a hard-to-debug failure mode.
 *
 * Notifications intentionally omitted here — react-native-permissions
 * exposes a dedicated `checkNotifications()` / `requestNotifications()`
 * API that handles iOS/Android differences internally. Callers use
 * those, not `check(PERMISSIONS.ANDROID.POST_NOTIFICATIONS)`.
 * ------------------------------------------------------------------
 */

import { Platform } from 'react-native';
import { PERMISSIONS, type Permission } from 'react-native-permissions';

/**
 * Foreground fine-location.
 *   - Android: ACCESS_FINE_LOCATION
 *   - iOS:     LOCATION_WHEN_IN_USE
 * `undefined` when running on an unsupported platform (e.g. web).
 */
export const FOREGROUND_LOCATION_PERM: Permission | undefined = Platform.select(
  {
    ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
    android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  },
);

/*
 * NOTE — no BACKGROUND_LOCATION_PERM here on purpose.
 *
 * Urbancruise does not declare `ACCESS_BACKGROUND_LOCATION` (Android) or
 * `NSLocationAlwaysAndWhenInUseUsageDescription` (iOS). The driver's
 * active-trip location tracking runs inside a foreground service of
 * type=location, started from a visible activity ("Start Trip"). Per
 * developer.android.com/develop/sensors-and-location/location/permissions,
 * an FGS-driven location access is classified as foreground location,
 * so screen-off, other-app-active, and phone-in-pocket during an active
 * trip are all covered by ACCESS_FINE_LOCATION alone.
 *
 * If a future feature ever needs continuous idle-driver tracking, real
 * background geofencing, or an FGS started while backgrounded, add the
 * handle back here, re-declare the manifest/plist entries, and file a
 * Google Play background-location declaration.
 */

/**
 * Camera.
 *   - Android: CAMERA
 *   - iOS:     CAMERA
 * One grant covers profile photos, KM meter, vehicle/RC docs.
 */
export const CAMERA_PERM: Permission | undefined = Platform.select({
  ios: PERMISSIONS.IOS.CAMERA,
  android: PERMISSIONS.ANDROID.CAMERA,
});
