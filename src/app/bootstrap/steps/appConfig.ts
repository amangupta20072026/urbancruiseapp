/**
 * ------------------------------------------------------------------
 * Bootstrap Step — App Config (remote + cached)
 * ------------------------------------------------------------------
 * App config = feature flags, min supported version, maintenance mode,
 * public URLs. Two-tier strategy:
 *
 *   1. Read cached config from MMKV (sync, offline-safe).
 *   2. In parallel: fetch fresh config from server with a timeout.
 *      If it succeeds → overwrite cache & use fresh.
 *      If it fails/times out → stick with cache.
 *
 * The very first cold-start on a new install has no cache → we ship
 * a static DEFAULT_APP_CONFIG so the app can render its first screens
 * even before any network call succeeds.
 * ------------------------------------------------------------------
 */

import { apiClient } from '@api/axios';
import { mmkv } from '@services/storage/mmkv';
import type { StorageKey } from '@constants/storageKeys';

// A dedicated MMKV key. We keep it typed via `StorageKey` — feel free
// to add it to StorageKeys registry once you decide to expose it.
const APP_CONFIG_KEY = 'app.remoteConfig' as StorageKey;

export type AppConfig = {
  minSupportedVersion: string;
  maintenanceMode: boolean;
  featureFlags: Record<string, boolean>;
};

export const DEFAULT_APP_CONFIG: AppConfig = {
  minSupportedVersion: '0.0.1',
  maintenanceMode: false,
  featureFlags: {},
};

export function readCachedAppConfig(): AppConfig {
  return mmkv.getObject<AppConfig>(APP_CONFIG_KEY) ?? DEFAULT_APP_CONFIG;
}

export async function fetchFreshAppConfig(): Promise<AppConfig> {
  const { data } = await apiClient.get<AppConfig>('/config/app');
  // Persist for the next cold start.
  mmkv.setObject<AppConfig>(APP_CONFIG_KEY, data);
  return data;
}
