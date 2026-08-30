/**
 * ------------------------------------------------------------------
 * MMKV storage adapter for redux-persist
 * ------------------------------------------------------------------
 * MMKV is ~30x faster than AsyncStorage and synchronous — the right
 * production choice for redux-persist. This adapter wraps it in the
 * async Storage interface redux-persist expects.
 * ------------------------------------------------------------------
 */

import { createMMKV } from 'react-native-mmkv';
import type { Storage } from 'redux-persist';

const persistStore = createMMKV({ id: 'urbancruise-persist' });

export const reduxMmkvStorage: Storage = {
  setItem: (key, value) => {
    persistStore.set(key, value);
    return Promise.resolve(true);
  },
  getItem: (key) => {
    const value = persistStore.getString(key);
    return Promise.resolve(value ?? null);
  },
  removeItem: (key) => {
    persistStore.remove(key);
    return Promise.resolve();
  },
};