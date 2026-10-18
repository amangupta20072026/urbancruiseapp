/**
 * ------------------------------------------------------------------
 * targetToNavigatePayload — DeepLinkTarget → { screen, params }
 * ------------------------------------------------------------------
 * The ONLY place in the app where a screen name is chosen from a
 * deep-link target. Every branch is compile-time-enforced: adding
 * a new variant to `DeepLinkTarget` produces an exhaustiveness
 * error at the `assertExhaustive(t)` call until a case is added.
 *
 * Why screen names + string params instead of a typed navigate call:
 *
 *   `NavigationService.navigate<K>` is overloaded on the specific
 *   route name — great for direct callers who know the route at
 *   compile time. Deep-link dispatch is inherently dynamic (the
 *   route is chosen from runtime input), so we hand off a
 *   `{ screen, params }` shape to the drainer, which does the
 *   single cast at the boundary. This keeps every OTHER caller of
 *   `navigate()` fully typed.
 *
 * Duplicate route names across role stacks (`TripDetail`,
 * `NotificationCentre`, `Support`, `Profile`, `Settings`) are safe
 * because:
 *
 *   - `NavigationService.navigate` searches the CURRENTLY MOUNTED
 *     navigator tree — and `RootNavigator` mounts exactly one role
 *     branch at a time.
 *   - The intersection typing in `NavigationService.ts` guarantees
 *     duplicate route names have identical param types (any
 *     divergence collapses to `never`).
 *
 * UNFINISHED DESTINATIONS:
 *   Some link kinds point at features that aren't built yet. Their
 *   URL patterns and push payloads stay in the catalog — the backend
 *   may already send them, and dropping them would turn a helpful
 *   message into a silent "invalid link". Those kinds resolve to
 *   `{ type: 'comingSoon', feature }` instead of a screen; the drain
 *   shows the standard "Coming soon" toast after the role/auth gate
 *   has passed, so the toast never leaks another role's features.
 *   When a screen ships, change its case to `{ type: 'screen', … }`.
 * ------------------------------------------------------------------
 */

import type { ComingSoonFeature } from '@services/comingSoon';
import type { DeepLinkTarget } from './schema';

/** Open a registered screen. */
export type ScreenPayload = {
  readonly type: 'screen';
  readonly screen: string;
  readonly params: Record<string, unknown> | undefined;
};

/** The destination isn't built yet — show the "Coming soon" toast. */
export type ComingSoonPayload = {
  readonly type: 'comingSoon';
  readonly feature: ComingSoonFeature;
};

export type NavigatePayload = ScreenPayload | ComingSoonPayload;

const screen = (
  name: string,
  params?: Record<string, unknown>,
): ScreenPayload => ({ type: 'screen', screen: name, params });

const comingSoon = (feature: ComingSoonFeature): ComingSoonPayload => ({
  type: 'comingSoon',
  feature,
});

export function targetToNavigatePayload(t: DeepLinkTarget): NavigatePayload {
  switch (t.kind) {
    // ── Customer ─────────────────────────────────────────────────
    case 'customer.bookingDetail':
      return screen('BookingDetail', { bookingId: t.bookingId });
    case 'customer.quotationDetail':
      return screen('QuotationDetail', { quotationId: t.quotationId });
    case 'customer.feedback':
      return screen('Feedback', { bookingId: t.bookingId });
    case 'customer.tripLive':
      return comingSoon('customer.tripLive');
    case 'customer.payBalance':
      return comingSoon('customer.payBalance');

    // ── Vendor ───────────────────────────────────────────────────
    case 'vendor.assignmentDetail':
      return comingSoon('vendor.assignments');
    case 'vendor.tripDetail':
      return comingSoon('vendor.trips');

    // ── Driver ───────────────────────────────────────────────────
    case 'driver.tripDetail':
      return comingSoon('driver.trips');
    case 'driver.collectPayment':
      return comingSoon('driver.collectPayment');

    // ── UC ───────────────────────────────────────────────────────
    case 'uc.customerDetail':
      return screen('CustomerDetail', { customerId: t.customerId });
    case 'uc.enquiryDetail':
      return comingSoon('uc.enquiryDetail');
    case 'uc.tripMonitor':
      return comingSoon('uc.tripMonitor');

    // ── Cross-role ───────────────────────────────────────────────
    // Registered for Customer and UC. For roles that don't register
    // it yet, the drain's availability check shows "Coming soon".
    case 'common.notificationCentre':
      return screen('NotificationCentre');
    case 'common.support':
      return screen('Support');

    default:
      return assertExhaustive(t);
  }
}

/**
 * Exhaustiveness helper — if a new variant is added to
 * `DeepLinkTarget` without a matching case above, the parameter
 * type becomes something other than `never` and this line fails
 * to compile. That's the compile-time contract.
 */
function assertExhaustive(x: never): never {
  throw new Error(
    `targetToNavigatePayload: unhandled DeepLinkTarget kind: ${JSON.stringify(
      x,
    )}`,
  );
}
