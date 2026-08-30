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
 * What we DO here:
 *   - Toggle Crashlytics collection based on env flag
 *   - Set a lightweight "boot" attribute for triaging cold-start crashes
 *   - Register the background message handler for FCM
 *
 * This step MUST NOT throw. If Firebase is broken, the app should
 * still open — we just lose telemetry for that session.
 * ------------------------------------------------------------------
 */

import { getApp } from '@react-native-firebase/app';
import {
  getCrashlytics,
  setCrashlyticsCollectionEnabled,
  setAttribute,
} from '@react-native-firebase/crashlytics';
import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import { ENV } from '@config/env';

export async function initFirebase(): Promise<void> {
  try {
    const app = getApp();
    const crashlytics = getCrashlytics(app);
    const messaging = getMessaging(app);

    await setCrashlyticsCollectionEnabled(
      crashlytics,
      Boolean(ENV.enableCrashlytics),
    );
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
