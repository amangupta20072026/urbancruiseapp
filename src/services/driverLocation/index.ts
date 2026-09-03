/**
 * Driver location — public barrel.
 * Feature code imports exclusively from `@services/driverLocation`.
 */

export {
  startDriverTracking,
  stopDriverTracking,
  subscribeToLocationFixes,
  isTrackingActive,
  isDeviceLocationEnabled,
  type LocationFix,
  type LocationSubscriber,
} from './DriverLocationService';
