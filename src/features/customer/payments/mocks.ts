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
import type { CustomerPaymentListItem } from './types';

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
