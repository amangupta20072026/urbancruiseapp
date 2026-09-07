/**
 * ------------------------------------------------------------------
 * Analytics identity helpers
 * ------------------------------------------------------------------
 * Two operations only:
 *
 *   identifyUser()  — call after login / bootstrap-authenticated
 *   resetIdentity() — call on logout
 *
 * All Firebase user properties are set as ONE atomic block per call
 * so a partial write can never leave a stale segmentation dimension
 * behind (e.g. old role after switching account).
 * ------------------------------------------------------------------
 */

import type { UserRole, SubRole } from '@rbac/roles';
import { setAnalyticsUserId, setAnalyticsUserProperty } from './analytics';

export type Identity = {
  userId: string;
  role: UserRole;
  subRole: SubRole;
  entityId: string;
};

/**
 * Attach user identity to all subsequent analytics events.
 *
 * Firebase treats userId as a stable per-user key — the same value
 * across sessions and devices. Pass your backend's user_id, NOT
 * anything device-specific (which is already captured as instance_id
 * automatically).
 *
 * User properties are Firebase's segmentation dimensions. You can
 * filter any report by role='driver', subRole='dispatcher', etc.
 */
export function identifyUser(identity: Identity): void {
  setAnalyticsUserId(identity.userId);
  setAnalyticsUserProperty('role', identity.role);
  setAnalyticsUserProperty('sub_role', String(identity.subRole ?? ''));
  setAnalyticsUserProperty('entity_id', identity.entityId);
}

/**
 * Detach identity from analytics. Call on logout.
 *
 * userId is set to null (unlinks the anonymous instance_id from the
 * previous user). Properties are set to null which Firebase treats
 * as "clear" — subsequent events have no role/sub_role/entity_id
 * dimensions attached.
 */
export function resetIdentity(): void {
  setAnalyticsUserId(null);
  setAnalyticsUserProperty('role', null);
  setAnalyticsUserProperty('sub_role', null);
  setAnalyticsUserProperty('entity_id', null);
}
