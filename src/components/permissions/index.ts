/**
 * Permission UI barrel.
 * App.tsx mounts the host once. Feature screens do NOT import from
 * here — they use the hooks from @services/permissions instead.
 */

export { default as PermissionSheetHost } from './PermissionSheetHost';
export {
  default as PermissionSheet,
  type PermissionSheetMode,
  type PermissionSheetDecision,
  type PermissionSheetRef,
} from './PermissionSheet';
