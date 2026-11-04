/**
 * ------------------------------------------------------------------
 * UC device security — hardware keys on this phone
 * ------------------------------------------------------------------
 * Two EC P-256 keys (library: @sbaiahmed1/react-native-biometrics,
 * the one the backend's uc-crypto.ts is written for):
 *
 *   DEVICE key      — no prompt. Proves "this is the registered phone"
 *                     for MPIN unlock, change MPIN, token refresh.
 *                     Android Keystore / iOS Secure Enclave.
 *   FINGERPRINT key — usable ONLY after a strong (class 3) biometric,
 *                     no phone PIN/pattern fallback. Android only
 *                     (product decision: iPhone uses MPIN only).
 *
 * Public keys: base64 X.509 SPKI DER. Signatures: base64 DER ECDSA
 * over SHA-256 — exactly what the backend verifies.
 *
 * Private keys never leave the hardware. Nothing here is logged.
 * ------------------------------------------------------------------
 */

import { Platform } from 'react-native';
import {
  BiometricStrength,
  createKeysWithOptions,
  deleteKeys,
  isSensorAvailable,
  keyExists,
  sign,
  signWithOptions,
  SignatureAlgorithm,
} from '@sbaiahmed1/react-native-biometrics';

const DEVICE_KEY_ALIAS = 'urbancruise.uc.device';
const BIOMETRIC_KEY_ALIAS = 'urbancruise.uc.fingerprint';

/** Outcome of a fingerprint signature. */
export type BiometricSignResult =
  | { ok: true; signature: string }
  /** User closed the popup or pressed Cancel. Not an error. */
  | { ok: false; reason: 'cancelled' }
  /** Too many failed touches; the phone itself blocks the sensor for a while. */
  | { ok: false; reason: 'lockout' }
  /**
   * The key is gone or can no longer be used (e.g. a new fingerprint
   * was added, which makes Android invalidate the key). The app
   * deletes it and falls back to MPIN.
   */
  | { ok: false; reason: 'key_unusable' }
  | { ok: false; reason: 'error' };

export class UcKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UcKeyError';
  }
}

/* ---------------- Capability ---------------- */

/**
 * True when fingerprint unlock may be offered on this phone:
 * Android, with a strong biometric enrolled. iPhone always false
 * (product decision). Never throws.
 */
export async function isBiometricSupported(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const info = await isSensorAvailable({
      biometricStrength: BiometricStrength.Strong,
    });
    // The library may fall back to a WEAK biometric when no strong one
    // exists; a weak one cannot unlock a Keystore key, so refuse it.
    return (
      info.available === true &&
      info.biometricStrength === BiometricStrength.Strong
    );
  } catch {
    return false;
  }
}

/* ---------------- Device key ---------------- */

/** Creates (replacing any old one) the device key. Returns its public key. */
export async function createDeviceKey(): Promise<string> {
  const { publicKey } = await createKeysWithOptions({
    keyAlias: DEVICE_KEY_ALIAS,
    keyType: 'ec256',
    requireAuthentication: false,
  });
  if (!publicKey) throw new UcKeyError('Device key was not created.');
  return publicKey;
}

export async function hasDeviceKey(): Promise<boolean> {
  try {
    return await keyExists(DEVICE_KEY_ALIAS);
  } catch {
    return false;
  }
}

/** Signs `message` (UTF-8) with the device key, without any prompt. */
export async function signWithDeviceKey(message: string): Promise<string> {
  const result = await sign({
    keyAlias: DEVICE_KEY_ALIAS,
    data: message,
    algorithm: SignatureAlgorithm.SHA256withECDSA,
  });
  if (!result.success || !result.signature) {
    throw new UcKeyError(result.errorCode ?? 'DEVICE_SIGN_FAILED');
  }
  return result.signature;
}

/* ---------------- Fingerprint key ---------------- */

/** Creates (replacing any old one) the fingerprint key. Returns its public key. */
export async function createBiometricKey(): Promise<string> {
  const { publicKey } = await createKeysWithOptions({
    keyAlias: BIOMETRIC_KEY_ALIAS,
    keyType: 'ec256',
    requireAuthentication: true,
    biometricStrength: BiometricStrength.Strong,
    allowDeviceCredentials: false,
  });
  if (!publicKey) throw new UcKeyError('Fingerprint key was not created.');
  return publicKey;
}

export async function hasBiometricKey(): Promise<boolean> {
  try {
    return await keyExists(BIOMETRIC_KEY_ALIAS);
  } catch {
    return false;
  }
}

const CANCEL_CODES = new Set(['USER_CANCELED', 'SYSTEM_CANCELED']);
const LOCKOUT_CODES = new Set([
  'BIOMETRIC_LOCKOUT',
  'BIOMETRIC_LOCKOUT_PERMANENT',
]);
const UNUSABLE_CODES = new Set([
  'KEY_NOT_FOUND',
  // initSign() throws KeyPermanentlyInvalidatedException after a new
  // fingerprint is enrolled; the library reports it as this code.
  'SIGNATURE_CREATION_FAILED',
  'NO_BIOMETRICS_ENROLLED',
  'BIOMETRIC_NOT_AVAILABLE',
]);

/** Shows the phone's fingerprint popup and signs `message` (UTF-8). */
export async function signWithBiometricKey(
  message: string,
  prompt: { title: string; subtitle?: string },
): Promise<BiometricSignResult> {
  try {
    const result = await signWithOptions({
      keyAlias: BIOMETRIC_KEY_ALIAS,
      data: message,
      promptTitle: prompt.title,
      promptSubtitle: prompt.subtitle,
      cancelButtonText: 'Cancel',
      biometricStrength: BiometricStrength.Strong,
      disableDeviceFallback: true,
    });
    if (result.success && result.signature) {
      return { ok: true, signature: result.signature };
    }
    const code = result.errorCode ?? '';
    if (CANCEL_CODES.has(code)) return { ok: false, reason: 'cancelled' };
    if (LOCKOUT_CODES.has(code)) return { ok: false, reason: 'lockout' };
    if (UNUSABLE_CODES.has(code)) return { ok: false, reason: 'key_unusable' };
    return { ok: false, reason: 'error' };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/* ---------------- Cleanup ---------------- */

export async function deleteBiometricKey(): Promise<void> {
  try {
    await deleteKeys(BIOMETRIC_KEY_ALIAS);
  } catch {
    // Nothing to delete.
  }
}

/** Removes both keys. Used on logout, MPIN lockout and Forgot MPIN. */
export async function deleteAllUcKeys(): Promise<void> {
  await Promise.all([
    deleteBiometricKey(),
    deleteKeys(DEVICE_KEY_ALIAS).catch(() => undefined),
  ]);
}
