/**
 * ------------------------------------------------------------------
 * Permissions — Shared Types
 * ------------------------------------------------------------------
 * The status/result vocabulary every caller sees.
 *
 * Deliberately does NOT mirror `react-native-permissions`' RESULTS
 * enum — those values are OS-specific and change (Android's LIMITED
 * for photo library didn't exist a year ago; iOS added ephemeral
 * push authorisation recently). Ours are stable and business-oriented,
 * so features never break when the library updates.
 * ------------------------------------------------------------------
 */

/**
 * Capability-level status. What the feature actually cares about.
 *
 *   'granted'      — proceed to use the feature
 *   'denied'       — user said no, but we can ask again (soft denial;
 *                    Android's DENIED without `neverAskAgain`, iOS's
 *                    NOT_DETERMINED after prompt)
 *   'blocked'      — user said "don't ask again" / iOS revoked;
 *                    only recoverable via Settings deep-link
 *   'unavailable'  — device or OS doesn't support this feature, OR
 *                    the current role isn't allowed to request it
 *                    (RBAC violation — treat as terminal)
 *   'limited'      — iOS-only for photo library / location (partial)
 *   'unknown'      — first check hasn't run yet (initial cache state)
 */
export type CapabilityStatus =
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'unavailable'
  | 'limited'
  | 'unknown';

/**
 * Result of `PermissionService.ensureCapability(cap)`.
 * Discriminated union — callers `switch` on `.status` with
 * exhaustiveness checking.
 *
 * `preconditionFailed` is our own idea, not an OS status: it means
 * the permission is granted but a runtime prerequisite failed. Today
 * only `reason: 'gpsOff'` is used — for a location capability that's
 * granted but the device Location Services master switch is off.
 * The caller renders a settings-deep-link banner; the app-resume
 * watcher clears the state when the user comes back.
 */
export type EnsureResult =
  | { status: 'granted' }
  | { status: 'denied'; canRetry: boolean }
  | { status: 'blocked' }
  | {
      status: 'unavailable';
      reason: 'device' | 'rbac' | 'unsupported-os';
    }
  | { status: 'limited' }
  | { status: 'preconditionFailed'; reason: 'gpsOff' };

/**
 * Errors from the permission service. The service normalises all OS
 * failures to `unavailable` results; this class is only thrown for
 * scaffold stubs and truly exceptional conditions (native module
 * missing, RBAC contract broken). Caught by ErrorBoundary.
 */
export class PermissionServiceError extends Error {
  constructor(
    public readonly code:
      | 'RBAC_VIOLATION'
      | 'NOT_IMPLEMENTED'
      | 'NATIVE_MODULE_MISSING',
    message: string,
  ) {
    super(message);
    this.name = 'PermissionServiceError';
  }
}
