/**
 * ------------------------------------------------------------------
 * Permissions — public barrel
 * ------------------------------------------------------------------
 * Feature code imports EXCLUSIVELY from `@services/permissions`.
 * Nothing outside this folder should reach into `./PermissionService`,
 * `./usePermission`, or `./types` directly — this barrel is the API
 * boundary.
 *
 * Re-exports the Capability union from @rbac/capabilities so callers
 * need one import for both the ensure() function and its argument.
 * ------------------------------------------------------------------
 */

export {
  checkCapability,
  ensureCapability,
  openAppSettings,
  openLocationSettings,
  startAppResumeWatcher,
  type CheckOptions,
  type Unsubscribe,
} from './PermissionService';

export {
  useCapabilityStatus,
  useEnsurePermission,
  type CapabilityStatusView,
  type EnsureFn,
} from './usePermission';

export {
  PermissionServiceError,
  type CapabilityStatus,
  type EnsureResult,
} from './types';

export { type Capability } from '@rbac/capabilities';
