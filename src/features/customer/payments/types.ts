/**
 * ------------------------------------------------------------------
 * Customer Payments — types
 * ------------------------------------------------------------------
 * SSoT for the Payments tab list. Kept independent of the bookings
 * feature's DTO — a single booking can have multiple payment
 * entries (advance / balance / refund) and the payment list is the
 * financial ledger view, not the booking view.
 *
 * When /customer/payments ships, this file is the DTO contract.
 * ------------------------------------------------------------------
 */

import type { BookingId, PaymentId } from '@app-types/ids';

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
  /** Parent booking — used for both navigation to detail and the
   *  "Booking ID" chip shown in the right column of the card. */
  bookingId: BookingId;
  bookingNumber: string;

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
