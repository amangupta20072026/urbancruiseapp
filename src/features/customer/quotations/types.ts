/**
 * ------------------------------------------------------------------
 * Customer Quotations — types
 * ------------------------------------------------------------------
 * SSoT for the Quotations tab list. Distinct from
 * `features/customer/home/types` (which holds the home-screen hero
 * card's `QuotationSummary`) — those two consumers show different
 * fields and have different lifecycle needs, so they intentionally
 * do not share a type.
 *
 * When the /customer/quotations endpoint lands, the API DTO will map
 * onto `CustomerQuotationListItem` verbatim; only `status` might
 * need a client-side enum mapping.
 * ------------------------------------------------------------------
 */

import type { QuotationId } from '@app-types/ids';

/**
 * Server-side lifecycle status of a quotation request. Mapped to
 * client-side filter buckets by `statusFilter()` in the screen.
 *
 *   under_review — ops team is preparing the quote
 *   sent         — ops team has sent the quote; customer not opened
 *   ready        — quote is ready for the customer to act on
 *   accepted     — customer accepted; a booking is being created
 *   rejected     — customer rejected
 */
export type QuotationStatus =
  | 'under_review'
  | 'sent'
  | 'ready'
  | 'accepted'
  | 'rejected';

/**
 * Chip-strip filter buckets. `all` is a virtual filter (matches
 * every status); `pending` collapses `under_review` + `sent` since
 * both mean "waiting on ops / not yet actionable" from the user's
 * point of view — the mockup surfaces one chip for both.
 */
export type QuotationFilter =
  | 'all'
  | 'pending'
  | 'ready'
  | 'accepted'
  | 'rejected';

export type CustomerQuotationListItem = {
  id: QuotationId;
  /** Human-facing request id, e.g. "QREQ-2026-28996". */
  requestNumber: string;
  status: QuotationStatus;

  /* Journey — free-text city names for the demo; will become a
   * typed Place object when the backend ships. */
  from: string;
  to: string;

  /** ISO date of travel start. */
  travelDateStart: string;
  /** ISO date of travel end for round trips; null for single-day. */
  travelDateEnd: string | null;

  passengers: number;
  /** Human-facing vehicle string, e.g. "Car (Sedan)". Nullable
   *  because it's not always chosen at request time. */
  vehicle: string | null;

  /** ISO timestamp when the request was submitted. */
  requestedAt: string;
};
