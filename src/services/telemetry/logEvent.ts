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

export type EventName =
  /** Screenshot detected (iOS-only signal; Android blocks it entirely). */
  | 'security.screenshot_detected'
  /** Screen recording started (both platforms). */
  | 'security.recording_started'
  /** App backgrounded while sensitive content was on screen. */
  | 'security.background_while_sensitive';
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
