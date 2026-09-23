/**
 * ------------------------------------------------------------------
 * Customer Payments — mock fixture
 * ------------------------------------------------------------------
 * Seeds the Payments tab list. Six rows so each filter chip has
 * multiple hits and the list scrolls a little in demo. Fixed dates
 * (not `new Date()` derived) so demo screenshots stay stable.
 *
 * DELETE when /customer/payments ships.
 * ------------------------------------------------------------------
 */

import { asBookingId, asPaymentId } from '@app-types/ids';
import type { CustomerPaymentDetail, CustomerPaymentListItem } from './types';

export const MOCK_CUSTOMER_PAYMENTS: readonly CustomerPaymentListItem[] = [
  {
    id: asPaymentId('pay_00123_1'),
    bookingId: asBookingId('bk_00123'),
    bookingNumber: 'BK-2026-00123',
    status: 'paid',
    from: 'Delhi',
    to: 'Jaipur',
    travelDate: '2026-09-15',
    pickupTime: '09:12 AM',
    vehicleType: 'Tempo Traveller',
    passengers: 20,
    amount: 18_500,
  },
  {
    id: asPaymentId('pay_00122_1'),
    bookingId: asBookingId('bk_00122'),
    bookingNumber: 'BK-2026-00122',
    status: 'pending',
    from: 'Gurugram',
    to: 'Agra',
    travelDate: '2026-09-12',
    pickupTime: '07:28 AM',
    vehicleType: 'Sedan',
    passengers: 4,
    amount: 4_800,
  },
  {
    id: asPaymentId('pay_00110_1'),
    bookingId: asBookingId('bk_00110'),
    bookingNumber: 'BK-2026-00110',
    status: 'paid',
    from: 'Mumbai',
    to: 'Pune',
    travelDate: '2026-09-05',
    pickupTime: '08:05 AM',
    vehicleType: 'Urbania',
    passengers: 12,
    amount: 12_000,
  },
  {
    id: asPaymentId('pay_00098_1'),
    bookingId: asBookingId('bk_00098'),
    bookingNumber: 'BK-2026-00098',
    status: 'failed',
    from: 'Noida',
    to: 'Rishikesh',
    travelDate: '2026-08-18',
    pickupTime: '06:15 AM',
    vehicleType: 'SUV',
    passengers: 6,
    amount: 8_500,
  },
  {
    id: asPaymentId('pay_00087_1'),
    bookingId: asBookingId('bk_00087'),
    bookingNumber: 'BK-2026-00087',
    status: 'paid',
    from: 'Delhi',
    to: 'Manali',
    travelDate: '2026-08-02',
    pickupTime: '10:20 AM',
    vehicleType: 'Tempo Traveller',
    passengers: 16,
    amount: 15_000,
  },
  {
    id: asPaymentId('pay_00076_1'),
    bookingId: asBookingId('bk_00076'),
    bookingNumber: 'BK-2026-00076',
    status: 'paid',
    from: 'Bengaluru',
    to: 'Chennai',
    travelDate: '2026-07-20',
    pickupTime: '05:45 AM',
    vehicleType: 'Mini Bus',
    passengers: 10,
    amount: 9_200,
  },
];

/**
 * ------------------------------------------------------------------
 * Detail fixture
 * ------------------------------------------------------------------
 * One `CustomerPaymentDetail` per row in `MOCK_CUSTOMER_PAYMENTS`.
 * Keyed by PaymentId (the raw string) so the lookup helper below
 * can find a row from a route param without extra plumbing.
 *
 * Timestamps are fixed (not `new Date()` derived) so demo
 * screenshots stay stable. Each variant covers the invariants
 * documented on `CustomerPaymentDetail`:
 *   - paid    → method + txn + paid-on all set
 *   - pending → method + txn null, paymentEventAt is due-since
 *   - failed  → method + txn set (the attempted instrument),
 *               paymentEventAt is attempted-on, failureReason set
 * ------------------------------------------------------------------
 */
const MOCK_PAYMENT_DETAILS: readonly CustomerPaymentDetail[] = [
  {
    id: asPaymentId('pay_00123_1'),
    bookingId: asBookingId('bk_00123'),
    bookingNumber: 'BK-2026-00123',
    status: 'paid',
    from: 'Delhi',
    to: 'Jaipur',
    travelDate: '2026-09-15',
    pickupTime: '09:12 AM',
    vehicleType: 'Tempo Traveller',
    passengers: 20,
    amount: 18_500,
    bookingConfirmedAt: '2026-09-14T10:00:00+05:30',
    tripCompletedAt: '2026-09-15T19:30:00+05:30',
    paymentEventAt: '2026-09-15T09:15:00+05:30',
    paymentMethod: 'UPI (Google Pay)',
    transactionId: 'UC20260915094512',
  },
  {
    id: asPaymentId('pay_00122_1'),
    bookingId: asBookingId('bk_00122'),
    bookingNumber: 'BK-2026-00122',
    status: 'pending',
    from: 'Gurugram',
    to: 'Agra',
    travelDate: '2026-09-12',
    pickupTime: '07:28 AM',
    vehicleType: 'Sedan',
    passengers: 4,
    amount: 4_800,
    bookingConfirmedAt: '2026-09-11T09:00:00+05:30',
    tripCompletedAt: '2026-09-12T19:10:00+05:30',
    paymentEventAt: '2026-09-12T19:28:00+05:30',
    paymentMethod: null,
    transactionId: null,
  },
  {
    id: asPaymentId('pay_00110_1'),
    bookingId: asBookingId('bk_00110'),
    bookingNumber: 'BK-2026-00110',
    status: 'paid',
    from: 'Mumbai',
    to: 'Pune',
    travelDate: '2026-09-05',
    pickupTime: '08:05 AM',
    vehicleType: 'Urbania',
    passengers: 12,
    amount: 12_000,
    bookingConfirmedAt: '2026-09-04T14:20:00+05:30',
    tripCompletedAt: '2026-09-05T14:30:00+05:30',
    paymentEventAt: '2026-09-05T14:45:00+05:30',
    paymentMethod: 'UPI (PhonePe)',
    transactionId: 'UC20260905144533',
  },
  {
    id: asPaymentId('pay_00098_1'),
    bookingId: asBookingId('bk_00098'),
    bookingNumber: 'BK-2026-00098',
    status: 'failed',
    from: 'Noida',
    to: 'Rishikesh',
    travelDate: '2026-08-18',
    pickupTime: '06:15 AM',
    vehicleType: 'SUV',
    passengers: 6,
    amount: 8_500,
    bookingConfirmedAt: '2026-08-17T10:00:00+05:30',
    tripCompletedAt: '2026-08-18T17:30:00+05:30',
    paymentEventAt: '2026-08-18T18:20:00+05:30',
    paymentMethod: 'UPI (PhonePe)',
    transactionId: 'UPI/20260818062145',
    failureReason:
      'Your payment could not be completed due to a technical issue with the payment provider. No amount has been deducted from your account. You can contact our support team if you need further assistance.',
  },
  {
    id: asPaymentId('pay_00087_1'),
    bookingId: asBookingId('bk_00087'),
    bookingNumber: 'BK-2026-00087',
    status: 'paid',
    from: 'Delhi',
    to: 'Manali',
    travelDate: '2026-08-02',
    pickupTime: '10:20 AM',
    vehicleType: 'Tempo Traveller',
    passengers: 16,
    amount: 15_000,
    bookingConfirmedAt: '2026-08-01T09:00:00+05:30',
    tripCompletedAt: '2026-08-02T21:00:00+05:30',
    paymentEventAt: '2026-08-02T21:12:00+05:30',
    paymentMethod: 'UPI (Google Pay)',
    transactionId: 'UC20260802211201',
  },
  {
    id: asPaymentId('pay_00076_1'),
    bookingId: asBookingId('bk_00076'),
    bookingNumber: 'BK-2026-00076',
    status: 'paid',
    from: 'Bengaluru',
    to: 'Chennai',
    travelDate: '2026-07-20',
    pickupTime: '05:45 AM',
    vehicleType: 'Mini Bus',
    passengers: 10,
    amount: 9_200,
    bookingConfirmedAt: '2026-07-19T18:00:00+05:30',
    tripCompletedAt: '2026-07-20T15:30:00+05:30',
    paymentEventAt: '2026-07-20T15:42:00+05:30',
    paymentMethod: 'UPI (PhonePe)',
    transactionId: 'UC20260720154201',
  },
];

/**
 * Lookup helper used by PaymentDetailSheet when the route lands
 * with a `paymentId`. Returns `null` for an unknown id so the
 * screen can render an inline "not found" state (stale deeplink,
 * cleared history) instead of crashing.
 *
 * Swap for `useQuery({ queryKey: queryKeys.customer.payments.detail(id) })`
 * once the /customer/payments/:id endpoint ships.
 */
export function getCustomerPaymentDetail(
  id: string,
): CustomerPaymentDetail | null {
  return MOCK_PAYMENT_DETAILS.find(p => p.id === id) ?? null;
}
