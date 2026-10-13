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
  BookingCharge,
  BookingProgressTimeline,
  CustomerBookingDetail,
  CustomerBookingListItem,
} from './types';

export const MOCK_CUSTOMER_BOOKINGS: readonly CustomerBookingListItem[] = [
  {
    // Multi-stop circuit taken from a real quotation (NB 1007) so the
    // horizontally-scrolling itinerary has something long to show.
    id: asBookingId('bk_00125'),
    bookingNumber: 'BK-2026-001250',
    tripNumber: 'TR-2026-562190',
    status: 'upcoming',
    from: 'Mumbai',
    to: 'Mumbai',
    travelDate: '2026-11-09',
    pickupTime: '06:30 AM',
    passengers: 17,
    vehicleType: 'Force Urbania',
    vehicleModel: null,
    seater: 15,
    hasAC: true,
    totalAmount: 30_000,
    bookedDate: '2026-11-01',
    progressStep: 'started',
    progressNote: null,
  },
  {
    // Pickup & Drop: airport → Mysuru hotel on 24 Oct, customer stays
    // in Mysuru without the vehicle, picked up again on 26 Oct.
    id: asBookingId('bk_00124'),
    bookingNumber: 'BK-2026-001242',
    tripNumber: 'TR-2026-649813',
    status: 'upcoming',
    from: 'Bengaluru',
    to: 'Mysuru',
    travelDate: '2026-10-24',
    pickupTime: '10:30 AM',
    passengers: 8,
    vehicleType: 'Tempo Traveller',
    vehicleModel: null,
    seater: 12,
    hasAC: true,
    totalAmount: 6_500,
    bookedDate: '2026-10-12',
    progressStep: 'started',
    progressNote: null,
  },
  {
    id: asBookingId('bk_00123'),
    bookingNumber: 'BK-2026-001234',
    tripNumber: 'TR-2026-735204',
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
    progressStep: 'started',
    progressNote: null,
  },
  {
    id: asBookingId('bk_00122'),
    bookingNumber: 'BK-2026-001223',
    tripNumber: 'TR-2026-418967',
    status: 'ongoing',
    from: 'Gurugram',
    to: 'Agra',
    travelDate: '2026-09-12',
    pickupTime: '07:30 AM',
    passengers: 4,
    vehicleType: 'Force Traveller',
    vehicleModel: 'Force Traveller',
    seater: 13,
    hasAC: true,
    totalAmount: 4_800,
    bookedDate: '2026-09-08',
    progressStep: 'started',
    progressNote: null,
  },
  {
    id: asBookingId('bk_00110'),
    bookingNumber: 'BK-2026-001101',
    tripNumber: 'TR-2026-860531',
    status: 'completed',
    from: 'Mumbai',
    to: 'Pune',
    travelDate: '2026-09-05',
    pickupTime: '08:00 AM',
    passengers: 12,
    vehicleType: 'Force Urbania',
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
    bookingNumber: 'BK-2026-000987',
    tripNumber: 'TR-2026-297648',
    status: 'cancelled',
    from: 'Noida',
    to: 'Rishikesh',
    travelDate: '2026-08-18',
    pickupTime: '06:00 AM',
    passengers: 6,
    vehicleType: 'Force Traveller',
    vehicleModel: 'Force Traveller',
    seater: 26,
    hasAC: true,
    totalAmount: 14_500,
    bookedDate: '2026-08-10',
    progressStep: 'booked',
    progressNote: 'Cancelled',
  },
];

/* ================================================================
 * Per-id detail overrides
 * ================================================================
 * The list fixture above carries every field needed by the list card.
 * The detail screen also renders vehicle plate, assigned driver, the
 * trip's end date + full itinerary, and a per-step timeline of
 * milestone dates. Kept as a separate map
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
  tripType: CustomerBookingDetail['tripType'];
  vehiclePlate: string | null;
  vehicleFuel: string | null;
  passengerBreakdown: CustomerBookingDetail['passengerBreakdown'];
  driver: CustomerBookingDetail['driver'];
  timeline: BookingProgressTimeline;
  payment: CustomerBookingDetail['payment'];
  cancellation: CustomerBookingDetail['cancellation'];
  endDate: CustomerBookingDetail['endDate'];
  itinerary: CustomerBookingDetail['itinerary'];
  returnPickupTime: CustomerBookingDetail['returnPickupTime'];
  fareBreakdown: CustomerBookingDetail['fareBreakdown'];
  liveTracking: CustomerBookingDetail['liveTracking'];
};

const DETAIL_OVERRIDES: Readonly<Record<string, DetailOverride>> = {
  bk_00125: {
    tripType: 'round_trip',
    vehiclePlate: null,
    vehicleFuel: 'Diesel',
    passengerBreakdown: { adults: 15, children: 2 },
    driver: {
      name: 'Suresh Patil',
      avatarUrl: null,
      rating: 4.9,
      tripsCompleted: 412,
      phoneE164: '+919820012345',
    },
    timeline: {
      booked: '01 Nov 2026\n09:24 PM',
      confirmed: '02 Nov 2026\n11:05 AM',
      started: '09 Nov 2026\n06:30 AM',
    },
    payment: { status: 'partial', method: 'UPI' },
    cancellation: null,
    endDate: '2026-11-15',
    itinerary: [
      { city: 'Mumbai', place: 'Chhatrapati Shivaji Maharaj Intl Airport' },
      { city: 'Trimbakeshwar', place: 'Trimbakeshwar Jyotirlinga Temple' },
      { city: 'Nashik', place: 'Panchavati, Nashik' },
      { city: 'Shirdi', place: 'Sai Baba Temple, Shirdi' },
      { city: 'Shani Shingnapur', place: 'Shani Shingnapur Temple' },
      { city: 'Aurangabad', place: 'Ellora Caves, Aurangabad' },
      { city: 'Mumbai', place: 'Chhatrapati Shivaji Maharaj Intl Airport' },
    ],
    returnPickupTime: null,
    fareBreakdown: {
      advancePaid: 7_500,
      advancePercent: 25,
      remainingAmount: 22_500,
      remainingNote: 'Pay Later',
    },
    liveTracking: null,
  },
  bk_00124: {
    tripType: 'pickup_drop',
    vehiclePlate: null,
    vehicleFuel: 'Diesel',
    passengerBreakdown: { adults: 8, children: 0 },
    // No driver yet — shows the "assigned closer to your trip date" state.
    driver: null,
    timeline: {
      booked: '12 Oct 2026\n07:45 PM',
      confirmed: '13 Oct 2026\n09:10 AM',
      started: '24 Oct 2026\n10:30 AM',
    },
    payment: { status: 'partial', method: 'UPI' },
    cancellation: null,
    endDate: '2026-10-26',
    itinerary: [
      {
        city: 'Bengaluru',
        place: 'Kempegowda International Airport, Bengaluru',
      },
      { city: 'Mysuru', place: 'Radisson Blu Plaza Hotel, Mysuru', stay: true },
      {
        city: 'Bengaluru',
        place: 'Kempegowda International Airport, Bengaluru',
      },
    ],
    returnPickupTime: '04:00 PM',
    fareBreakdown: {
      advancePaid: 1_625,
      advancePercent: 25,
      remainingAmount: 4_875,
      remainingNote: 'Pay Later',
    },
    liveTracking: null,
  },
  bk_00123: {
    tripType: 'one_way',
    vehiclePlate: null,
    vehicleFuel: 'Diesel',
    passengerBreakdown: { adults: 18, children: 2 },
    driver: {
      name: 'Rajesh Kumar',
      avatarUrl: null,
      rating: 4.8,
      tripsCompleted: 320,
      phoneE164: '+919812345678',
    },
    timeline: {
      booked: '10 Sept 2026\n04:12 PM',
      confirmed: '11 Sept 2026\n10:30 AM',
      started: '15 Sept 2026\n09:00 AM',
    },
    payment: { status: 'partial', method: 'UPI' },
    cancellation: null,
    endDate: '2026-09-17',
    itinerary: [
      { city: 'Delhi', place: 'Indira Gandhi International Airport, Delhi' },
      { city: 'Agra', place: 'Agra Fort, Agra' },
      { city: 'Jaipur', place: 'Jaipur Railway Station, Jaipur' },
    ],
    returnPickupTime: null,
    fareBreakdown: {
      advancePaid: 4_625,
      advancePercent: 25,
      remainingAmount: 13_875,
      remainingNote: 'Pay Later',
    },
    liveTracking: null,
  },
  bk_00122: {
    tripType: 'round_trip',
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
    timeline: {
      booked: '08 Sept 2026\n06:40 PM',
      confirmed: '09 Sept 2026\n12:15 PM',
      started: '12 Sept 2026\n07:30 AM',
    },
    payment: { status: 'paid', method: 'Card' },
    cancellation: null,
    endDate: '2026-09-12',
    itinerary: [
      { city: 'Gurugram', place: 'Sector 29, Gurugram' },
      { city: 'Agra', place: 'Taj East Gate, Agra' },
      { city: 'Gurugram', place: 'Sector 29, Gurugram' },
    ],
    returnPickupTime: null,
    fareBreakdown: null,
    liveTracking: {
      etaLabel: '12:45 PM',
      remainingLabel: '2h 15m remaining',
      routeSummary: 'En route to Agra',
    },
  },
  bk_00110: {
    tripType: 'round_trip',
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
      booked: '01 Sept 2026\n05:20 PM',
      confirmed: '02 Sept 2026\n10:45 AM',
      started: '05 Sept 2026\n08:00 AM',
      completed: '05 Sept 2026\n06:30 PM',
    },
    payment: { status: 'paid', method: 'UPI' },
    cancellation: null,
    endDate: '2026-09-05',
    itinerary: [
      { city: 'Mumbai', place: 'Bandra Kurla Complex, Mumbai' },
      { city: 'Pune', place: 'Shivajinagar, Pune' },
      { city: 'Mumbai', place: 'Bandra Kurla Complex, Mumbai' },
    ],
    returnPickupTime: null,
    fareBreakdown: null,
    liveTracking: null,
  },
  bk_00098: {
    tripType: 'pickup_drop',
    vehiclePlate: null,
    vehicleFuel: null,
    passengerBreakdown: { adults: 4, children: 2 },
    driver: null,
    timeline: { booked: '10 Aug 2026\n08:05 PM' },
    payment: { status: 'paid', method: 'Cash' },
    cancellation: {
      cancelledAt: '2026-08-12T14:15:00+05:30',
      reason: 'Change of plans',
      cancelledBy: 'You',
      refundAmount: 0,
      refundNote: 'No refund applicable',
    },
    endDate: '2026-08-20',
    itinerary: [
      { city: 'Noida', place: 'Sector 62, Noida' },
      { city: 'Rishikesh', place: 'Laxman Jhula, Rishikesh', stay: true },
      { city: 'Noida', place: 'Sector 62, Noida' },
    ],
    returnPickupTime: '05:00 PM',
    fareBreakdown: null,
    liveTracking: null,
  },
};

/* ================================================================
 * Notes + Other Charges (static for now)
 * ================================================================
 * Shown on the upcoming-booking detail screen after Fare Details.
 * The real values will come from the backend per booking (they vary
 * by state, route and vehicle); until then every booking gets this
 * one standard set, worded from the quotation sheet.
 * TODO(api): take `notes` / `otherCharges` from /customer/bookings/:id.
 * ================================================================ */

const STANDARD_NOTES: readonly string[] = [
  'Pricing includes vehicle cost, fuel cost, driver and local tax.',
  'KM will be counted from pickup point to pickup point.',
  'A/C will be switched off intermittently on hills.',
  'Visits to local city places are not included in the cost.',
  'Restricted places — the vehicle may not go to some places on hills due to local govt. restrictions, difficult terrain or narrow roads.',
];

const STANDARD_OTHER_CHARGES: readonly BookingCharge[] = [
  {
    label: 'Toll Charges',
    status: 'included',
    detail: 'Already included in the cost.',
    rates: [],
  },
  {
    label: 'State Tax (Karnataka)',
    status: 'not_included',
    detail: 'Client will pay to driver.',
    rates: [],
  },
  {
    label: 'Parking & Police Entry',
    status: 'not_included',
    detail: 'Client will pay to driver.',
    rates: [],
  },
  {
    label: 'Extra Charge above 1800 km',
    status: 'extra',
    detail: null,
    rates: ['₹20/km (Option 1–3)', '₹26/km (Option 4)', '₹40/km (Option 5)'],
  },
  {
    label: 'Extra Charge (Local)',
    status: 'extra',
    detail: null,
    rates: ['₹20/km', '₹150/hr'],
  },
  {
    label: 'Driver Night Charge',
    status: 'not_included',
    detail: 'Client will pay to driver.',
    rates: [
      'Before 6 AM (1st day) & after 11 PM (last day): ₹500',
      'After 1 AM: ₹500/hr',
      'After 3 AM: next day charge',
    ],
  },
];

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
    tripType: 'one_way',
    vehiclePlate: null,
    vehicleFuel: null,
    passengerBreakdown: null,
    driver: null,
    timeline: {},
    payment: null,
    cancellation: null,
    endDate: base.travelDate,
    itinerary: [
      { city: base.from, place: null },
      { city: base.to, place: null },
    ],
    returnPickupTime: null,
    fareBreakdown: null,
    liveTracking: null,
  };
  return {
    ...base,
    notes: STANDARD_NOTES,
    otherCharges: STANDARD_OTHER_CHARGES,
    ...extra,
  };
}