/**
 * UC staff caller ID — public API of the feature.
 *
 * Native side: android/app/src/main/java/app/urbancruise/callerid/
 * Server:      GET /api/v1/uc/caller-id/snapshot
 */
export { default as CallerIdScreen } from './screens/CallerIdScreen';
export { CallerIdSetupSheet } from './components/CallerIdSetupSheet';
export { useCallerIdAutoSync } from './hooks/useCallerIdAutoSync';
export { clearCallerId, syncCallerId } from './sync';
export type { CallerIdSyncResult } from './types';
