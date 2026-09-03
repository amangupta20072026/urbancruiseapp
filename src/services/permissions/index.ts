/**
 * ------------------------------------------------------------------
 * Permissions — public barrel
 * ------------------------------------------------------------------
 * Feature code imports EXCLUSIVELY from `@services/permissions`.
 * Nothing outside this folder should reach into PermissionService,
 * usePermission, sheetHandlers, telemetry, or types directly — this
 * barrel is the API boundary.
 * ------------------------------------------------------------------
 */

export {
  checkCapability,
  ensureCapability,
  openAppSettings,
  openLocationSettings,
  startAppResumeWatcher,
  PermissionServiceError,
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
  configureSheetHandlers,
  type SheetHandlers,
  type SheetChoice,
  type BlockedRecoveryChoice,
} from './sheetHandlers';

export { type CapabilityStatus, type EnsureResult } from './types';

export { type Capability } from '@rbac/capabilities';
