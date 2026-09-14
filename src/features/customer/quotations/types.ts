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
 *
 * DESIGN NOTE (Aug/Sep 2026 redesign):
 *   The Quotations tab was reworked to a receipt-style card that
 *   shows a priced quotation (multi-stop route, travel window with
 *   nights/days, passenger breakdown, total amount). The prior
 *   list showed a raw quotation REQUEST (single-hop, no price) and
 *   was collapsed into the RequestQuotation entry point at the app
 *   root. As a result:
 *     - `QuotationStatus` is trimmed to the three states a priced
 *        quotation can be in from the customer's point of view:
 *        pending (ops still preparing / customer hasn't decided),
 *        accepted (customer confirmed), expired (window elapsed).
 *     - `QuotationFilter` mirrors those three states plus `all`.
 *     - Item shape is priced + multi-stop.
 * ------------------------------------------------------------------
 */

import type { QuotationId } from '@app-types/ids';

/**
 * Customer-facing lifecycle status of a priced quotation.
 *
 *   pending  — quotation issued; customer has not yet accepted, and
 *              it has not yet expired.
 *   accepted — customer accepted; a booking is being / has been
 *              created downstream.
 *   expired  — the acceptance window elapsed without a decision.
 *              Distinct from `rejected` (which was a customer-driven
 *              decline in the older request model) — expiry is
 *              time-driven and not the customer's fault.
 */
export type QuotationStatus = 'pending' | 'accepted' | 'expired';

/**
 * Chip-strip filter buckets. `all` is a virtual filter (matches
 * every status); the remaining chips map 1:1 to a `QuotationStatus`.
 */
export type QuotationFilter = 'all' | 'pending' | 'accepted' | 'expired';

export type CustomerQuotationListItem = {
  id: QuotationId;

  /**
   * Human-facing quotation number, e.g. "QU10257".
   * NB: distinct from the older QREQ- (request) numbering — a
   * quotation is issued by ops in response to a request, so the
   * numbers do not share a namespace with request IDs.
   */
  quotationNumber: string;

  status: QuotationStatus;

  /**
   * Ordered list of cities on the itinerary. First entry is the
   * origin; last entry is the final drop-off (which may equal the
   * origin for round trips). Modelled as `readonly string[]` for
   * flexibility with future intermediate stops; the card renders
   * them joined with arrows.
   *
   * INVARIANT: length ≥ 2. A zero- or single-stop trip has no
   * meaningful visualisation on this card.
   */
  stops: readonly string[];

  /** ISO date of travel start (inclusive). */
  travelDateStart: string;
  /** ISO date of travel end (inclusive). */
  travelDateEnd: string;

  /**
   * Duration components as ops quoted them. Kept as separate ints
   * rather than derived from the date pair because ops sometimes
   * quotes fractional-night packages (e.g. red-eye returns) that a
   * naïve `dateDiff / 24h` calculation would miscount.
   */
  nights: number;
  days: number;

  /** Adult passenger count. */
  adults: number;
  /** Child passenger count (0 or more). */
  children: number;

  /**
   * Total quotation amount in Indian rupees (INR, whole rupees —
   * paise are irrelevant at quotation granularity and the backend
   * currently rounds server-side). Rendered with `₹` grouping in
   * `en-IN` locale by the card.
   */
  amount: number;

  /** ISO timestamp when the quotation was issued to the customer. */
  createdAt: string;
};
