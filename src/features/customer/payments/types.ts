/**
 * ------------------------------------------------------------------
 * Customer Payments — types
 * ------------------------------------------------------------------
 * SSoT for the Payments tab list. Every payment record hangs off a
 * quotation (the ledger view groups payments by the quotation that
 * originated the booking); this file is the DTO contract used by the
 * list card, the detail sheet, and the pending-state "Pay Now" flow
 * that routes back to the parent quotation's confirm-and-continue
 * sheet.
 *
 * When /customer/payments ships, this file is the DTO contract.
 * ------------------------------------------------------------------
 */

import type { PaymentId, QuotationId } from '@app-types/ids';

/**
 * The user-facing payment status. Drives the leading icon glyph,
 * amount colour, status pill, and filter bucketing.
 *
 *   paid     — funds captured / settled
 *   pending  — awaiting user action (pay now) or gateway confirmation
 *   failed   — gateway declined or user cancelled at gateway
 */
export type PaymentStatus = 'paid' | 'pending' | 'failed';

/** Chip-strip filter buckets. `all` is a virtual filter. */
export type PaymentFilter = 'all' | PaymentStatus;

export type CustomerPaymentListItem = {
  id: PaymentId;
  /**
   * Parent quotation — the payment always belongs to one. Displayed
   * as the "Quotation ID" chip on the right column of the card, and
   * used by the pending-state "Pay Now" flow to navigate the user
   * back to that quotation's confirm-and-continue sheet so they can
   * complete the payment against a live quotation record.
   */
  quotationId: QuotationId;
  quotationNumber: string;

  status: PaymentStatus;

  /* Trip context — denormalised onto the payment row so the list
   * renders without a second lookup. When the endpoint ships, the
   * server should include these fields in the payment DTO. */
  from: string;
  to: string;
  /** ISO date of travel. */
  travelDate: string;
  /** Pickup wall-clock time e.g. "09:12 AM". */
  pickupTime: string;
  vehicleType: string;
  passengers: number;

  /** Amount in plain rupees for the demo; switch to Money +
   *  rupeesToMoney when the backend lands. */
  amount: number;
};

/**
 * ------------------------------------------------------------------
 * PaymentDetailSheet DTO
 * ------------------------------------------------------------------
 * Detail view for one payment entry. Extends the list item with
 * the timeline timestamps and the payment-instrument fields the
 * detail screen renders.
 *
 * INVARIANTS the screen relies on:
 *   - `status: 'paid'`    → `paymentMethod`, `transactionId`,
 *                           `paymentEventAt` MUST be non-null; they
 *                           are what appear in the Payment Summary.
 *   - `status: 'pending'` → `paymentMethod` and `transactionId` are
 *                           null (nothing has been charged); the
 *                           screen shows "Not Paid Yet" / "—".
 *                           `paymentEventAt` is the DUE-SINCE stamp.
 *   - `status: 'failed'`  → `paymentMethod` + `transactionId` may
 *                           be present (the attempted instrument);
 *                           `paymentEventAt` is the ATTEMPTED-AT
 *                           stamp; `failureReason` is the copy
 *                           printed in the inline banner.
 *
 * `tripCompletedAt` may be null for a not-yet-completed booking
 * whose payment already went through — the timeline collapses that
 * step in that (rare) case.
 * ------------------------------------------------------------------
 */
export type CustomerPaymentDetail = {
  id: PaymentId;
  quotationId: QuotationId;
  quotationNumber: string;

  status: PaymentStatus;

  from: string;
  to: string;
  travelDate: string;
  pickupTime: string;
  vehicleType: string;
  passengers: number;

  amount: number;

  /* Timeline stamps (ISO). See INVARIANTS above. */
  bookingConfirmedAt: string;
  tripCompletedAt: string | null;
  paymentEventAt: string;

  /** e.g. "UPI (Google Pay)". Null when unpaid. */
  paymentMethod: string | null;
  /** Gateway reference. Null when unpaid or when the attempt failed
   *  before a reference was issued. */
  transactionId: string | null;

  /** Failed-only. One-line reason shown inside the timeline card and
   *  echoed at the bottom banner. */
  failureReason?: string;
};
