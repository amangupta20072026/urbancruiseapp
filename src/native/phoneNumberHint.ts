/**
 * ------------------------------------------------------------------
 * phoneNumberHint — JS side of the SIM phone-number picker
 * ------------------------------------------------------------------
 * Opens Google's Phone Number Hint sheet (Android only), which lists
 * the SIM-based numbers on this device. Native code:
 * android/app/src/main/java/app/urbancruise/auth/PhoneNumberHintModule.kt
 *
 * Never throws. Resolves `null` on iOS, on cancel, when no SIM number
 * is available, or when the number is not a valid Indian mobile — the
 * user then types it as usual.
 * ------------------------------------------------------------------
 */

import { NativeModules, Platform } from 'react-native';

const { PhoneNumberHint } = NativeModules as {
  PhoneNumberHint?: { request: () => Promise<string | null> };
};

/** Same rule as the login form and the backend: 10 digits, starts 6-9. */
const INDIAN_MOBILE = /^[6-9]\d{9}$/;

/**
 * Converts what the sheet returns ("+91 98123 45678", "09812345678",
 * "919812345678", …) to the 10-digit form the login field uses.
 * Returns `null` for anything that is not an Indian mobile number.
 */
export function normalizeIndianMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  let local: string;
  if (digits.length === 12 && digits.startsWith('91')) {
    local = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    local = digits.slice(1);
  } else {
    local = digits;
  }
  return INDIAN_MOBILE.test(local) ? local : null;
}

/** Shows the picker; resolves the chosen 10-digit number or `null`. */
export async function requestPhoneNumberHint(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  if (!PhoneNumberHint) {
    if (__DEV__) {
      console.warn(
        '[PhoneNumberHint] native module not found — rebuild the Android app',
      );
    }
    return null;
  }
  try {
    const raw = await PhoneNumberHint.request();
    if (!raw) return null;
    const local = normalizeIndianMobile(raw);
    if (!local && __DEV__) {
      console.warn('[PhoneNumberHint] picked number is not an Indian mobile');
    }
    return local;
  } catch {
    return null;
  }
}
