/**
 * ------------------------------------------------------------------
 * Secure Storage — Keychain
 * ------------------------------------------------------------------
 * The ONE place JWT + refresh token live.
 * iOS  → Keychain Services
 * Android → Keystore + EncryptedSharedPreferences
 *
 * Tokens are stored as one credential entry (atomic write on refresh).
 * ------------------------------------------------------------------
 */

import * as Keychain from 'react-native-keychain';
import { SecureKeys } from '@constants/storageKeys';

export type Tokens = {
  accessToken: string;
  refreshToken: string;
};

const SERVICE_NAME = 'urbancruise.auth';

export async function saveTokens(tokens: Tokens): Promise<void> {
  await Keychain.setGenericPassword(SecureKeys.jwt, JSON.stringify(tokens), {
    service: SERVICE_NAME,
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
  });
}

export async function getTokens(): Promise<Tokens | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: SERVICE_NAME,
    });
    if (!credentials) return null;
    return JSON.parse(credentials.password) as Tokens;
  } catch {
    return null;
  }
}

export async function getAccessToken(): Promise<string | null> {
  const tokens = await getTokens();
  return tokens?.accessToken ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  const tokens = await getTokens();
  return tokens?.refreshToken ?? null;
}

export async function clearTokens(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({ service: SERVICE_NAME });
  } catch {
    // nothing to clear
  }
}

export async function hasTokens(): Promise<boolean> {
  return (await getTokens()) !== null;
}
