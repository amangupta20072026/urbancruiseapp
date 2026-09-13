/**
 * ------------------------------------------------------------------
 * Customer Bookings — mock fixture
 * ------------------------------------------------------------------
 * Seeds the Bookings tab list with one row per status kind so every
 * filter chip has at least one hit during demo. Fixed dates (not
 * derived from now()) so demo screenshots stay stable.
 *
 * DELETE when /customer/bookings ships.
 * ------------------------------------------------------------------
 */

import { asBookingId } from '@app-types/ids';
import type { CustomerBookingListItem } from './types';

export const MOCK_CUSTOMER_BOOKINGS: readonly CustomerBookingListItem[] = [
  {
    id: asBookingId('bk_00123'),
    bookingNumber: 'BK-2026-00123',
    status: 'upcoming',
    from: 'Delhi',
    to: 'Jaipur',
    travelDate: '2026-09-15',
    pickupTime: '09:00 AM',
    passengers: 20,
    vehicleType: 'Tempo Traveller',
    vehicleModel: null,
    seater: 17,
    hasAC: true,
    totalAmount: 18_500,
    bookedDate: '2026-09-10',
    progressStep: 'confirmed',
    progressNote: 'Pending',
  },
  {
    id: asBookingId('bk_00122'),
    bookingNumber: 'BK-2026-00122',
    status: 'ongoing',
    from: 'Gurugram',
    to: 'Agra',
    travelDate: '2026-09-12',
    pickupTime: '07:30 AM',
    passengers: 4,
    vehicleType: 'Sedan',
    vehicleModel: 'Swift Dzire',
    seater: null,
    hasAC: true,
    totalAmount: 4_800,
    bookedDate: '2026-09-08',
    progressStep: 'started',
    progressNote: null,
  },
  {
    id: asBookingId('bk_00110'),
    bookingNumber: 'BK-2026-00110',
    status: 'completed',
    from: 'Mumbai',
    to: 'Pune',
    travelDate: '2026-09-05',
    pickupTime: '08:00 AM',
    passengers: 12,
    vehicleType: 'Urbania',
    vehicleModel: null,
    seater: 12,
    hasAC: true,
    totalAmount: 12_000,
    bookedDate: '2026-09-01',
    progressStep: 'completed',
    progressNote: null,
  },
  {
    id: asBookingId('bk_00098'),
    bookingNumber: 'BK-2026-00098',
    status: 'cancelled',
    from: 'Noida',
    to: 'Rishikesh',
    travelDate: '2026-08-18',
    pickupTime: '06:00 AM',
    passengers: 6,
    vehicleType: 'SUV',
    vehicleModel: 'Innova Crysta',
    seater: null,
    hasAC: true,
    totalAmount: 0,
    bookedDate: '2026-08-15',
    progressStep: 'booked',
    progressNote: 'Cancelled',
  },
];
