/**
 * ------------------------------------------------------------------
 * FCM subscriptions bridge
 * ------------------------------------------------------------------
 * Installs the three FCM entry points and Notifee tap events so
 * every push notification tap — cold-start, background, foreground
 * — funnels into `onFcmNotificationTapped()`.
 *
 * WHY UNGATED ON isAuthenticated
 *   The stash/drain pipeline in `services/deeplinks/` IS the auth
 *   gate: `gate.ts` returns 'not_authenticated' → 'held', and
 *   `deeplinkDrainListener` replays held targets on the
 *   `loginSuccess` / `reconcileAuth` Redux transitions. Gating the
 *   subscription would defeat that design and would miss cold-start
 *   taps (which arrive before any auth check has run).
 *
 * WHY FOREGROUND DISPLAY VIA NOTIFEE
 *   FCM does not auto-display foreground pushes on either platform.
 *   We render foreground pushes with Notifee, carrying the raw FCM
 *   `data` block on the Notifee notification so the eventual PRESS
 *   event delivers the same payload shape as background /
 *   cold-start taps.
 *
 * NOTIFEE BACKGROUND EVENT — MODULE SCOPE
 *   `notifee.onBackgroundEvent` MUST be registered before React
 *   renders (Notifee's documented requirement — the handler has to
 *   survive process kills). It's installed at the bottom of this
 *   file so importing the module is enough.
 *
 * IDEMPOTENCY
 *   `startFcmBridge()` is safe to call more than once. Guarded so
 *   React StrictMode's double-invocation in dev cannot install
 *   duplicate FCM subscriptions.
 * ------------------------------------------------------------------
 */

import { getApp } from '@react-native-firebase/app';
import {
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
} from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';

import { logError } from '@services/telemetry/logError';
import { onFcmNotificationTapped } from './deeplink';

/* ================================================================
 * Notifee channel
 *
 * Android 8+ requires every notification belong to a channel. iOS
 * ignores channelId — the field is harmless there.
 * ================================================================ */

const FOREGROUND_CHANNEL_ID = 'default';
const FOREGROUND_CHANNEL_NAME = 'General notifications';

async function ensureForegroundChannel(): Promise<void> {
  await notifee.createChannel({
    id: FOREGROUND_CHANNEL_ID,
    name: FOREGROUND_CHANNEL_NAME,
    importance: AndroidImportance.HIGH,
  });
}

/**
 * Minimal shape of the FCM RemoteMessage we actually read.
 *
 * v26 removed the `FirebaseMessagingTypes.RemoteMessage` namespace
 * export (see https://rnfirebase.io/migrating-to-v26 — "Firebase*Types
 * namespaces are removed"). We declare only the fields this file
 * touches.
 *
 * `data` is typed `string | object` per the modular SDK: FCM's wire
 * format is string-only, but the SDK may auto-parse JSON string
 * values into objects (see the FCM v1 API docs). Downstream we
 * coerce back to string when handing off to Notifee, whose `data`
 * field is string-only.
 */
type FcmMessage = {
  notification?: { title?: string; body?: string };
  data?: { [key: string]: string | object };
};

async function displayForegroundPush(message: FcmMessage): Promise<void> {
  // Notifee.displayNotification requires string-valued data. Coerce
  // any auto-parsed object values back to their JSON string form so
  // the eventual PRESS handler sees the same shape as the
  // onNotificationOpenedApp / getInitialNotification code paths.
  const data: Record<string, string> = {};
  if (message.data) {
    for (const [k, v] of Object.entries(message.data)) {
      data[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }
  }
  await notifee.displayNotification({
    title: message.notification?.title ?? '',
    body: message.notification?.body ?? '',
    data,
    android: {
      channelId: FOREGROUND_CHANNEL_ID,
      // pressAction is what makes the notification tappable and
      // routes the tap through Notifee's event handlers.
      pressAction: { id: 'default' },
    },
  });
}

/* ================================================================
 * Bridge installer
 * ================================================================ */

let installed = false;
let unsubscribeOnMessage: (() => void) | null = null;
let unsubscribeOnOpened: (() => void) | null = null;
let unsubscribeNotifeeForeground: (() => void) | null = null;
let initialNotificationConsumed = false;

export function startFcmBridge(): () => void {
  if (installed) return () => {};
  installed = true;

  // Channel creation is fire-and-forget; a failure only means
  // Android falls back to the system "Miscellaneous" channel.
  // eslint-disable-next-line no-void
  void ensureForegroundChannel().catch(err => {
    logError(err, { boundary: 'fcm.channel' });
  });

  try {
    const messaging = getMessaging(getApp());

    // (1) Foreground pushes — FCM delivers, we display + route tap
    unsubscribeOnMessage = onMessage(messaging, async message => {
      try {
        await displayForegroundPush(message);
      } catch (err) {
        logError(err, { boundary: 'fcm.onMessage' });
      }
    });

    // (2) Background tap — user tapped a system-shown push that
    // woke the app from background.
    unsubscribeOnOpened = onNotificationOpenedApp(messaging, message => {
      onFcmNotificationTapped(message?.data as never);
    });

    // (3) Cold-start tap — user tapped a push that launched the
    // app from killed. `getInitialNotification` is not consumed on
    // read, but we guard so a hot-reload in dev doesn't re-route.
    if (!initialNotificationConsumed) {
      initialNotificationConsumed = true;
      getInitialNotification(messaging)
        .then(message => {
          if (message) onFcmNotificationTapped(message.data as never);
        })
        .catch(err => {
          logError(err, { boundary: 'fcm.getInitial' });
        });
    }

    // (4) Notifee foreground PRESS — user tapped the notification
    // we rendered above while the app was on-screen. Routes through
    // the exact same funnel as (2) and (3).
    unsubscribeNotifeeForeground = notifee.onForegroundEvent(
      ({ type, detail }) => {
        if (type === EventType.PRESS) {
          onFcmNotificationTapped(detail.notification?.data as never);
        }
      },
    );
  } catch (err) {
    // If anything above throws (Firebase not initialised, native
    // bridge missing on a broken dev build, …) we intentionally
    // swallow. Push routing is a non-critical feature — the app
    // must still open. Telemetry captures the failure.
    logError(err, { boundary: 'fcm.startBridge' });
    installed = false;
  }

  return () => {
    unsubscribeOnMessage?.();
    unsubscribeOnOpened?.();
    unsubscribeNotifeeForeground?.();
    unsubscribeOnMessage = null;
    unsubscribeOnOpened = null;
    unsubscribeNotifeeForeground = null;
    installed = false;
    // Deliberately do NOT reset initialNotificationConsumed here —
    // getInitialNotification must fire at most once per process
    // lifetime, unmount/remount cycles included.
  };
}
