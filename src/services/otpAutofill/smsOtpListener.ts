/**
 * ------------------------------------------------------------------
 * smsOtpListener — hands the OTP from the SMS to the OTP screen
 * ------------------------------------------------------------------
 * Android only (SMS User Consent API); no-ops elsewhere.
 *
 *   beginSmsOtpListening()  LoginScreen, just BEFORE requesting the
 *                           OTP (and on resend), so listening is
 *                           already on when the SMS lands.
 *   subscribeSmsOtp(cb)     OtpVerifyScreen. A code that arrived
 *                           before the screen subscribed is buffered
 *                           and delivered on subscribe.
 *   stopSmsOtpListening()   When the OTP flow ends or the request
 *                           failed.
 * ------------------------------------------------------------------
 */

import {
  isSmsUserConsentAvailable,
  listenForConsentedSms,
  stopListeningForSms,
} from '@/native/smsUserConsent';
import { extractOtp } from './extractOtp';

type CodeListener = (code: string) => void;

/** Bumped on every begin/stop; results of older listens are ignored. */
let generation = 0;
/** Code that arrived while nobody was subscribed. */
let bufferedCode: string | null = null;
const listeners = new Set<CodeListener>();

export function beginSmsOtpListening(codeLength: number): void {
  if (!isSmsUserConsentAvailable()) return;
  generation += 1;
  const gen = generation;
  bufferedCode = null;

  // Never rejects (see native/smsUserConsent.ts).
  listenForConsentedSms().then(message => {
    if (gen !== generation || !message) return;
    const code = extractOtp(message, codeLength);
    if (!code) return;
    if (listeners.size === 0) {
      bufferedCode = code;
      return;
    }
    listeners.forEach(listener => listener(code));
  });
}

export function subscribeSmsOtp(listener: CodeListener): () => void {
  listeners.add(listener);
  if (bufferedCode) {
    const code = bufferedCode;
    bufferedCode = null;
    listener(code);
  }
  return () => {
    listeners.delete(listener);
  };
}

export function stopSmsOtpListening(): void {
  generation += 1;
  bufferedCode = null;
  stopListeningForSms();
}
