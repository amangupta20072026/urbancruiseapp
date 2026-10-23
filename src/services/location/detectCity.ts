/**
 * ------------------------------------------------------------------
 * detectCity — "Use my location" on the onboarding profile screen
 * ------------------------------------------------------------------
 * 1. Ask for the `cityLocation` capability (approximate location on
 *    Android, when-in-use on iOS) through PermissionService, so the
 *    rationale and blocked-recovery sheets are the app's standard ones.
 * 2. Take ONE low-accuracy position fix. A city needs nothing finer,
 *    and low accuracy is faster and uses less battery.
 * 3. Ask the OS geocoder for the city name (native/cityLookup).
 *
 * Returns a result for every outcome and never throws, so the screen
 * can show the right message and the user can always type the city.
 * Nothing here is stored or sent anywhere; the screen puts the city
 * into the text field, where the user can still edit it.
 * ------------------------------------------------------------------
 */

import Geolocation, {
  type GeoPosition,
} from 'react-native-geolocation-service';

import { ensureCapability } from '@services/permissions';
import { lookupCityName } from '@/native/cityLookup';

export type DetectCityResult =
  | { status: 'found'; city: string }
  /** User declined; asking again is allowed. */
  | { status: 'denied' }
  /** Declined permanently; only Settings can change it. */
  | { status: 'blocked' }
  /** Device location (GPS master switch) is off. */
  | { status: 'locationOff' }
  /** No position fix, or the geocoder returned no city. */
  | { status: 'notFound' };

/** How long to wait for a position fix. */
const POSITION_TIMEOUT_MS = 15_000;
/** A fix this recent is reused; a city doesn't change in 10 minutes. */
const POSITION_MAX_AGE_MS = 10 * 60_000;

/**
 * Onboarding happens before login, so there is no signed-in role yet.
 * The profile screen is reached only by a new customer.
 */
const ONBOARDING_ROLE = 'customer' as const;

function getCurrentPosition(): Promise<GeoPosition | null> {
  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      position => resolve(position),
      () => resolve(null),
      {
        enableHighAccuracy: false,
        accuracy: { android: 'balanced', ios: 'kilometer' },
        timeout: POSITION_TIMEOUT_MS,
        maximumAge: POSITION_MAX_AGE_MS,
        // The permission sheet already handled consent; don't show the
        // library's own "turn on location" dialog on top of it.
        showLocationDialog: false,
      },
    );
  });
}

export async function detectCity(): Promise<DetectCityResult> {
  const permission = await ensureCapability('cityLocation', ONBOARDING_ROLE);

  switch (permission.status) {
    case 'granted':
    case 'limited':
      break;
    case 'denied':
      return { status: 'denied' };
    case 'blocked':
      return { status: 'blocked' };
    case 'preconditionFailed':
      return { status: 'locationOff' };
    case 'unavailable':
      return { status: 'notFound' };
  }

  const position = await getCurrentPosition();
  if (!position) return { status: 'notFound' };

  const city = await lookupCityName(
    position.coords.latitude,
    position.coords.longitude,
  );
  return city ? { status: 'found', city } : { status: 'notFound' };
}
