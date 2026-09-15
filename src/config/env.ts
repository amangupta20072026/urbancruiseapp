/**
 * ------------------------------------------------------------------
 * Runtime environment configuration
 * ------------------------------------------------------------------
 * Values come from `react-native-config` which reads the .env file
 * chosen by the ENVFILE variable at build time.
 *
 * Any REQUIRED value is validated at import time — the app fails
 * fast at boot rather than silently pushing `undefined` into axios
 * or a Linking URL and confusing debugging later.
 * ------------------------------------------------------------------
 */

import Config from 'react-native-config';

/** Read a required string. Throws if missing/empty. */
const requireString = (key: string): string => {
  const value = Config[key];
  if (!value || value.trim() === '') {
    throw new Error(
      `[env] Missing required environment variable: ${key}. ` +
        `Check your .env file (ENVFILE=${Config.ENVFILE ?? 'unset'}).`,
    );
  }
  return value;
};

/** Read an optional string, with a fallback. */
const optionalString = (key: string, fallback: string): string => {
  const value = Config[key];
  return value && value.trim() !== '' ? value : fallback;
};

/** Read a number, with a fallback if missing or unparseable. */
const optionalNumber = (key: string, fallback: number): number => {
  const raw = Config[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const ENV = {
  /* -------- API -------- */
  apiUrl: requireString('API_BASE_URL'),
  socketUrl: requireString('SOCKET_URL'),
  imageBaseUrl: requireString('IMAGE_BASE_URL'),
  pdfBaseUrl: requireString('PDF_BASE_URL'),
  apiTimeout: optionalNumber('API_TIMEOUT', 30_000),

  /* -------- Locale -------- */
  defaultCountry: optionalString('DEFAULT_COUNTRY', 'IN'),
  defaultCurrency: optionalString('DEFAULT_CURRENCY', 'INR'),
  defaultCountryCode: optionalString('DEFAULT_COUNTRY_CODE', '+91'),

  /* -------- Deep links -------- */
  deeplink: {
    scheme: optionalString('DEEPLINK_SCHEME', 'urbancruise'),
    webHost: optionalString('DEEPLINK_WEB_HOST', 'app.urbancruise.in'),
  },

  /* -------- Driver location -------- */
  locationInterval: optionalNumber('LOCATION_INTERVAL', 5_000),
  locationDistance: optionalNumber('LOCATION_DISTANCE', 10),

  /* -------- Fallback URLs (only used if remote AppConfig fails) -------- */
  fallback: {
    termsUrl: optionalString(
      'FALLBACK_TERMS_URL',
      'https://urbancruise.in/terms-conditions-2/',
    ),
    privacyUrl: optionalString(
      'FALLBACK_PRIVACY_URL',
      'https://urbancruise.in/privacy/',
    ),
  },
} as const;
