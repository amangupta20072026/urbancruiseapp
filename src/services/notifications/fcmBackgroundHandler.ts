/**
 * ------------------------------------------------------------------
 * FCM background message handler — MUST load at index.js top-level
 * ------------------------------------------------------------------
 * Per the official RNFirebase docs (rnfirebase.io/messaging/usage →
 * "Background & Quit state messages"), when the app is in background
 * or quit state, `onMessage` will NOT fire — messages are delivered
 * to the handler registered via `setBackgroundMessageHandler`.
 *
 * The handler MUST be registered:
 *   - at module scope (not inside a component / effect), and
 *   - BEFORE AppRegistry.registerComponent runs.
 *
 * Otherwise on Android, when Headless JS wakes the app to deliver a
 * background message, no handler is registered and the message is
 * dropped. Kept in its own file (mirroring the Notifee background
 * handler pattern) so importing the module is enough — the top-level
 * side-effect wires everything up.
 *
 * SCOPE
 *   This handler owns the RECEIVE side. The TAP side is already
 *   wired via `backgroundHandler.ts` (Notifee) and `fcmBridge.ts`
 *   (onNotificationOpenedApp + getInitialNotification). Together
 *   they cover every combination of app state × payload type.
 *
 * NOTIFICATION DISPLAY
 *   For messages that CONTAIN a `notification` payload, both Android
 *   and iOS auto-display the system notification themselves —
 *   nothing to do here except return.
 *
 *   For DATA-ONLY messages (silent / server-driven updates), if a
 *   caller wants a user-visible notification, this handler is where
 *   you'd call `notifee.displayNotification(...)`. Left as a marked
 *   TODO because no data-only push shape exists in the codebase yet.
 *
 * ANALYTICS
 *   Emits `fcm.notification_received` with `channel: 'background'`
 *   so the funnel shape matches the foreground path in fcmBridge.ts.
 *   The docstring in fcmBridge.ts explicitly reserved this event
 *   contract for this file.
 *
 * MUST NOT
 *   - Update any React state (the tree isn't mounted).
 *   - Assume Redux is hydrated (background wake-up on Android
 *     bypasses App component mount).
 *   - Throw — an unhandled reject inside this handler surfaces as an
 *     unhandled promise on the native side.
 * ------------------------------------------------------------------
 */

import { getApp } from '@react-native-firebase/app';
import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';

import { logError } from '@services/telemetry/logError';
import { logEvent } from '@services/telemetry/logEvent';
import { extractFcmClickKind } from './deeplink';

/** Minimal shape of the RemoteMessage we actually read here. Mirrors
 *  the local declaration in fcmBridge.ts — kept independent so the
 *  two files can evolve on their own without shared coupling. */
type FcmMessage = {
  notification?: { title?: string; body?: string };
  data?: { [key: string]: string | object };
};

function readClickString(
  data: FcmMessage['data'] | undefined,
): string | undefined {
  const raw = data?.click;
  if (raw === undefined) return undefined;
  return typeof raw === 'string' ? raw : JSON.stringify(raw);
}

const messaging = getMessaging(getApp());

setBackgroundMessageHandler(messaging, async remoteMessage => {
  try {
    // Analytics parity with foreground onMessage in fcmBridge.ts.
    // Same event name, same `type` extraction, differentiated only
    // by `channel` so dashboards can split.
    logEvent('fcm.notification_received', {
      type: extractFcmClickKind(readClickString(remoteMessage.data as never)),
      channel: 'background',
    });

    // If the message has a notification payload, the OS has already
    // rendered a system notification. Nothing else to do.
    //
    // TODO(when the first data-only push lands):
    //   If (!remoteMessage.notification && remoteMessage.data),
    //   call notifee.displayNotification(...) here to render a
    //   user-visible notification for silent pushes. Payload shape
    //   MUST be validated first (Zod) before it drives any UI.
  } catch (err) {
    // Swallow. Throwing here surfaces as an unhandled promise on
    // the native side and can crash a headless task. Telemetry
    // captures the failure so it's still observable.
    logError(err, { boundary: 'fcm.setBackgroundMessageHandler' });
  }
});
