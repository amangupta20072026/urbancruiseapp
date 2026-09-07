/**
 * ------------------------------------------------------------------
 * Screen tracker for Firebase Analytics
 * ------------------------------------------------------------------
 * Hooked into NavigationContainer's onReady + onStateChange. Each
 * state change gets the deepest focused route via
 * navigationRef.getCurrentRoute() and emits a screen_view IF the
 * route name actually changed.
 *
 * De-duping matters — React Navigation can emit multiple state
 * changes for the same route (param updates, transitions), and
 * Firebase would count each as a separate view. We track the last
 * name in module-local state.
 * ------------------------------------------------------------------
 */

import { navigationRef } from '@/navigation/NavigationService';
import { sendAnalyticsScreenView } from './analytics';

let lastScreen: string | undefined;

/** Call from NavigationContainer.onReady + onStateChange. */
export function trackScreenChange(): void {
  if (!navigationRef.isReady()) return;
  const current = navigationRef.getCurrentRoute();
  if (!current) return;

  const name = current.name;
  if (name === lastScreen) return; // de-dupe

  lastScreen = name;
  if (__DEV__) {
    console.log('[screen_view]', name);
  }
  sendAnalyticsScreenView(name);
}

/**
 * Reset the last-seen screen. Call on logout so the next login
 * re-fires the first authenticated screen even if it happens to
 * share a name with the last authenticated screen from the prior
 * session.
 */
export function resetScreenTracker(): void {
  lastScreen = undefined;
}
