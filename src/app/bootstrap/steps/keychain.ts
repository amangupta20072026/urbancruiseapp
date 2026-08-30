/**
 * ------------------------------------------------------------------
 * Bootstrap Step — Keychain
 * ------------------------------------------------------------------
 * Reads tokens from the OS secure store (Keychain / EncryptedSharedPrefs).
 * The result decides whether we run the /me validation step at all.
 *
 * Failure to read the keychain is treated as "no tokens" — we do NOT
 * throw. Reasons a read can fail:
 *   - First launch (nothing stored yet)
 *   - Keychain corrupted / OS refused access
 *   - Hardware attestation failure on some Android devices
 *
 * In all cases, the safe fallback is: user is unauthenticated → Login.
 * ------------------------------------------------------------------
 */

import { getTokens, type Tokens } from '@services/storage/secureStorage';

export async function readKeychainTokens(): Promise<Tokens | null> {
  try {
    return await getTokens();
  } catch {
    return null;
  }
}
