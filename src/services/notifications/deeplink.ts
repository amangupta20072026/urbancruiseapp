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
 * ------------------------------------------------------------------
 */

import { handleFcmClick } from '@services/deeplinks';

/** Payload shape carried in the FCM `data` block, per §8.3 of the
 *  notifications design. `click` is the JSON-encoded target. */
export type FcmClickData = {
  click?: string;
  [k: string]: string | undefined;
};

export function onFcmNotificationTapped(data: FcmClickData | undefined): void {
  if (!data) return;
  handleFcmClick(data.click);
}
