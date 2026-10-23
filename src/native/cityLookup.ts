/**
 * ------------------------------------------------------------------
 * cityLookup — city name from coordinates (built-in OS geocoder)
 * ------------------------------------------------------------------
 * Android: android.location.Geocoder (CityLookupModule.kt)
 * iOS:     CLGeocoder (UCCityLookup.m)
 *
 * No API key and no paid service. Best-effort: resolves `null` when
 * the device can't name a city (no geocoder backend, offline, no
 * result, or the native module isn't built in). Never throws; the
 * caller falls back to manual entry.
 * ------------------------------------------------------------------
 */

import { NativeModules } from 'react-native';

const { CityLookup } = NativeModules as {
  CityLookup?: {
    fromCoordinates: (
      latitude: number,
      longitude: number,
    ) => Promise<string | null>;
  };
};

/** The OS geocoder can hang on poor networks; give up after this. */
const LOOKUP_TIMEOUT_MS = 10_000;

export async function lookupCityName(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  if (!CityLookup) {
    if (__DEV__) {
      console.warn('[CityLookup] native module not found — rebuild the app');
    }
    return null;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>(resolve => {
    timer = setTimeout(() => resolve(null), LOOKUP_TIMEOUT_MS);
  });

  try {
    const city = await Promise.race([
      CityLookup.fromCoordinates(latitude, longitude),
      timeout,
    ]);
    const trimmed = typeof city === 'string' ? city.trim() : '';
    return trimmed === '' ? null : trimmed;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
