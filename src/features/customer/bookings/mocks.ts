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
import type { BookingId } from '@app-types/ids';
import type {
  BookingProgressTimeline,
  CustomerBookingDetail,
  CustomerBookingListItem,
} from './types';

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

/* ================================================================
 * Per-id detail overrides
 * ================================================================
 * The list fixture above carries every field needed by the list card.
 * The detail screen also renders vehicle plate, assigned driver, and
 * a per-step timeline of milestone dates. Kept as a separate map
 * (rather than inflating the list fixture) so the list stays cheap
 * and the extra fields are only present where they'd actually be
 * populated on the backend.
 *
 * Any booking id absent from this map still resolves — the lookup
 * falls back to nulls for the extra fields, mirroring the shape the
 * server would return for a booking that hasn't reached the relevant
 * lifecycle step yet.
 * ================================================================ */

type DetailOverride = {
  vehiclePlate: string | null;
  vehicleFuel: string | null;
  passengerBreakdown: CustomerBookingDetail['passengerBreakdown'];
  driver: CustomerBookingDetail['driver'];
  timeline: BookingProgressTimeline;
  payment: CustomerBookingDetail['payment'];
};

const DETAIL_OVERRIDES: Readonly<Record<string, DetailOverride>> = {
  bk_00123: {
    vehiclePlate: null,
    vehicleFuel: 'Diesel',
    passengerBreakdown: { adults: 18, children: 2 },
    driver: null,
    timeline: { booked: '10 Sep' },
    payment: { status: 'partial', method: 'UPI' },
  },
  bk_00122: {
    vehiclePlate: 'DL 3C AB 7788',
    vehicleFuel: 'Petrol',
    passengerBreakdown: { adults: 4, children: 0 },
    driver: {
      name: 'Rohit Verma',
      avatarUrl: null,
      rating: 4.7,
      tripsCompleted: 210,
      phoneE164: '+919000012345',
    },
    timeline: { booked: '08 Sep', confirmed: '09 Sep', started: '12 Sep' },
    payment: { status: 'paid', method: 'Card' },
  },
  bk_00110: {
    vehiclePlate: 'MH 12 AB 4321',
    vehicleFuel: 'Diesel',
    passengerBreakdown: { adults: 10, children: 2 },
    driver: {
      name: 'Amit Sharma',
      avatarUrl: null,
      rating: 4.8,
      tripsCompleted: 320,
      phoneE164: '+918655664746',
    },
    timeline: {
      booked: '01 Sept',
      confirmed: '02 Sept',
      started: '05 Sept\n08:00 AM',
      completed: '05 Sept\n06:30 PM',
    },
    payment: { status: 'paid', method: 'UPI' },
  },
  bk_00098: {
    vehiclePlate: null,
    vehicleFuel: null,
    passengerBreakdown: { adults: 6, children: 0 },
    driver: null,
    timeline: { booked: '15 Aug' },
    payment: null,
  },
};

/**
 * O(1) detail lookup by id. Returns `null` when the id isn't in the
 * fixture (e.g. a stale deep-link) so the screen can render a proper
 * not-found state instead of crashing. Composes the list-item shape
 * with the per-id detail overrides; unknown overrides fall back to
 * nulls so upstream code can rely on the shape being stable.
 */
export function getCustomerBookingDetail(
  id: BookingId,
): CustomerBookingDetail | null {
  const base = MOCK_CUSTOMER_BOOKINGS.find(b => b.id === id);
  if (!base) return null;
  const extra: DetailOverride = DETAIL_OVERRIDES[id as unknown as string] ?? {
    vehiclePlate: null,
    vehicleFuel: null,
    passengerBreakdown: null,
    driver: null,
    timeline: {},
    payment: null,
  };
  return { ...base, ...extra };
}
