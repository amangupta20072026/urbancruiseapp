/**
 * ------------------------------------------------------------------
 * Deep-link schema — Zod discriminated union of every legal target
 * ------------------------------------------------------------------
 * ONE variant per deep-linkable destination in the app. This union
 * is the type-safety pivot for the whole feature:
 *
 *   - The resolver produces a `DeepLinkTarget`, nothing else.
 *   - The role gate accepts a `DeepLinkTarget`, nothing else.
 *   - `toNavigate.ts` switch-matches on `kind` — TypeScript's
 *     exhaustive-check refuses to compile until every new variant
 *     added here has a matching case.
 *
 * Adding a new deep-linkable screen:
 *   1. Add a variant below.
 *   2. Add a catalog entry in `catalog.ts`.
 *   3. Add a case in `toNavigate.ts` (compile error until you do).
 *
 * Ids are validated at min-length only for now. Once the branded
 * id types (`BookingId`, `TripId`, …) ship with a runtime validator
 * we tighten these to the actual ULID shape:
 *   `.regex(/^[0-9A-HJKMNP-TV-Z]{26}$/i)` (Crockford's alphabet).
 * ------------------------------------------------------------------
 */

import { z } from 'zod';

/* ================================================================
 * Id schemas — kept in one place so tightening is a single edit.
 * ================================================================ */

const Id = z.string().min(1).max(64);

export const BookingIdSchema = Id;
export const TripIdSchema = Id;
export const QuotationIdSchema = Id;
export const CustomerIdSchema = Id;
export const EnquiryIdSchema = Id;

/* ================================================================
 * The exhaustive target union
 * ================================================================ */

export const DeepLinkTarget = z.discriminatedUnion('kind', [
  // ── Customer ───────────────────────────────────────────────────
  z.object({
    kind: z.literal('customer.bookingDetail'),
    bookingId: BookingIdSchema,
  }),
  z.object({ kind: z.literal('customer.tripLive'), tripId: TripIdSchema }),
  z.object({
    kind: z.literal('customer.quotationDetail'),
    quotationId: QuotationIdSchema,
  }),
  z.object({
    kind: z.literal('customer.payBalance'),
    bookingId: BookingIdSchema,
  }),
  z.object({
    kind: z.literal('customer.feedback'),
    bookingId: BookingIdSchema,
  }),

  // ── Vendor ─────────────────────────────────────────────────────
  z.object({
    kind: z.literal('vendor.assignmentDetail'),
    bookingId: BookingIdSchema,
  }),
  z.object({ kind: z.literal('vendor.tripDetail'), tripId: TripIdSchema }),

  // ── Driver ─────────────────────────────────────────────────────
  z.object({ kind: z.literal('driver.tripDetail'), tripId: TripIdSchema }),
  z.object({ kind: z.literal('driver.collectPayment'), tripId: TripIdSchema }),

  // ── UC ─────────────────────────────────────────────────────────
  z.object({ kind: z.literal('uc.enquiryDetail'), enquiryId: EnquiryIdSchema }),
  z.object({
    kind: z.literal('uc.customerDetail'),
    customerId: CustomerIdSchema,
  }),
  z.object({ kind: z.literal('uc.tripMonitor'), tripId: TripIdSchema }),

  // ── Cross-role ─────────────────────────────────────────────────
  z.object({ kind: z.literal('common.notificationCentre') }),
  z.object({ kind: z.literal('common.support') }),
]);

export type DeepLinkTarget = z.infer<typeof DeepLinkTarget>;

/** Convenience — the string-literal union of every legal kind. */
export type DeepLinkKind = DeepLinkTarget['kind'];
