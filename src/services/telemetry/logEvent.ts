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
 *
 * ── Firebase Analytics name compliance ─────────────────────────────
 * Per Firebase's official rules (event/param names: [a-zA-Z0-9_],
 * ≤40 chars, must start with a letter, reserved prefixes 'firebase_',
 * 'google_', 'ga_', '_') our dot-namespaced names like
 * 'fcm.notification_received' are transparently sanitised by
 * analytics.ts (→ 'fcm_notification_received') before hitting the
 * SDK. Callers get the readable dotted form; Firebase gets the
 * sanitised form. Keep names ≤40 chars AFTER sanitisation.
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
 * Trip lifecycle names (`trip.*`) are intentionally not listed —
 * add them in the same shape when their emitters land in
 * DriverLocationService.ts.
 * ----------------------------------------------------------------- */

export type EventName =
  // ── Security ──────────────────────────────────────────
  | 'security.screenshot_detected'
  | 'security.recording_started'
  | 'security.background_while_sensitive'

  // ── Permissions (funnel) ──────────────────────────────
  | PermissionEventName

  // ── Auth ──────────────────────────────────────────────
  | 'auth.otp_sent'
  | 'auth.otp_verified'
  | 'auth.otp_failed'
  | 'auth.login_success'
  | 'auth.logout'

  // ── Home CTAs ─────────────────────────────────────────
  | 'home.cta_tapped'
  | 'home.service_mode_changed'

  // ── Push (FCM) ────────────────────────────────────────
  | 'fcm.notification_received'
  | 'fcm.notification_tapped'
  | 'fcm.token_registered'
  | 'fcm.token_refreshed'
  | 'fcm.token_unregistered'
  | 'fcm.token_unavailable'

  // ── Deeplinks ─────────────────────────────────────────
  | 'deeplink.opened'
  | 'deeplink.rejected';

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
