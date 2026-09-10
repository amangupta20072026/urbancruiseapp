/**
 * ------------------------------------------------------------------
 * Bootstrap Step — App Config (remote + cached)
 * ------------------------------------------------------------------
 * App config = version policy, maintenance mode, feature flags,
 * support + legal URLs, service cities. Two-tier strategy:
 *
 *   1. Read cached config from MMKV (sync, offline-safe).
 *   2. In parallel: fetch fresh config from server with a timeout.
 *      If it succeeds → overwrite cache & use fresh.
 *      If it fails/times out → stick with cache.
 *
 * The very first cold-start on a new install has no cache → we ship
 * a static DEFAULT_APP_CONFIG so the app can render its first screens
 * even before any network call succeeds.
 *
 * Contract:
 *   Server is authoritative for the response shape (see backend
 *   `AppConfigData` in modules/config/types.ts). Anything the client
 *   reads MUST have a matching default here so bootstrap survives
 *   the first launch and any outage.
 *
 * Query params:
 *   The endpoint REQUIRES `platform` and `appVersion` (semver) — used
 *   server-side to compute `updateRequired` / `updateAvailable` and
 *   to pick the right store URL. Both come from `getDeviceInfo()`.
 * ------------------------------------------------------------------
 */

import { apiClient } from '@api/axios';
import { mmkv } from '@services/storage/mmkv';
import { getDeviceInfo } from '@services/device';
import type { StorageKey } from '@constants/storageKeys';

// A dedicated MMKV key. We keep it typed via `StorageKey` — feel free
// to add it to StorageKeys registry once you decide to expose it.
const APP_CONFIG_KEY = 'app.remoteConfig' as StorageKey;

/* ---------------------------------------------------------------- */
/* Types — mirror backend AppConfigData exactly                     */
/* ---------------------------------------------------------------- */

export type AppConfigVersion = {
  minSupported: string;
  latest: string;
  updateRequired: boolean;
  updateAvailable: boolean;
  updateUrl: string | null;
};

export type AppConfigMaintenance = {
  active: boolean;
  message: string | null;
  estimatedEndAt: string | null;
};

export type AppConfigFeatureFlags = {
  otpTestMode: boolean;
  referralsEnabled: boolean;
  supportChatEnabled: boolean;
};

export type AppConfigSupport = {
  phone: string;
  whatsapp: string;
  email: string;
  helpUrl: string;
};

export type AppConfigLegal = {
  termsUrl: string;
  privacyUrl: string;
  termsVersion: string;
};

export type AppConfig = {
  version: AppConfigVersion;
  maintenance: AppConfigMaintenance;
  featureFlags: AppConfigFeatureFlags;
  support: AppConfigSupport;
  legal: AppConfigLegal;
  serviceCities: string[];
};

/* ---------------------------------------------------------------- */
/* Defaults — used before first successful fetch AND on outage      */
/* ---------------------------------------------------------------- */

/**
 * Boot-safe fallback. Nothing here should ever gate the app (no forced
 * upgrade, no maintenance banner, all feature flags off). Consumers
 * must be able to render sanely against this shape until the first
 * successful /config/app.
 */
export const DEFAULT_APP_CONFIG: AppConfig = {
  version: {
    minSupported: '0.0.1',
    latest: '0.0.1',
    updateRequired: false,
    updateAvailable: false,
    updateUrl: null,
  },
  maintenance: {
    active: false,
    message: null,
    estimatedEndAt: null,
  },
  featureFlags: {
    otpTestMode: false,
    referralsEnabled: false,
    supportChatEnabled: false,
  },
  support: {
    phone: '',
    whatsapp: '',
    email: '',
    helpUrl: '',
  },
  legal: {
    termsUrl: '',
    privacyUrl: '',
    termsVersion: '',
  },
  serviceCities: [],
};

/* ---------------------------------------------------------------- */
/* Read + fetch                                                     */
/* ---------------------------------------------------------------- */

export function readCachedAppConfig(): AppConfig {
  return mmkv.getObject<AppConfig>(APP_CONFIG_KEY) ?? DEFAULT_APP_CONFIG;
}

/**
 * Extract the semver core from `appVersion`. `getDeviceInfo()` returns
 * strings like "1.0.0 (1)" (version + build); the backend's Zod schema
 * demands a plain semver like "1.0.0".
 */
function toSemver(appVersion: string): string {
  const match = appVersion.match(/^\d+\.\d+\.\d+/);
  return match ? match[0] : '0.0.0';
}

export async function fetchFreshAppConfig(): Promise<AppConfig> {
  // Backend requires platform + appVersion in the query string. Without
  // them the request fails with 400 VALIDATION_QUERY.
  const device = await getDeviceInfo();

  const { data } = await apiClient.get<AppConfig>('/config/app', {
    params: {
      platform: device.platform,
      appVersion: toSemver(device.appVersion),
    },
  });

  // Persist for the next cold start.
  mmkv.setObject<AppConfig>(APP_CONFIG_KEY, data);
  return data;
}
