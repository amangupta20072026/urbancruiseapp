/**
 * ------------------------------------------------------------------
 * smsUserConsent — JS side of Android's SMS User Consent API
 * ------------------------------------------------------------------
 * Native code:
 * android/app/src/main/java/app/urbancruise/auth/SmsUserConsentModule.kt
 *
 * Thin, never-throwing wrapper. Feature code uses
 * services/otpAutofill instead of calling this directly.
 * ------------------------------------------------------------------
 */

import { NativeModules, Platform } from 'react-native';

const { SmsUserConsent } = NativeModules as {
  SmsUserConsent?: {
    start: () => Promise<string | null>;
    stop: () => void;
  };
};

export function isSmsUserConsentAvailable(): boolean {
  return Platform.OS === 'android' && !!SmsUserConsent;
}

/**
 * Listens for the next code SMS (Google's window: 5 minutes).
 * Resolves the full message text once the user taps Allow, otherwise
 * `null` (denied, timed out, stopped, replaced by a newer call, or
 * unavailable).
 */
export async function listenForConsentedSms(): Promise<string | null> {
  if (!isSmsUserConsentAvailable()) return null;
  try {
    return await SmsUserConsent!.start();
  } catch {
    return null;
  }
}

export function stopListeningForSms(): void {
  if (!isSmsUserConsentAvailable()) return;
  try {
    SmsUserConsent!.stop();
  } catch {
    // Best-effort.
  }
}
