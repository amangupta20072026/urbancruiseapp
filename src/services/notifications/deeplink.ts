/**
 * ------------------------------------------------------------------
 * FCM → deep-link bridge
 * ------------------------------------------------------------------
 * The FCM handler layer (foreground `onMessage`, background handler,
 * `onNotificationOpenedApp`, `getInitialNotification`, Notifee's
 * `onForegroundEvent PRESS`) all funnel here on a notification TAP.
 *
 * Rules:
 *   - This module never navigates directly. It hands the payload
 *     off to `deeplinks.handleFcmClick` and returns.
 *   - Malformed / unknown payloads are logged, not surfaced to the
 *     user. A missed deep-link means the user lands on the app's
 *     default post-launch destination — annoying, not broken.
 *
 * ── Analytics contract ─────────────────────────────────────────────
 * Emits `fcm.notification_tapped` on every tap, regardless of entry
 * point (foreground press / background open / cold-start initial /
 * Notifee background press). Because all four funnels route here,
 * we get exactly-once semantics per user tap — no double counting.
 *
 * The `type` param carries the DeepLinkTarget `kind` (e.g.
 * `customer.bookingDetail`, `driver.tripDetail`) — a bounded literal
 * union of ~16 values, ideal for GA4 segmentation. Extraction is
 * defensive: any parse failure fails safe to `'unknown'`.
 *
 * ── PII guardrail ──────────────────────────────────────────────────
 * We NEVER log the raw `click` JSON, the notification title, or the
 * body. Only the extracted `kind` (a schema literal) and structural
 * metadata leaves the device — matches Firebase Data Safety guidance
 * on minimising personal data in event params.
 * ------------------------------------------------------------------
 */

import { handleFcmClick } from '@services/deeplinks';
import { logEvent } from '@services/telemetry/logEvent';

/** Payload shape carried in the FCM `data` block, per §8.3 of the
 *  notifications design. `click` is the JSON-encoded target. */
export type FcmClickData = {
  click?: string;
  [k: string]: string | undefined;
};

/**
 * Best-effort extraction of the deep-link `kind` from an FCM
 * `click` payload, for analytics-only use.
 *
 * We do a shallow JSON.parse + read `.kind`. NOT a full Zod
 * validation — that happens downstream in `resolveFcmClick`, and
 * duplicating it here would waste cycles on every push. If the JSON
 * is malformed or `.kind` is missing/non-string, we return
 * `'unknown'` so the analytics call still succeeds with a safe
 * default.
 *
 * The extracted string is bounded to 40 chars to stay well under
 * Firebase's 100-char param-value limit and to guard against any
 * malicious backend sending a huge value.
 */
export function extractFcmClickKind(clickJson: string | undefined): string {
  if (typeof clickJson !== 'string' || clickJson.length === 0) return 'unknown';
  try {
    const parsed = JSON.parse(clickJson) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'kind' in parsed &&
      typeof (parsed as { kind: unknown }).kind === 'string'
    ) {
      return ((parsed as { kind: string }).kind || 'unknown').slice(0, 40);
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export function onFcmNotificationTapped(data: FcmClickData | undefined): void {
  // Emit BEFORE any conditional return so a tap on a malformed
  // payload still shows up in the funnel (with type='unknown').
  // The kind field is bounded low-cardinality — ideal for GA4
  // segmentation. Nothing PII-bearing is included.
  logEvent('fcm.notification_tapped', {
    type: extractFcmClickKind(data?.click),
  });

  if (!data) return;
  handleFcmClick(data.click);
}
