/**
 * ------------------------------------------------------------------
 * MMKV — Non-Sensitive Storage
 * ------------------------------------------------------------------
 * Use for: theme, language, cached filters, "don't show hint" flags.
 * NEVER use for: JWT, refresh token, passwords, biometric secrets.
 * Those go through `secureStorage.ts` (Keychain).
 * ------------------------------------------------------------------
 */

import { createMMKV } from 'react-native-mmkv';
import type { StorageKey } from '@constants/storageKeys';

const store = createMMKV({ id: 'urbancruise-general' });

export const mmkv = {
  setString(key: StorageKey, value: string): void {
    store.set(key, value);
  },
  getString(key: StorageKey): string | undefined {
    return store.getString(key);
  },
  setNumber(key: StorageKey, value: number): void {
    store.set(key, value);
  },
  getNumber(key: StorageKey): number | undefined {
    return store.getNumber(key);
  },
  setBoolean(key: StorageKey, value: boolean): void {
    store.set(key, value);
  },
  getBoolean(key: StorageKey): boolean | undefined {
    return store.getBoolean(key);
  },
  setObject<T>(key: StorageKey, value: T): void {
    store.set(key, JSON.stringify(value));
  },
  getObject<T>(key: StorageKey): T | undefined {
    const raw = store.getString(key);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  },
  remove(key: StorageKey): void {
    store.remove(key);
  },
  clearAll(): void {
    store.clearAll();
  },
};
