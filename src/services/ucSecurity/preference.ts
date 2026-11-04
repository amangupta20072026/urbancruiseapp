/**
 * Fingerprint preference for THIS phone (MMKV, not a secret).
 *
 *   'auto' — turn fingerprint on automatically whenever it is off and the
 *            phone supports it (after MPIN setup, and again on the next
 *            MPIN unlock if the user cancelled the popup).
 *   'off'  — the user turned it off in Settings: never prompt again until
 *            they turn it on in Settings or set up a new MPIN after OTP.
 */
import { mmkv } from '@services/storage/mmkv';
import { StorageKeys } from '@constants/storageKeys';

export type BiometricPreference = 'auto' | 'off';

export function getBiometricPreference(): BiometricPreference {
  return mmkv.getString(StorageKeys.ucBiometricPreference) === 'off'
    ? 'off'
    : 'auto';
}

export function setBiometricPreference(value: BiometricPreference): void {
  mmkv.setString(StorageKeys.ucBiometricPreference, value);
}
