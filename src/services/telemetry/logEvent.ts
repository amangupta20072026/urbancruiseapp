/**
 * ------------------------------------------------------------------
 * logEvent — Centralised event sink (non-error signals)
 * ------------------------------------------------------------------
 * Sibling of logError, for things that AREN'T failures but that we
 * still want to record — user-behaviour signals, security-relevant
 * events (screenshot attempts, backgrounding during payment), etc.
 *
 * Same design contract as logError:
 *   - MUST NEVER throw. Wrap the body in try/catch once a real
 *     telemetry SDK is wired in.
 *   - Structured: name + optional properties. The name is a stable
 *     enum-like string; properties are the variable-per-call payload.
 *
 * In production, forward to Sentry / Amplitude / DataDog / whatever
 * — a single swap point. Callers never change.
 * ------------------------------------------------------------------
 */

import type { PermissionTelemetryKey } from '@rbac/capabilities';

/* -----------------------------------------------------------------
 * Permission events — funnel telemetry from PermissionService.
 *
 * PermissionTelemetryKey is imported from @rbac/capabilities to keep
 * the SSoT there: a capability's descriptor field IS the key we emit.
 * Verbs are defined here because they're logEvent-facing vocabulary,
 * not RBAC vocabulary.
 *
 * The final concrete strings look like:
 *   'permission.camera.prompt_shown'
 *   'permission.background_location.prominent_disclosure_dismissed'
 *   'permission.foreground_location.gps_off'
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
 * ----------------------------------------------------------------- */

export type EventName =
  /** Screenshot detected (iOS-only signal; Android blocks it entirely). */
  | 'security.screenshot_detected'
  /** Screen recording started (both platforms). */
  | 'security.recording_started'
  /** App backgrounded while sensitive content was on screen. */
  | 'security.background_while_sensitive'
  /** Permission service funnel events. */
  | PermissionEventName;
/* Add more event names here as the app grows. Keeping this a
 * closed union rather than `string` catches typos at compile time. */

export type EventProperties = Record<string, unknown>;

/**
 * Record a structured telemetry event. Safe to call from anywhere.
 * In development, logs to the JS console; in production, will forward
 * to a telemetry SDK once one is wired in.
 */
export function logEvent(
  name: EventName,
  properties: EventProperties = {},
): void {
  if (__DEV__) {
    console.log(`[event] ${name}`, properties);
    return;
  }
  // TODO(telemetry): forward to Sentry / Amplitude / DataDog here.
}
