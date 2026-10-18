// src/services/comingSoon/comingSoon.ts

/**
 * ------------------------------------------------------------------
 * notifyComingSoon — the ONE way to tell a user a feature isn't ready
 * ------------------------------------------------------------------
 * Replaces the old pattern of registering unfinished routes against
 * a placeholder screen. Instead of pushing a blank page (an extra
 * screen in the bundle, a back-stack entry, and a dead end for the
 * user), the app stays where it is and shows a short info toast.
 *
 * BEHAVIOUR:
 *   - Info toast, standard duration, no action button.
 *   - Fixed toast id: repeated taps (or several different unfinished
 *     features tapped in a row) REPLACE the one visible toast and
 *     restart its timer, instead of stacking duplicates.
 *   - Emits `feature.coming_soon_shown { feature, source }` so the
 *     product team can see which unfinished features users actually
 *     try to reach. Both values are bounded literals, so cardinality
 *     stays low and no user data is ever sent.
 *
 * SAFETY:
 *   - Never throws. `toast.*` and `logEvent` are both no-throw by
 *     contract, so this is safe from render, event handlers, deep-link
 *     drains and notification callbacks alike.
 * ------------------------------------------------------------------
 */

import { logEvent } from '@services/telemetry';
import { toast } from '@services/toast';


/**
 * Where the attempt came from. Kept as a closed union for the same
 * reason as `ComingSoonFeature` — bounded analytics values.
 *
 *   'tap'              — the user tapped a button, tile or row.
 *   'deeplink'         — a URL or push-notification tap pointed at an
 *                        unfinished destination.
 *   'navigation_guard' — a navigate() call targeted a screen that is
 *                        not registered for the current role (see
 *                        `navigateOrComingSoon` in NavigationService).
 */
export type ComingSoonSource = 'tap' | 'deeplink' | 'navigation_guard';

/** Shared id so coming-soon toasts replace each other in place. */
const COMING_SOON_TOAST_ID = 'coming-soon';

const TITLE = 'Coming soon';

/**
 * Show the standard "coming soon" toast for `feature` and record it.
 *
 * @param feature Which unfinished feature the user tried to open.
 * @param source  How they got there. Defaults to a direct tap.
 */
export function notifyComingSoon(
  source: ComingSoonSource = 'tap',
): void {
  toast.info(TITLE, {
    id: COMING_SOON_TOAST_ID,
  });
  logEvent('feature.coming_soon_shown', {source });
}
