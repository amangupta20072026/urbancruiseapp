/**
 * ------------------------------------------------------------------
 * Deep-link catalog — path patterns ↔ target descriptors
 * ------------------------------------------------------------------
 * The single source of truth for:
 *   - Which URL paths this app claims to handle.
 *   - Which role each target is scoped to.
 *   - Whether authentication is required.
 *   - How to construct the target from parsed path params.
 *   - An optional fallback target when the gate rejects.
 *
 * Any URL not matching a catalog entry is rejected by the resolver;
 * any role mismatch is caught by `gate.ts`. This file is the audit
 * surface — reading it top-to-bottom tells you every URL the app
 * accepts and who is allowed through.
 *
 * ADDING A NEW DEEP-LINK:
 *   1. Add a variant to `DeepLinkTarget` in `schema.ts`.
 *   2. Add an entry here with { path, role, auth, build }.
 *   3. Add a case in `toNavigate.ts` (TypeScript will insist).
 *   4. Add the path prefix to AndroidManifest.xml and the AASA.
 * ------------------------------------------------------------------
 */

import type { UserRole } from '@rbac/roles';
import type { DeepLinkTarget, DeepLinkKind } from './schema';

/* ================================================================
 * CatalogEntry
 * ================================================================ */

export type CatalogEntry = {
  /** URL path with ':name' segments. MUST start with '/'. */
  readonly path: string;

  /** Which role is authorized to receive this target. */
  readonly role: UserRole | 'any';

  /** Whether the user must be authenticated. */
  readonly auth: 'authenticated' | 'any';

  /** The kind this entry produces — cached so we can look up by kind. */
  readonly kind: DeepLinkKind;

  /**
   * Build a target from parsed path params. Keys correspond to the
   * `:name` segments in `path`.
   */
  build(params: Record<string, string>): DeepLinkTarget;

  /**
   * Optional fallback target used by the gate when the current role
   * is wrong for this entry. When omitted, the gate routes to the
   * user's role home (see `gate.ts`).
   */
  readonly fallback?: DeepLinkTarget;
};

/* ================================================================
 * The catalog
 *
 * Ordering: role-specific first, cross-role last. Within a role,
 * more specific paths before less specific ones — `/bookings/:id/pay`
 * MUST appear before `/bookings/:id` so the matcher hits it first.
 * (Actually irrelevant with our exact-segment-count matcher, but the
 * convention keeps the file readable.)
 * ================================================================ */

export const CATALOG: readonly CatalogEntry[] = [
  // ── Customer ───────────────────────────────────────────────────
  {
    path: '/bookings/:id',
    role: 'customer',
    auth: 'authenticated',
    kind: 'customer.bookingDetail',
    build: ({ id }) => ({ kind: 'customer.bookingDetail', bookingId: id! }),
  },
  {
    path: '/bookings/:id/pay',
    role: 'customer',
    auth: 'authenticated',
    kind: 'customer.payBalance',
    build: ({ id }) => ({ kind: 'customer.payBalance', bookingId: id! }),
  },
  {
    path: '/bookings/:id/feedback',
    role: 'customer',
    auth: 'authenticated',
    kind: 'customer.feedback',
    build: ({ id }) => ({ kind: 'customer.feedback', bookingId: id! }),
  },
  {
    path: '/trip/:id',
    role: 'customer',
    auth: 'authenticated',
    kind: 'customer.tripLive',
    build: ({ id }) => ({ kind: 'customer.tripLive', tripId: id! }),
  },
  {
    path: '/quotations/:id',
    role: 'customer',
    auth: 'authenticated',
    kind: 'customer.quotationDetail',
    build: ({ id }) => ({ kind: 'customer.quotationDetail', quotationId: id! }),
  },

  // ── Vendor ─────────────────────────────────────────────────────
  {
    path: '/vendor/assignments/:id',
    role: 'vendor',
    auth: 'authenticated',
    kind: 'vendor.assignmentDetail',
    build: ({ id }) => ({ kind: 'vendor.assignmentDetail', bookingId: id! }),
  },
  {
    path: '/vendor/trips/:id',
    role: 'vendor',
    auth: 'authenticated',
    kind: 'vendor.tripDetail',
    build: ({ id }) => ({ kind: 'vendor.tripDetail', tripId: id! }),
  },

  // ── Driver ─────────────────────────────────────────────────────
  {
    path: '/driver/trips/:id',
    role: 'driver',
    auth: 'authenticated',
    kind: 'driver.tripDetail',
    build: ({ id }) => ({ kind: 'driver.tripDetail', tripId: id! }),
  },
  {
    path: '/driver/trips/:id/collect',
    role: 'driver',
    auth: 'authenticated',
    kind: 'driver.collectPayment',
    build: ({ id }) => ({ kind: 'driver.collectPayment', tripId: id! }),
  },

  // ── UC ─────────────────────────────────────────────────────────
  {
    path: '/uc/enquiries/:id',
    role: 'uc',
    auth: 'authenticated',
    kind: 'uc.enquiryDetail',
    build: ({ id }) => ({ kind: 'uc.enquiryDetail', enquiryId: id! }),
  },
  {
    path: '/uc/customers/:id',
    role: 'uc',
    auth: 'authenticated',
    kind: 'uc.customerDetail',
    build: ({ id }) => ({ kind: 'uc.customerDetail', customerId: id! }),
  },
  {
    path: '/uc/trips/:id',
    role: 'uc',
    auth: 'authenticated',
    kind: 'uc.tripMonitor',
    build: ({ id }) => ({ kind: 'uc.tripMonitor', tripId: id! }),
  },

  // ── Cross-role ─────────────────────────────────────────────────
  {
    path: '/notifications',
    role: 'any',
    auth: 'authenticated',
    kind: 'common.notificationCentre',
    build: () => ({ kind: 'common.notificationCentre' }),
  },
  {
    path: '/support',
    role: 'any',
    auth: 'any',
    kind: 'common.support',
    build: () => ({ kind: 'common.support' }),
  },
] as const;

/* ================================================================
 * Lookup helpers
 * ================================================================ */

/** Find a catalog entry by the kind it produces. O(catalog size). */
export function findCatalogEntryByKind(
  kind: DeepLinkKind,
): CatalogEntry | undefined {
  return CATALOG.find(e => e.kind === kind);
}
