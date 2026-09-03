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

/**
 * Background location.
 *   - Android: ACCESS_BACKGROUND_LOCATION (Play-restricted; declaration required)
 *   - iOS:     LOCATION_ALWAYS
 *
 * On Android 11+, requesting this handle does NOT show a runtime
 * dialog — it deep-links into the system Settings page. The caller
 * must handle that flow (see PermissionService.ensureBackgroundLocation).
 */
export const BACKGROUND_LOCATION_PERM: Permission | undefined = Platform.select(
  {
    ios: PERMISSIONS.IOS.LOCATION_ALWAYS,
    android: PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION,
  },
);

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
