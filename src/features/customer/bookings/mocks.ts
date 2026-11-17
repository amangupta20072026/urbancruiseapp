/**
 * ------------------------------------------------------------------
 * Customer Bookings — mock fixture
 * ------------------------------------------------------------------
 * Seeds the Bookings tab list with one row per status kind so every
 * filter chip has at least one hit during demo. Fixed dates (not
 * derived from now()) so demo screenshots stay stable.
 *
 * Each booking holds one or more trips. Three bookings here have more
 * than one trip so the "View All Trips" flow can be demoed:
 * BK-2026-001250 (2 trips), BK-2026-001268 (4 trips, first one
 * ongoing) and BK-2026-001215 (3 trips, each a different status).
 *
 * DELETE when /customer/bookings ships.
 * ------------------------------------------------------------------
 */

import { asBookingId, asTripId } from '@app-types/ids';
import type { BookingId, TripId } from '@app-types/ids';
import type { TripCharge } from '@shared/components/TripCharges';
import { pickViaCity } from './utils/route';
import { isoDayToUtc } from './utils/tripDates';
import type {
  BookingProgressTimeline,
  BookingVehicleOption,
  CustomerBookingDetail,
  CustomerBookingListItem,
  CustomerBookingTrip,
} from './types';

/** A booking as the backend will send it: booking fields + its trips. */
type MockBooking = Omit<CustomerBookingListItem, keyof CustomerBookingTrip>;

/** List row = booking + its FIRST trip's fields at the top level. */
function toListItem(b: MockBooking): CustomerBookingListItem {
  const first = b.trips[0];
  if (!first) throw new Error(`[bookings/mocks] ${b.bookingNumber}: no trips`);
  return { ...first, ...b };
}

const MOCK_BOOKINGS: readonly MockBooking[] = [
  {
    // Two trips in one booking. Trip 1 is the multi-stop circuit taken
    // from a real quotation (NB 1007), so the horizontally-scrolling
    // itinerary has something long to show.
    id: asBookingId('bk_00125'),
    bookingNumber: 'BK-2026-001250',
    totalAmount: 30_000,
    bookedDate: '2026-11-01',
    trips: [
      {
        tripId: asTripId('bk_00125_t1'),
        tripNumber: 'TR-2026-562190',
        status: 'upcoming',
        tripType: 'round_trip',
        from: 'Mumbai',
        to: 'Mumbai',
        travelDate: '2026-11-09',
        endDate: '2026-11-15',
        viaCity: 'Trimbakeshwar',
        pickupTime: '06:30 AM',
        passengers: 17,
        vehicleType: 'Force Urbania',
        vehicleModel: null,
        seater: 15,
        hasAC: true,
        progressStep: 'started',
        progressNote: null,
      },
      {
        tripId: asTripId('bk_00125_t2'),
        tripNumber: 'TR-2026-562231',
        status: 'upcoming',
        tripType: 'one_way',
        from: 'Mumbai',
        to: 'Pune',
        travelDate: '2026-11-18',
        endDate: '2026-11-18',
        viaCity: null,
        pickupTime: '08:00 AM',
        passengers: 17,
        vehicleType: 'Tempo Traveller',
        vehicleModel: null,
        seater: 17,
        hasAC: true,
        progressStep: 'started',
        progressNote: null,
      },
    ],
  },
  {
    // Pickup & Drop: airport → Mysuru hotel on 24 Oct, customer stays
    // in Mysuru without the vehicle, picked up again on 26 Oct.
    id: asBookingId('bk_00124'),
    bookingNumber: 'BK-2026-001242',
    totalAmount: 6_500,
    bookedDate: '2026-10-12',
    trips: [
      {
        tripId: asTripId('bk_00124_t1'),
        tripNumber: 'TR-2026-649813',
        status: 'upcoming',
        tripType: 'pickup_drop',
        from: 'Bengaluru',
        to: 'Bengaluru',
        travelDate: '2026-10-24',
        endDate: '2026-10-26',
        viaCity: 'Mysuru',
        pickupTime: '10:30 AM',
        passengers: 8,
        vehicleType: 'Tempo Traveller',
        vehicleModel: null,
        seater: 12,
        hasAC: true,
        progressStep: 'started',
        progressNote: null,
      },
    ],
  },
  {
    id: asBookingId('bk_00123'),
    bookingNumber: 'BK-2026-001234',
    totalAmount: 18_500,
    bookedDate: '2026-09-10',
    trips: [
      {
        tripId: asTripId('bk_00123_t1'),
        tripNumber: 'TR-2026-735204',
        status: 'upcoming',
        tripType: 'one_way',
        from: 'Delhi',
        to: 'Jaipur',
        travelDate: '2026-09-15',
        endDate: '2026-09-17',
        viaCity: null,
        pickupTime: '09:00 AM',
        passengers: 20,
        vehicleType: 'Tempo Traveller',
        vehicleModel: null,
        seater: 17,
        hasAC: true,
        progressStep: 'started',
        progressNote: null,
      },
    ],
  },
  {
    id: asBookingId('bk_00122'),
    bookingNumber: 'BK-2026-001223',
    totalAmount: 4_800,
    bookedDate: '2026-09-08',
    trips: [
      {
        tripId: asTripId('bk_00122_t1'),
        tripNumber: 'TR-2026-418967',
        status: 'ongoing',
        tripType: 'round_trip',
        from: 'Gurugram',
        to: 'Gurugram',
        travelDate: '2026-09-12',
        endDate: '2026-09-12',
        viaCity: 'Mathura',
        pickupTime: '07:30 AM',
        passengers: 4,
        vehicleType: 'Force Traveller',
        vehicleModel: 'Force Traveller',
        seater: 13,
        hasAC: true,
        progressStep: 'started',
        progressNote: null,
      },
    ],
  },
  {
    // Four trips; the card follows trip 1 (ongoing) and shows
    // "+3 more trips". Trips 2–4 are still to come.
    id: asBookingId('bk_00126'),
    bookingNumber: 'BK-2026-001268',
    totalAmount: 26_400,
    bookedDate: '2026-09-05',
    trips: [
      {
        tripId: asTripId('bk_00126_t1'),
        tripNumber: 'TR-2026-524816',
        status: 'ongoing',
        tripType: 'one_way',
        from: 'Gurugram',
        to: 'Jaipur',
        travelDate: '2026-09-12',
        endDate: '2026-09-12',
        viaCity: null,
        pickupTime: '06:30 AM',
        passengers: 6,
        vehicleType: 'Tempo Traveller',
        vehicleModel: null,
        seater: 12,
        hasAC: true,
        progressStep: 'started',
        progressNote: null,
      },
      {
        tripId: asTripId('bk_00126_t2'),
        tripNumber: 'TR-2026-524843',
        status: 'upcoming',
        tripType: 'round_trip',
        from: 'Jaipur',
        to: 'Jaipur',
        travelDate: '2026-09-13',
        endDate: '2026-09-13',
        viaCity: 'Amer',
        pickupTime: '09:00 AM',
        passengers: 6,
        vehicleType: 'Tempo Traveller',
        vehicleModel: null,
        seater: 12,
        hasAC: true,
        progressStep: 'started',
        progressNote: null,
      },
      {
        tripId: asTripId('bk_00126_t3'),
        tripNumber: 'TR-2026-524870',
        status: 'upcoming',
        tripType: 'pickup_drop',
        from: 'Jaipur',
        to: 'Jaipur',
        travelDate: '2026-09-15',
        endDate: '2026-09-17',
        viaCity: 'Ajmer',
        pickupTime: '08:00 AM',
        passengers: 6,
        vehicleType: 'Tempo Traveller',
        vehicleModel: null,
        seater: 12,
        hasAC: true,
        progressStep: 'started',
        progressNote: null,
      },
      {
        tripId: asTripId('bk_00126_t4'),
        tripNumber: 'TR-2026-524897',
        status: 'upcoming',
        tripType: 'one_way',
        from: 'Jaipur',
        to: 'Gurugram',
        travelDate: '2026-09-18',
        endDate: '2026-09-18',
        viaCity: null,
        pickupTime: '07:00 AM',
        passengers: 6,
        vehicleType: 'Tempo Traveller',
        vehicleModel: null,
        seater: 12,
        hasAC: true,
        progressStep: 'started',
        progressNote: null,
      },
    ],
  },
  {
    // Three trips, three statuses: the card follows trip 1
    // (completed); trips 2 and 3 show their own status on the trips
    // list.
    id: asBookingId('bk_00121'),
    bookingNumber: 'BK-2026-001215',
    totalAmount: 21_400,
    bookedDate: '2026-09-02',
    trips: [
      {
        tripId: asTripId('bk_00121_t1'),
        tripNumber: 'TR-2026-381045',
        status: 'completed',
        tripType: 'round_trip',
        from: 'Delhi',
        to: 'Delhi',
        travelDate: '2026-09-06',
        endDate: '2026-09-06',
        viaCity: 'Mathura',
        pickupTime: '06:00 AM',
        passengers: 10,
        vehicleType: 'Tempo Traveller',
        vehicleModel: null,
        seater: 12,
        hasAC: true,
        progressStep: 'completed',
        progressNote: null,
      },
      {
        tripId: asTripId('bk_00121_t2'),
        tripNumber: 'TR-2026-381072',
        status: 'ongoing',
        tripType: 'one_way',
        from: 'Delhi',
        to: 'Jaipur',
        travelDate: '2026-09-12',
        endDate: '2026-09-12',
        viaCity: null,
        pickupTime: '07:00 AM',
        passengers: 10,
        vehicleType: 'Tempo Traveller',
        vehicleModel: null,
        seater: 12,
        hasAC: true,
        progressStep: 'started',
        progressNote: null,
      },
      {
        tripId: asTripId('bk_00121_t3'),
        tripNumber: 'TR-2026-381098',
        status: 'upcoming',
        tripType: 'pickup_drop',
        from: 'Jaipur',
        to: 'Jaipur',
        travelDate: '2026-09-20',
        endDate: '2026-09-22',
        viaCity: 'Udaipur',
        pickupTime: '09:30 AM',
        passengers: 10,
        vehicleType: 'Force Traveller',
        vehicleModel: 'Force Traveller',
        seater: 13,
        hasAC: true,
        progressStep: 'started',
        progressNote: null,
      },
    ],
  },
  {
    id: asBookingId('bk_00110'),
    bookingNumber: 'BK-2026-001101',
    totalAmount: 12_000,
    bookedDate: '2026-09-01',
    trips: [
      {
        tripId: asTripId('bk_00110_t1'),
        tripNumber: 'TR-2026-860531',
        status: 'completed',
        tripType: 'round_trip',
        from: 'Mumbai',
        to: 'Mumbai',
        travelDate: '2026-09-05',
        endDate: '2026-09-05',
        viaCity: 'Lonavala',
        pickupTime: '08:00 AM',
        passengers: 12,
        vehicleType: 'Force Urbania',
        vehicleModel: null,
        seater: 12,
        hasAC: true,
        progressStep: 'completed',
        progressNote: null,
      },
    ],
  },
  {
    id: asBookingId('bk_00098'),
    bookingNumber: 'BK-2026-000987',
    totalAmount: 14_500,
    bookedDate: '2026-08-10',
    trips: [
      {
        tripId: asTripId('bk_00098_t1'),
        tripNumber: 'TR-2026-297648',
        status: 'cancelled',
        tripType: 'pickup_drop',
        from: 'Noida',
        to: 'Noida',
        travelDate: '2026-08-18',
        endDate: '2026-08-20',
        viaCity: 'Rishikesh',
        pickupTime: '06:00 AM',
        passengers: 6,
        vehicleType: 'Force Traveller',
        vehicleModel: 'Force Traveller',
        seater: 26,
        hasAC: true,
        progressStep: 'booked',
        progressNote: 'Cancelled',
      },
    ],
  },
];

export const MOCK_CUSTOMER_BOOKINGS: readonly CustomerBookingListItem[] =
  MOCK_BOOKINGS.map(toListItem);

/** One booking (list-row shape, with all its trips), or null. */
export function getCustomerBooking(
  id: BookingId,
): CustomerBookingListItem | null {
  return MOCK_CUSTOMER_BOOKINGS.find(b => b.id === id) ?? null;
}

/* ================================================================
 * Per-trip detail overrides
 * ================================================================
 * The list fixture above carries every field needed by the list card.
 * The detail screen also renders vehicle plate, assigned driver, the
 * trip's end date + full itinerary, and a per-step timeline of
 * milestone dates — all per TRIP, keyed by trip id. Kept as a separate
 * map (rather than inflating the list fixture) so the list stays cheap
 * and the extra fields are only present where they'd actually be
 * populated on the backend.
 *
 * Money (payment summary, advance / remaining split) belongs to the
 * BOOKING, not a trip, so it lives in BOOKING_MONEY below.
 *
 * Any trip id absent from this map still resolves — the lookup falls
 * back to nulls for the extra fields, mirroring the shape the server
 * would return for a trip that hasn't reached the relevant lifecycle
 * step yet.
 * ================================================================ */

type DetailOverride = {
  vehiclePlate: string | null;
  vehicleFuel: string | null;
  passengerBreakdown: CustomerBookingDetail['passengerBreakdown'];
  driver: CustomerBookingDetail['driver'];
  timeline: BookingProgressTimeline;
  cancellation: CustomerBookingDetail['cancellation'];
  itinerary: CustomerBookingDetail['itinerary'];
  returnPickupTime: CustomerBookingDetail['returnPickupTime'];
  vehicleOption: CustomerBookingDetail['vehicleOption'];
  liveTracking: CustomerBookingDetail['liveTracking'];
};

type BookingMoney = {
  payment: CustomerBookingDetail['payment'];
  fareBreakdown: CustomerBookingDetail['fareBreakdown'];
};

/** Per-trip detail fields, keyed by trip id. */
const DETAIL_OVERRIDES: Readonly<Record<string, DetailOverride>> = {
  bk_00125_t1: {
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
    cancellation: null,
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
    vehicleOption: { number: 6, tier: 'Royal VIP' },
    liveTracking: null,
  },
  bk_00124_t1: {
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
    cancellation: null,
    itinerary: [
      {
        city: 'Bengaluru',
        place: 'Kempegowda International Airport, Bengaluru',
      },
      { city: 'Ramanagara', place: 'Ramanagara Silk Cocoon Market' },
      { city: 'Channapatna', place: 'Channapatna Toy Town' },
      { city: 'Srirangapatna', place: 'Ranganathaswamy Temple' },
      { city: 'Mysuru', place: 'Radisson Blu Plaza Hotel, Mysuru', stay: true },
      {
        city: 'Bengaluru',
        place: 'Kempegowda International Airport, Bengaluru',
      },
    ],
    returnPickupTime: '04:00 PM',
    vehicleOption: { number: 2, tier: 'Premium' },
    liveTracking: null,
  },
  bk_00123_t1: {
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
    cancellation: null,
    itinerary: [
      { city: 'Delhi', place: 'Indira Gandhi International Airport, Delhi' },
      { city: 'Agra', place: 'Agra Fort, Agra' },
      { city: 'Jaipur', place: 'Jaipur Railway Station, Jaipur' },
    ],
    returnPickupTime: null,
    vehicleOption: { number: 4, tier: 'Royal' },
    liveTracking: null,
  },
  bk_00122_t1: {
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
    cancellation: null,
    itinerary: [
      { city: 'Gurugram', place: 'Sector 29, Gurugram' },
      { city: 'Mathura', place: 'Shri Krishna Janmabhoomi, Mathura' },
      { city: 'Agra', place: 'Taj East Gate, Agra' },
      { city: 'Fatehpur Sikri', place: 'Buland Darwaza, Fatehpur Sikri' },
      { city: 'Gurugram', place: 'Sector 29, Gurugram' },
    ],
    returnPickupTime: null,
    vehicleOption: { number: 1, tier: 'Economy' },
    liveTracking: {
      etaLabel: '12:45 PM',
      remainingLabel: '2h 15m remaining',
      routeSummary: 'En route to Agra',
    },
  },
  bk_00110_t1: {
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
    cancellation: null,
    itinerary: [
      { city: 'Mumbai', place: 'Bandra Kurla Complex, Mumbai' },
      { city: 'Lonavala', place: 'Bhushi Dam, Lonavala' },
      { city: 'Pune', place: 'Shivajinagar, Pune' },
      { city: 'Khandala', place: 'Karla Caves, Khandala' },
      { city: 'Mumbai', place: 'Bandra Kurla Complex, Mumbai' },
    ],
    returnPickupTime: null,
    vehicleOption: { number: 3, tier: 'Royal' },
    liveTracking: null,
  },
  bk_00098_t1: {
    vehiclePlate: null,
    vehicleFuel: null,
    passengerBreakdown: { adults: 4, children: 2 },
    driver: null,
    timeline: { booked: '10 Aug 2026\n08:05 PM' },
    cancellation: {
      cancelledAt: '2026-08-12T14:15:00+05:30',
      reason: 'Change of plans',
      cancelledBy: 'You',
      refundAmount: 0,
      refundNote: 'No refund applicable',
    },
    itinerary: [
      { city: 'Noida', place: 'Sector 62, Noida' },
      { city: 'Meerut', place: "St. John's Church, Meerut" },
      { city: 'Haridwar', place: 'Har Ki Pauri, Haridwar' },
      { city: 'Rishikesh', place: 'Laxman Jhula, Rishikesh', stay: true },
      { city: 'Noida', place: 'Sector 62, Noida' },
    ],
    returnPickupTime: '05:00 PM',
    vehicleOption: { number: 5, tier: 'Royal VIP' },
    liveTracking: null,
  },
  bk_00126_t1: {
    vehiclePlate: 'HR 26 DK 3390',
    vehicleFuel: 'Diesel',
    passengerBreakdown: { adults: 5, children: 1 },
    driver: {
      name: 'Vikram Singh',
      avatarUrl: null,
      rating: 4.8,
      tripsCompleted: 276,
      phoneE164: '+919876501234',
    },
    timeline: {
      booked: '05 Sept 2026\n11:20 AM',
      confirmed: '06 Sept 2026\n10:05 AM',
      started: '12 Sept 2026\n06:30 AM',
    },
    cancellation: null,
    itinerary: [
      { city: 'Gurugram', place: 'Cyber City, Gurugram' },
      { city: 'Neemrana', place: 'Neemrana Fort, Neemrana' },
      { city: 'Jaipur', place: 'Hawa Mahal, Jaipur' },
    ],
    returnPickupTime: null,
    vehicleOption: { number: 2, tier: 'Premium' },
    liveTracking: {
      etaLabel: '11:40 AM',
      remainingLabel: '1h 25m remaining',
      routeSummary: 'En route to Jaipur',
    },
  },
  bk_00126_t2: {
    vehiclePlate: null,
    vehicleFuel: 'Diesel',
    passengerBreakdown: { adults: 5, children: 1 },
    driver: null,
    timeline: {
      booked: '05 Sept 2026\n11:20 AM',
      confirmed: '06 Sept 2026\n10:05 AM',
    },
    cancellation: null,
    itinerary: [
      { city: 'Jaipur', place: 'Hawa Mahal, Jaipur' },
      { city: 'Amer', place: 'Amer Fort, Amer' },
      { city: 'Jaipur', place: 'Hawa Mahal, Jaipur' },
    ],
    returnPickupTime: null,
    vehicleOption: { number: 2, tier: 'Premium' },
    liveTracking: null,
  },
  bk_00126_t3: {
    vehiclePlate: null,
    vehicleFuel: 'Diesel',
    passengerBreakdown: { adults: 5, children: 1 },
    driver: null,
    timeline: {
      booked: '05 Sept 2026\n11:20 AM',
      confirmed: '06 Sept 2026\n10:05 AM',
    },
    cancellation: null,
    itinerary: [
      { city: 'Jaipur', place: 'Hawa Mahal, Jaipur' },
      { city: 'Kishangarh', place: 'Kishangarh Fort, Kishangarh' },
      { city: 'Ajmer', place: 'Hotel near Ajmer Sharif Dargah', stay: true },
      { city: 'Jaipur', place: 'Hawa Mahal, Jaipur' },
    ],
    returnPickupTime: '03:00 PM',
    vehicleOption: { number: 2, tier: 'Premium' },
    liveTracking: null,
  },
  bk_00126_t4: {
    vehiclePlate: null,
    vehicleFuel: 'Diesel',
    passengerBreakdown: { adults: 5, children: 1 },
    driver: null,
    timeline: {
      booked: '05 Sept 2026\n11:20 AM',
      confirmed: '06 Sept 2026\n10:05 AM',
    },
    cancellation: null,
    itinerary: [
      { city: 'Jaipur', place: 'Hawa Mahal, Jaipur' },
      { city: 'Gurugram', place: 'Cyber City, Gurugram' },
    ],
    returnPickupTime: null,
    vehicleOption: { number: 2, tier: 'Premium' },
    liveTracking: null,
  },
  bk_00125_t2: {
    vehiclePlate: null,
    vehicleFuel: 'Diesel',
    passengerBreakdown: { adults: 15, children: 2 },
    driver: null,
    timeline: {
      booked: '01 Nov 2026\n09:24 PM',
      confirmed: '02 Nov 2026\n11:05 AM',
    },
    cancellation: null,
    itinerary: [
      { city: 'Mumbai', place: 'Chhatrapati Shivaji Maharaj Intl Airport' },
      { city: 'Lonavala', place: 'Lonavala Bus Stand, Lonavala' },
      { city: 'Pune', place: 'Shivajinagar, Pune' },
    ],
    returnPickupTime: null,
    vehicleOption: { number: 2, tier: 'Premium' },
    liveTracking: null,
  },
  bk_00121_t1: {
    vehiclePlate: 'DL 1C AA 4521',
    vehicleFuel: 'Diesel',
    passengerBreakdown: { adults: 8, children: 2 },
    driver: {
      name: 'Mahesh Yadav',
      avatarUrl: null,
      rating: 4.6,
      tripsCompleted: 185,
      phoneE164: '+919811122233',
    },
    timeline: {
      booked: '02 Sept 2026\n03:10 PM',
      confirmed: '03 Sept 2026\n10:20 AM',
      started: '06 Sept 2026\n06:00 AM',
      completed: '06 Sept 2026\n09:15 PM',
    },
    cancellation: null,
    itinerary: [
      { city: 'Delhi', place: 'Karol Bagh, Delhi' },
      { city: 'Mathura', place: 'Shri Krishna Janmabhoomi, Mathura' },
      { city: 'Vrindavan', place: 'Banke Bihari Temple, Vrindavan' },
      { city: 'Delhi', place: 'Karol Bagh, Delhi' },
    ],
    returnPickupTime: null,
    vehicleOption: { number: 2, tier: 'Premium' },
    liveTracking: null,
  },
  bk_00121_t2: {
    vehiclePlate: 'DL 1C AA 4521',
    vehicleFuel: 'Diesel',
    passengerBreakdown: { adults: 8, children: 2 },
    driver: {
      name: 'Mahesh Yadav',
      avatarUrl: null,
      rating: 4.6,
      tripsCompleted: 185,
      phoneE164: '+919811122233',
    },
    timeline: {
      booked: '02 Sept 2026\n03:10 PM',
      confirmed: '03 Sept 2026\n10:20 AM',
      started: '12 Sept 2026\n07:00 AM',
    },
    cancellation: null,
    itinerary: [
      { city: 'Delhi', place: 'Karol Bagh, Delhi' },
      { city: 'Neemrana', place: 'Neemrana Fort, Neemrana' },
      { city: 'Jaipur', place: 'MI Road, Jaipur' },
    ],
    returnPickupTime: null,
    vehicleOption: { number: 2, tier: 'Premium' },
    liveTracking: {
      etaLabel: '01:30 PM',
      remainingLabel: '1h 50m remaining',
      routeSummary: 'En route to Jaipur',
    },
  },
  bk_00121_t3: {
    vehiclePlate: null,
    vehicleFuel: 'Diesel',
    passengerBreakdown: { adults: 8, children: 2 },
    driver: null,
    timeline: {
      booked: '02 Sept 2026\n03:10 PM',
      confirmed: '03 Sept 2026\n10:20 AM',
    },
    cancellation: null,
    itinerary: [
      { city: 'Jaipur', place: 'MI Road, Jaipur' },
      { city: 'Udaipur', place: 'Lake Pichola Hotel, Udaipur', stay: true },
      { city: 'Jaipur', place: 'MI Road, Jaipur' },
    ],
    returnPickupTime: '10:00 AM',
    vehicleOption: { number: 3, tier: 'Royal' },
    liveTracking: null,
  },
};

/** Booking-level money, keyed by booking id (shared by all its trips). */
const BOOKING_MONEY: Readonly<Record<string, BookingMoney>> = {
  bk_00125: {
    payment: { status: 'partial', method: 'UPI' },
    fareBreakdown: {
      advancePaid: 7_500,
      advancePercent: 25,
      remainingAmount: 22_500,
      remainingNote: 'Pay Later',
    },
  },
  bk_00124: {
    payment: { status: 'partial', method: 'UPI' },
    fareBreakdown: {
      advancePaid: 1_625,
      advancePercent: 25,
      remainingAmount: 4_875,
      remainingNote: 'Pay Later',
    },
  },
  bk_00123: {
    payment: { status: 'partial', method: 'UPI' },
    fareBreakdown: {
      advancePaid: 4_625,
      advancePercent: 25,
      remainingAmount: 13_875,
      remainingNote: 'Pay Later',
    },
  },
  bk_00122: {
    payment: { status: 'paid', method: 'Card' },
    fareBreakdown: null,
  },
  bk_00126: {
    payment: { status: 'partial', method: 'UPI' },
    fareBreakdown: {
      advancePaid: 6_600,
      advancePercent: 25,
      remainingAmount: 19_800,
      remainingNote: 'Pay Later',
    },
  },
  bk_00121: {
    payment: { status: 'partial', method: 'UPI' },
    fareBreakdown: {
      advancePaid: 5_350,
      advancePercent: 25,
      remainingAmount: 16_050,
      remainingNote: 'Pay Later',
    },
  },
  bk_00110: {
    payment: { status: 'paid', method: 'UPI' },
    fareBreakdown: null,
  },
  bk_00098: {
    payment: { status: 'paid', method: 'Cash' },
    fareBreakdown: null,
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

const STANDARD_OTHER_CHARGES: readonly TripCharge[] = [
  {
    label: 'Toll Charges',
    status: 'included',
    detail: 'Already included in the cost.',
    rates: [],
    forVehicle: null,
  },
  {
    label: 'State Tax (Karnataka)',
    status: 'not_included',
    detail: 'Client will pay to driver.',
    rates: [],
    forVehicle: null,
  },
  {
    label: 'Parking & Police Entry',
    status: 'not_included',
    detail: 'Client will pay to driver.',
    rates: [],
    forVehicle: null,
  },
  {
    label: 'Extra Charge (Local)',
    status: 'extra',
    detail: null,
    rates: ['₹20/km', '₹150/hr'],
    forVehicle: null,
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
    forVehicle: null,
  },
];

/**
 * Extra charge above 1800 km, per vehicle option, from the quotation
 * sheet ("Rs. 20/km (1-3) | Rs. 26/km (4) | Rs. 40/km (5)"). Options
 * without an entry (6 and 7 aren't priced on the sheet yet) get no
 * extra-km row at all, rather than a guessed price.
 * TODO(api): the backend sends this row already narrowed to the
 * booked vehicle.
 */
const EXTRA_KM_RATE_BY_OPTION: Readonly<Record<number, string>> = {
  1: '₹20/km',
  2: '₹20/km',
  3: '₹20/km',
  4: '₹26/km',
  5: '₹40/km',
};

/** Standard charges, plus the extra-km row for the booked vehicle
 *  option (inserted after Parking, where the sheet lists it). */
function otherChargesFor(
  base: CustomerBookingTrip,
  option: BookingVehicleOption | null,
): readonly TripCharge[] {
  const rate = option ? EXTRA_KM_RATE_BY_OPTION[option.number] : undefined;
  if (!option || !rate) return STANDARD_OTHER_CHARGES;
  const vehicle = `${base.seater ? `${base.seater} Seat ` : ''}${
    base.vehicleType
  }`;
  const extraKm: TripCharge = {
    label: 'Extra Charge above 1800 km',
    status: 'extra',
    detail: null,
    rates: [rate],
    forVehicle: `Option ${option.number} · ${option.tier} · ${vehicle}`,
  };
  const at = STANDARD_OTHER_CHARGES.findIndex(
    c => c.label === 'Parking & Police Entry',
  );
  return [
    ...STANDARD_OTHER_CHARGES.slice(0, at + 1),
    extraKm,
    ...STANDARD_OTHER_CHARGES.slice(at + 1),
  ];
}

/**
 * Booking Details for one trip of a booking. `tripId` picks the trip;
 * without it the first trip opens (a booking with one trip, or an old
 * deep link that only knows the booking id). Returns `null` when the
 * booking — or the given trip inside it — isn't in the fixture (e.g. a
 * stale deep link) so the screen can render a proper not-found state
 * instead of crashing.
 *
 * The opened trip's fields replace the first trip's at the top level;
 * the amount, payment and fare split stay the booking's. Unknown
 * overrides fall back to nulls so upstream code can rely on the shape
 * being stable.
 */
export function getCustomerBookingDetail(
  id: BookingId,
  tripId?: TripId,
): CustomerBookingDetail | null {
  const booking = getCustomerBooking(id);
  if (!booking) return null;
  const trip =
    tripId === undefined
      ? booking.trips[0]
      : booking.trips.find(t => t.tripId === tripId);
  if (!trip) return null;

  const extra: DetailOverride = DETAIL_OVERRIDES[
    trip.tripId as unknown as string
  ] ?? {
    vehiclePlate: null,
    vehicleFuel: null,
    passengerBreakdown: null,
    driver: null,
    timeline: {},
    cancellation: null,
    itinerary: [
      { city: trip.from, place: null },
      { city: trip.to, place: null },
    ],
    returnPickupTime: null,
    vehicleOption: null,
    liveTracking: null,
  };
  const money: BookingMoney = BOOKING_MONEY[id as unknown as string] ?? {
    payment: null,
    fareBreakdown: null,
  };
  return {
    ...booking,
    ...trip,
    notes: STANDARD_NOTES,
    ...extra,
    ...money,
    otherCharges: otherChargesFor(trip, extra.vehicleOption),
  };
}

/* -------- Invariant check --------
 *
 * Every booking has at least one trip, and trip ids are unique. For
 * every trip, the card's "from → to" must match the itinerary on
 * Booking Details: `from` is the first stop, `to` is the last stop,
 * and round trips / pickup & drop trips end where they started. Also:
 * an upcoming trip's tracker points at "Trip Starts" (booked and
 * confirmed are done), a trip never ends before it starts, and `viaCity` is exactly what
 * `pickViaCity` picks from the itinerary. Runs once at module load in
 * development only; production bundles pay nothing. */
if (__DEV__) {
  const seenTripIds = new Set<string>();
  for (const b of MOCK_CUSTOMER_BOOKINGS) {
    if (b.trips.length === 0) {
      throw new Error(`[bookings/mocks] ${b.bookingNumber}: no trips`);
    }
    for (const t of b.trips) {
      const tag = `[bookings/mocks] ${b.bookingNumber} ${t.tripNumber}`;
      const key = t.tripId as unknown as string;
      if (seenTripIds.has(key)) {
        throw new Error(`${tag}: duplicate trip id ${key}`);
      }
      seenTripIds.add(key);
      if (isoDayToUtc(t.endDate) < isoDayToUtc(t.travelDate)) {
        throw new Error(
          `${tag}: endDate ${t.endDate} is before ${t.travelDate}`,
        );
      }
      // Upcoming = booked and confirmed; the tracker points at
      // "Trip Starts".
      if (t.status === 'upcoming' && t.progressStep !== 'started') {
        throw new Error(
          `${tag}: upcoming trip must have progressStep 'started' ` +
            `(got '${t.progressStep}')`,
        );
      }
      if (t.tripType !== 'one_way' && t.to !== t.from) {
        throw new Error(`${tag}: ${t.tripType} must end at its origin`);
      }
      const itinerary = DETAIL_OVERRIDES[key]?.itinerary;
      if (!itinerary) continue;
      const first = itinerary[0]?.city;
      const last = itinerary[itinerary.length - 1]?.city;
      if (first !== t.from || last !== t.to) {
        throw new Error(
          `${tag}: card route ${t.from} → ${t.to} does not match itinerary ` +
            `${first} → ${last}`,
        );
      }
      const via = pickViaCity(itinerary);
      if (via !== t.viaCity) {
        throw new Error(
          `${tag}: viaCity ${String(t.viaCity)} does not match the itinerary ` +
            `(expected ${String(via)})`,
        );
      }
    }
  }
}
