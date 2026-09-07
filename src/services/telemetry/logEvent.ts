/**
 * ------------------------------------------------------------------
 * logEvent — Centralised event sink (non-error signals)
 * ------------------------------------------------------------------
 * Sibling of logError, for things that AREN'T failures but that we
 * still want to record — user-behaviour signals, security-relevant
 * events (screenshot attempts, backgrounding during payment), etc.
 *
 * Contract:
 *   - MUST NEVER throw (analytics.ts catches internally)
 *   - Structured: name + optional properties
 *   - Name is a closed union (EventName) — typos caught at compile
 *
 * Wired to Firebase Analytics via services/telemetry/analytics.ts.
 * If we ever change analytics vendors, only analytics.ts changes.
 * ------------------------------------------------------------------
 */

import type { PermissionTelemetryKey } from '@rbac/capabilities';
import { sendAnalyticsEvent } from './analytics';

/* -----------------------------------------------------------------
 * Permission events — funnel telemetry from PermissionService.
 * ----------------------------------------------------------------- */

export type PermissionTelemetryVerb =
  | 'check'
  | 'rationale_shown'
  | 'rationale_dismissed'
  | 'prominent_disclosure_shown'
  | 'prominent_disclosure_dismissed'
  | 'prompt_shown'
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'blocked_recovery_shown'
  | 'settings_opened'
  | 'gps_off'
  | 'rbac_violation';

export type PermissionEventName =
  `permission.${PermissionTelemetryKey}.${PermissionTelemetryVerb}`;

/* -----------------------------------------------------------------
 * The closed EventName union
 *
 * Extended in step 05 with auth, home, trip, deeplink, fcm events.
 * ----------------------------------------------------------------- */

export type EventName =
  // Security
  | 'security.screenshot_detected'
  | 'security.recording_started'
  | 'security.background_while_sensitive'
  // Permissions (funnel)
  | PermissionEventName;

export type EventProperties = Record<string, unknown>;

/**
 * Record a structured telemetry event. Safe to call from anywhere.
 * Fires in BOTH dev (with console echo) and prod. Never throws.
 */
export function logEvent(
  name: EventName,
  properties: EventProperties = {},
): void {
  if (__DEV__) {
    console.log(`[event] ${name}`, properties);
  }
  sendAnalyticsEvent(name, properties);
}
