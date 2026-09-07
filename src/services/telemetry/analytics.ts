/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * Firebase Analytics adapter
 * ------------------------------------------------------------------
 * Wraps @react-native-firebase/analytics behind a stable, thin
 * interface. The rest of the app never imports @react-native-firebase
 * directly — only this file does. Two upsides:
 *
 *   1. If we ever switch to Sentry / Mixpanel / PostHog for events,
 *      we only rewrite this file. logEvent.ts stays untouched.
 *   2. Firebase Analytics has strict rules on event/property names
 *      (max lengths, allowed characters). Sanitising happens here
 *      once, so callers never think about it.
 *
 * INVARIANT: nothing in this file may throw. Telemetry that crashes
 * is worse than none. Every public function catches internally.
 * ------------------------------------------------------------------
 */

import {
  getAnalytics,
  logEvent as fbLogEvent,
  setUserId as fbSetUserId,
  setUserProperty as fbSetUserProperty,
  setAnalyticsCollectionEnabled,
  logScreenView as fbLogScreenView,
} from '@react-native-firebase/analytics';

/* -----------------------------------------------------------------
 * Firebase Analytics limits (from the official docs, Aug 2024):
 *   - Event name: ≤ 40 chars, letters/digits/underscore, must start
 *     with a letter
 *   - Event param name: ≤ 40 chars, same character rules
 *   - Event param value (string): ≤ 100 chars
 *   - Max 25 params per event
 *   - User property name: ≤ 24 chars
 *   - User property value: ≤ 36 chars
 * We defensively truncate/coerce so a bad caller can never cause a
 * dropped or rejected event.
 * ----------------------------------------------------------------- */

const MAX_EVENT_NAME_LEN = 40;
const MAX_PARAM_NAME_LEN = 40;
const MAX_PARAM_VALUE_LEN = 100;
const MAX_PARAMS_PER_EVENT = 25;
const MAX_USER_PROP_NAME_LEN = 24;
const MAX_USER_PROP_VALUE_LEN = 36;

/** Firebase Analytics only accepts [a-zA-Z0-9_], starting with a letter. */
function sanitiseName(raw: string, maxLen: number): string {
  // Replace dots (our namespacing convention) and any other invalid
  // char with underscore. 'permission.foreground_location.granted' ->
  // 'permission_foreground_location_granted'.
  const cleaned = raw
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^[^a-zA-Z]+/, '') // must start with a letter
    .slice(0, maxLen);
  return cleaned.length > 0 ? cleaned : 'unnamed_event';
}

function sanitiseValue(value: unknown): string | number | boolean {
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value === null || value === undefined) return '';
  try {
    const s = typeof value === 'string' ? value : JSON.stringify(value);
    return s.slice(0, MAX_PARAM_VALUE_LEN);
  } catch {
    return String(value).slice(0, MAX_PARAM_VALUE_LEN);
  }
}

function sanitiseParams(
  properties: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const entries = Object.entries(properties).slice(0, MAX_PARAMS_PER_EVENT);
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of entries) {
    const safeKey = sanitiseName(k, MAX_PARAM_NAME_LEN);
    out[safeKey] = sanitiseValue(v);
  }
  return out;
}

/* -----------------------------------------------------------------
 * Public surface
 * ----------------------------------------------------------------- */

/**
 * Send an event to Firebase Analytics. Never throws.
 * Called by logEvent(). Not intended for direct feature use.
 */
export function sendAnalyticsEvent(
  rawName: string,
  rawProperties: Record<string, unknown> = {},
): void {
  try {
    const name = sanitiseName(rawName, MAX_EVENT_NAME_LEN);
    const params = sanitiseParams(rawProperties);
    void fbLogEvent(getAnalytics(), name, params);
  } catch {
    // Swallow. Telemetry never takes the app down.
  }
}

/**
 * Attach a stable user id to all subsequent events. Pass `null` to
 * detach (on logout). Never throws.
 */
export function setAnalyticsUserId(userId: string | null): void {
  try {
    void fbSetUserId(getAnalytics(), userId);
  } catch {
    /* noop */
  }
}

/**
 * Set a user property (segmentation dimension in Firebase). Never throws.
 * Firebase caps property names to 24 chars, values to 36 chars.
 */
export function setAnalyticsUserProperty(
  rawName: string,
  rawValue: string | null,
): void {
  try {
    const name = sanitiseName(rawName, MAX_USER_PROP_NAME_LEN);
    const value =
      rawValue === null
        ? null
        : String(rawValue).slice(0, MAX_USER_PROP_VALUE_LEN);
    void fbSetUserProperty(getAnalytics(), name, value);
  } catch {
    /* noop */
  }
}

/**
 * Log a screen view. Called by the navigation listener wired in
 * App.tsx — features don't call this directly.
 */
export function sendAnalyticsScreenView(
  screenName: string,
  screenClass?: string,
): void {
  try {
    void fbLogScreenView(getAnalytics(), {
      screen_name: sanitiseName(screenName, MAX_EVENT_NAME_LEN),
      screen_class: screenClass
        ? sanitiseName(screenClass, MAX_EVENT_NAME_LEN)
        : sanitiseName(screenName, MAX_EVENT_NAME_LEN),
    });
  } catch {
    /* noop */
  }
}

/**
 * Runtime kill-switch. Call with `false` when a user opts out of
 * analytics (add this to Settings later). Never throws.
 */
export function setAnalyticsEnabled(enabled: boolean): void {
  try {
    void setAnalyticsCollectionEnabled(getAnalytics(), enabled);
  } catch {
    /* noop */
  }
}
