/**
 * ------------------------------------------------------------------
 * Bootstrap Step — Firebase
 * ------------------------------------------------------------------
 * @react-native-firebase v22+ uses the modular (tree-shakeable) API.
 * Default exports were removed — we import named functions and pass
 * the default app instance via getApp().
 *
 * @react-native-firebase auto-initialises the default app from the
 * native config files (google-services.json / GoogleService-Info.plist)
 * before JS runs — so we don't call initializeApp() here.
 *
 * Crashlytics collection state:
 *   Single source of truth is firebase.json:
 *     - crashlytics_auto_collection_enabled: master switch
 *     - crashlytics_debug_enabled: overrides "off in debug" default
 *   We deliberately DO NOT call setCrashlyticsCollectionEnabled from
 *   JS. That API writes to Android SharedPreferences / iOS UserDefaults
 *   and takes priority over firebase.json on every subsequent launch —
 *   which turns firebase.json into a lie that developers can't trust.
 *
 *   The only legitimate use of setCrashlyticsCollectionEnabled from
 *   JS is a user-facing consent toggle (GDPR / DPDP / CCPA). If we
 *   add one, it goes in the settings screen — not in bootstrap.
 *
 * What we DO here:
 *   - Set a lightweight "boot" attribute so cold-start crashes are
 *     easy to filter for on the dashboard.
 *   - Register the FCM background message handler.
 *
 * This step MUST NOT throw. If Firebase is broken, the app should
 * still open — we just lose telemetry for that session.
 * ------------------------------------------------------------------
 */

import { getApp } from '@react-native-firebase/app';
import {
  getCrashlytics,
  setAttribute,
} from '@react-native-firebase/crashlytics';
import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';

export async function initFirebase(): Promise<void> {
  try {
    const app = getApp();
    const crashlytics = getCrashlytics(app);
    const messaging = getMessaging(app);

    await setAttribute(crashlytics, 'bootPhase', 'cold-start');

    // Background message handler is safe to register early —
    // native side will queue messages until JS is ready.
    setBackgroundMessageHandler(messaging, async () => {
      // Notification payload display is handled natively;
      // add background sync logic here if/when needed.
    });
  } catch {
    // Swallow — telemetry failure must not block boot.
  }
}
