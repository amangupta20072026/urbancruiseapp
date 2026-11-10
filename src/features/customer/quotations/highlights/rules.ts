/**
 * ------------------------------------------------------------------
 * Quotation highlights — entry rules
 * ------------------------------------------------------------------
 * The ONE place that decides whether opening a quotation goes
 * through the highlights screen or straight to the details screen.
 * Every entry point (list, Book Now, Pay Now, deep links) uses it,
 * so the rule cannot drift between callers.
 *
 * DATA SOURCE (temporary):
 *   `lookupQuotationStatus` reads the same mock fixture that
 *   QuotationDetailScreen reads today (`getCustomerQuotationDetail`),
 *   because GET /customer/quotations/:id is not built yet (backend
 *   customer/quotations module is a stub). When that endpoint ships,
 *   replace the body of `lookupQuotationStatus` — nothing else.
 * ------------------------------------------------------------------
 */
import type { QuotationId } from '@app-types/ids';

import { getCustomerQuotationDetail } from '../mocks';
import type { QuotationStatus } from '../types';
import { HIGHLIGHT_ELIGIBLE_STATUSES } from './config';

/** True when this status shows the highlights first. */
export function isHighlightEligible(status: QuotationStatus): boolean {
  return HIGHLIGHT_ELIGIBLE_STATUSES.has(status);
}

/**
 * Status for callers that only have an id (Pay Now, deep links).
 * `null` = quotation not found; the caller then opens the details
 * screen directly, which owns the not-found state.
 */
export function lookupQuotationStatus(id: QuotationId): QuotationStatus | null {
  return getCustomerQuotationDetail(id)?.status ?? null;
}

/**
 * Pass `knownStatus` when the caller already has it (list cards) to
 * skip the lookup. Unknown quotations go straight to details.
 */
export function shouldShowHighlights(
  id: QuotationId,
  knownStatus?: QuotationStatus,
): boolean {
  const status = knownStatus ?? lookupQuotationStatus(id);
  return status !== null && isHighlightEligible(status);
}
