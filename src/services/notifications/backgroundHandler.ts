/**
 * ------------------------------------------------------------------
 * Notifee background event handler — MUST load at index.js top-level
 * ------------------------------------------------------------------
 * Per Notifee's official docs, `onBackgroundEvent` must be registered
 * before AppRegistry.registerComponent runs. Otherwise, when Android
 * wakes the app in headless mode to deliver a tap on a Notifee-
 * rendered notification, no handler is registered and Notifee logs:
 *
 *   "No task registered for key app.notifee.notification-event"
 *
 * Kept in its own file (not inside fcmBridge.ts) because importing
 * fcmBridge from index.js would pull in the whole Firebase + FCM +
 * subscription surface just to register one handler.
 * ------------------------------------------------------------------
 */

import notifee, { EventType } from '@notifee/react-native';

import { onFcmNotificationTapped } from './deeplink';

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS) {
    onFcmNotificationTapped(detail.notification?.data as never);
  }
});
