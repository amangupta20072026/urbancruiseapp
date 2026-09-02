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
 * ------------------------------------------------------------------
 */

import type { DeepLinkTarget } from './schema';

export type NavigatePayload = {
  screen: string;
  params: Record<string, unknown> | undefined;
};

export function targetToNavigatePayload(t: DeepLinkTarget): NavigatePayload {
  switch (t.kind) {
    // ── Customer ─────────────────────────────────────────────────
    case 'customer.bookingDetail':
      return { screen: 'BookingDetail', params: { bookingId: t.bookingId } };
    case 'customer.tripLive':
      return { screen: 'TripLive', params: { tripId: t.tripId } };
    case 'customer.quotationDetail':
      return {
        screen: 'QuotationDetail',
        params: { quotationId: t.quotationId },
      };
    case 'customer.payBalance':
      return { screen: 'PayBalance', params: { bookingId: t.bookingId } };
    case 'customer.feedback':
      return { screen: 'Feedback', params: { bookingId: t.bookingId } };

    // ── Vendor ───────────────────────────────────────────────────
    case 'vendor.assignmentDetail':
      return {
        screen: 'AssignmentDetail',
        params: { bookingId: t.bookingId },
      };
    case 'vendor.tripDetail':
      return { screen: 'TripDetail', params: { tripId: t.tripId } };

    // ── Driver ───────────────────────────────────────────────────
    case 'driver.tripDetail':
      return { screen: 'TripDetail', params: { tripId: t.tripId } };
    case 'driver.collectPayment':
      return { screen: 'CollectPayment', params: { tripId: t.tripId } };

    // ── UC ───────────────────────────────────────────────────────
    case 'uc.enquiryDetail':
      return { screen: 'EnquiryDetail', params: { enquiryId: t.enquiryId } };
    case 'uc.customerDetail':
      return { screen: 'CustomerDetail', params: { customerId: t.customerId } };
    case 'uc.tripMonitor':
      return { screen: 'TripMonitor', params: { tripId: t.tripId } };

    // ── Cross-role ───────────────────────────────────────────────
    case 'common.notificationCentre':
      return { screen: 'NotificationCentre', params: undefined };
    case 'common.support':
      return { screen: 'Support', params: undefined };

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
