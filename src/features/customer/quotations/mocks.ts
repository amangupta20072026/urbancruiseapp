/**
 * ------------------------------------------------------------------
 * Customer Quotations — mock fixture
 * ------------------------------------------------------------------
 * Seeds the Quotations tab list. The screen renders this array in
 * order (no client-side sort), so the order here IS the display
 * order:
 *
 *   1–3  pending   — one way, round trip, pickup & drop
 *   4–6  accepted  — one way, round trip, pickup & drop
 *   7    expired   — round trip
 *
 *   Chip counts → All: 7, Pending: 3, Accepted: 3, Expired: 1
 *
 * NOTE ON COUNTS:
 *   The header chip strip renders live counts derived from this
 *   array. If you edit an item's `status`, the chip numbers follow
 *   automatically — the screen has no hard-coded totals.
 *
 * TRIP-TYPE ROUTE SHAPES (the card shows first → last stop):
 *   one_way     — ends somewhere other than the origin (X → Y).
 *   round_trip  — last stop equals the first (X → X); `days` counts
 *                 every day of the travel window.
 *   pickup_drop — X → Y → X as two separate legs: drop on the first
 *                 day, pickup on the last. `days` = 2 (the two leg
 *                 days); `restDays` = the days in between at Y,
 *                 which are not counted. See utils/duration.ts.
 *
 * DATES:
 *   Fixed (not derived from `now()`) because "created on" and travel
 *   dates should feel stable across demo sessions — shifting them
 *   daily makes screenshots hard to align with product copy. When
 *   the /customer/quotations endpoint ships, delete this file.
 * ------------------------------------------------------------------
 */

import { asQuotationId } from '@app-types/ids';
import type { QuotationId } from '@app-types/ids';
import type {
  CustomerQuotationDetail,
  CustomerQuotationListItem,
  QuotationCharge,
  TravelExecutive,
} from './types';
import { VEHICLE_OPTIONS } from './vehicleTierOptions';

export const MOCK_CUSTOMER_QUOTATIONS: readonly CustomerQuotationListItem[] = [
  /* ---------------- Pending ---------------- */
  {
    id: asQuotationId('q_10230'),
    quotationNumber: 'QU-2026-259847',
    status: 'pending',
    tripType: 'one_way',
    stops: ['Bangalore', 'Mysore', 'Ooty'],
    travelDateStart: '2026-09-10',
    travelDateEnd: '2026-09-14',
    nights: 4,
    days: 5,
    adults: 2,
    children: 0,
    amount: 28750,
    createdAt: '2026-08-05T12:00:00Z',
  },
  {
    id: asQuotationId('q_10198'),
    quotationNumber: 'QU-2026-375620',
    status: 'pending',
    tripType: 'round_trip',
    stops: ['Kolkata', 'Darjeeling', 'Gangtok', 'Kolkata'],
    travelDateStart: '2026-10-12',
    travelDateEnd: '2026-10-18',
    nights: 6,
    days: 7,
    adults: 2,
    children: 1,
    amount: 52800,
    createdAt: '2026-07-25T11:20:00Z',
  },
  {
    id: asQuotationId('q_10262'),
    quotationNumber: 'QU-2026-640318',
    status: 'pending',
    tripType: 'pickup_drop',
    stops: ['Pune', 'Mumbai', 'Pune'],
    travelDateStart: '2026-10-22',
    travelDateEnd: '2026-10-26',
    nights: 0,
    days: 2,
    restDays: 3,
    adults: 3,
    children: 1,
    amount: 11800,
    createdAt: '2026-10-14T10:30:00Z',
  },

  /* ---------------- Accepted ---------------- */
  {
    id: asQuotationId('q_10218'),
    quotationNumber: 'QU-2026-604192',
    status: 'accepted',
    tripType: 'one_way',
    stops: ['Chennai', 'Pondicherry'],
    travelDateStart: '2026-09-18',
    travelDateEnd: '2026-09-19',
    nights: 1,
    days: 2,
    adults: 2,
    children: 1,
    amount: 9800,
    createdAt: '2026-08-02T08:15:00Z',
  },
  {
    id: asQuotationId('q_10257'),
    quotationNumber: 'QU-2026-482913',
    status: 'accepted',
    tripType: 'round_trip',
    stops: ['Delhi', 'Agra', 'Jaipur', 'Delhi'],
    travelDateStart: '2026-08-12',
    travelDateEnd: '2026-08-15',
    nights: 3,
    days: 4,
    adults: 2,
    children: 1,
    amount: 35200,
    createdAt: '2026-08-10T09:00:00Z',
  },
  {
    id: asQuotationId('q_10205'),
    quotationNumber: 'QU-2026-918374',
    status: 'accepted',
    tripType: 'pickup_drop',
    stops: ['Hyderabad', 'Ramoji Film City', 'Hyderabad'],
    travelDateStart: '2026-10-05',
    travelDateEnd: '2026-10-07',
    nights: 0,
    days: 2,
    restDays: 1,
    adults: 2,
    children: 0,
    amount: 7600,
    createdAt: '2026-07-28T14:45:00Z',
  },

  /* ---------------- Expired ---------------- */
  {
    id: asQuotationId('q_10245'),
    quotationNumber: 'QU-2026-731056',
    status: 'expired',
    tripType: 'round_trip',
    stops: ['Mumbai', 'Goa', 'Mumbai'],
    travelDateStart: '2026-08-20',
    travelDateEnd: '2026-08-27',
    nights: 7,
    days: 8,
    adults: 2,
    children: 2,
    amount: 58400,
    createdAt: '2026-08-08T07:30:00Z',
  },
];

/* ================================================================
 * DETAIL MOCKS
 * ================================================================
 * Keyed by QuotationId so the detail screen can do an O(1) lookup
 * from `route.params.quotationId`. All seven list items are seeded
 * so every "View Details" tap from the list has somewhere to land.
 *
 * Each detail record spreads its list item via `listItem(id)`
 * (lookup by id, not by array index), so reordering the list above
 * never silently attaches the wrong details to a card.
 *
 * INVARIANT ENFORCEMENT:
 *   Each record's `stopDetails` array is asserted at module load
 *   time to have the same length as its `stops`. This catches
 *   drift while the two are hand-maintained; when the endpoint
 *   ships, the assertion goes away.
 * ================================================================ */

/**
 * Notes + Other Charges shown on every mock quotation. Deliberately
 * the SAME copy as `STANDARD_NOTES` / `STANDARD_OTHER_CHARGES` in
 * features/customer/bookings/mocks.ts: a customer reads these terms
 * on the quotation and must find them word-for-word unchanged on the
 * booking they confirm. If one side is re-worded, re-word both.
 *
 * TODO(api): both arrays come from the quotations endpoint once it
 * is built, and the two mock copies collapse into one server field.
 */
const QUOTATION_NOTES: readonly string[] = [
  'Pricing includes vehicle cost, fuel cost, driver and local tax.',
  'KM will be counted from pickup point to pickup point.',
  'A/C will be switched off intermittently on hills.',
  'Visits to local city places are not included in the cost.',
  'Restricted places — the vehicle may not go to some places on hills due to local govt. restrictions, difficult terrain or narrow roads.',
];

/**
 * Extra km above 1800, per vehicle option, from the ops rate sheet
 * ("Rs. 20/km (1-3) | Rs. 26/km (4) | Rs. 40/km (5)"). Options 6 and
 * 7 are not priced there, so they are absent rather than guessed —
 * a customer who picks one keeps seeing the full tier list.
 *
 * Keyed by `VehicleOption.id`, not by row number, so renumbering the
 * sheet can never silently re-price a vehicle.
 */
const EXTRA_KM_RATE_BY_OPTION: Readonly<Record<string, string>> = {
  'economy-traveller-13': '₹20/km',
  'premium-traveller-13': '₹20/km',
  'royal-traveller-13': '₹20/km',
  'royal-traveller-26': '₹26/km',
  'royal-vip-traveller-12': '₹40/km',
};

/**
 * Row order mirrors Booking Details, with the vehicle-priced extra-km
 * row sitting after "Parking & Police Entry" exactly where the rate
 * sheet lists it.
 */
const QUOTATION_OTHER_CHARGES: readonly QuotationCharge[] = [
  {
    label: 'Toll Charges',
    status: 'included',
    detail: 'Already included in the cost.',
    rates: [],
    forVehicle: null,
    vehicleRates: null,
  },
  {
    label: 'State Tax (Karnataka)',
    status: 'not_included',
    detail: 'Client will pay to driver.',
    rates: [],
    forVehicle: null,
    vehicleRates: null,
  },
  {
    label: 'Parking & Police Entry',
    status: 'not_included',
    detail: 'Client will pay to driver.',
    rates: [],
    forVehicle: null,
    vehicleRates: null,
  },
  {
    // Vehicle-priced. `rates` is the full tier list the customer sees
    // before choosing; `vehicleRates` lets the screen collapse it to
    // their pick. Both are kept in sync by the dev check below.
    label: 'Extra Charge above 1800 km',
    status: 'extra',
    detail: null,
    rates: ['Option 1-3: ₹20/km', 'Option 4: ₹26/km', 'Option 5: ₹40/km'],
    forVehicle: null,
    vehicleRates: EXTRA_KM_RATE_BY_OPTION,
  },
  {
    label: 'Extra Charge (Local)',
    status: 'extra',
    detail: null,
    rates: ['₹20/km', '₹150/hr'],
    forVehicle: null,
    vehicleRates: null,
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
    vehicleRates: null,
  },
];

/**
 * Placeholder vehicle image. Swap for `@assets/images/vehicle-tempo-
 * traveller.png` etc. when the vehicle-image set lands. The type
 * accepts any require()-returned number, so callers don't need to
 * change when the assets are added.
 */
const PLACEHOLDER_VEHICLE_IMG = require('@assets/images/service-car.png');

/**
 * Standard travel executive assigned to every mock quotation. In
 * production this is per-quotation (or at least per-customer); the
 * mock keeps a single record to avoid multiplying placeholders.
 *
 * The shared default-avatar asset is used by the quotation-detail
 * advisor card and the Request Changes sheet until an executive
 * profile photo is supplied by the backend.
 */
export const STANDARD_EXECUTIVE: TravelExecutive = {
  id: 'exec_aman_gupta',
  name: 'Amit Sharma',
  role: 'Sales Executive',
  phoneE164: '+918655664746',
  email: 'india.urbancruise03@gmail.com',
  avatar: require('@assets/images/default-avatar.png'),
  slaLine: 'Usually replies within 5 minutes',
};

/**
 * Advance percentage applied to every mock. Ops tunes this per
 * quotation in production; for the demo we keep a single knob so
 * every "Ready to Book" sheet shows the same 25%-of-total maths.
 */
const ADVANCE_FRACTION = 0.25;
const advanceOf = (total: number): number =>
  Math.round((total * ADVANCE_FRACTION) / 100) * 100;

/**
 * Returns the list item with the given id. Throws if missing so a
 * typo in a detail record fails loudly at module load instead of
 * rendering an empty card.
 */
function listItem(id: string): CustomerQuotationListItem {
  const item = MOCK_CUSTOMER_QUOTATIONS.find(q => q.id === id);
  if (!item) {
    throw new Error(`[quotations/mocks] no list item with id "${id}"`);
  }
  return item;
}

const INNOVA_CRYSTA = {
  name: 'Toyota Innova Crysta',
  image: PLACEHOLDER_VEHICLE_IMG,
  seater: 7,
  fuel: 'Diesel',
  ac: true,
  hasLuggageSpace: true,
} as const;

const DETAIL_RECORDS: readonly CustomerQuotationDetail[] = [
  /* ---------------- Pending ---------------- */
  {
    ...listItem('q_10230'),
    stopDetails: [
      { city: 'Bangalore', address: 'Kempegowda International Airport' },
      { city: 'Mysore', address: 'Mysore Palace, Mysore' },
      { city: 'Ooty', address: 'Ooty Lake, Ooty' },
    ],
    vehicle: INNOVA_CRYSTA,
    notes: QUOTATION_NOTES,
    otherCharges: QUOTATION_OTHER_CHARGES,
    travelExecutive: STANDARD_EXECUTIVE,
    pickupTime: '07:00 AM',
    dropTime: '06:00 PM',
    advanceAmount: advanceOf(28750),
    expiresAt: '2026-09-09T23:59:00Z',
  },
  {
    ...listItem('q_10198'),
    stopDetails: [
      { city: 'Kolkata', address: 'Netaji Subhas Chandra Bose Airport' },
      { city: 'Darjeeling', address: 'Mall Road, Darjeeling' },
      { city: 'Gangtok', address: 'MG Marg, Gangtok' },
      { city: 'Kolkata', address: 'Netaji Subhas Chandra Bose Airport' },
    ],
    vehicle: INNOVA_CRYSTA,
    notes: QUOTATION_NOTES,
    otherCharges: QUOTATION_OTHER_CHARGES,
    travelExecutive: STANDARD_EXECUTIVE,
    pickupTime: '06:30 AM',
    dropTime: '08:30 PM',
    advanceAmount: advanceOf(52800),
    expiresAt: '2026-10-11T23:59:00Z',
  },
  {
    ...listItem('q_10262'),
    stopDetails: [
      { city: 'Pune', address: 'Pune Railway Station, Pune' },
      {
        city: 'Mumbai',
        address: 'Chhatrapati Shivaji Maharaj Airport, Mumbai',
      },
      { city: 'Pune', address: 'Pune Railway Station, Pune' },
    ],
    vehicle: INNOVA_CRYSTA,
    notes: QUOTATION_NOTES,
    otherCharges: QUOTATION_OTHER_CHARGES,
    travelExecutive: STANDARD_EXECUTIVE,
    pickupTime: '05:30 AM',
    dropTime: '09:00 PM',
    advanceAmount: advanceOf(11800),
    expiresAt: '2026-10-21T23:59:00Z',
  },

  /* ---------------- Accepted ---------------- */
  {
    ...listItem('q_10218'),
    stopDetails: [
      { city: 'Chennai', address: 'Chennai International Airport' },
      { city: 'Pondicherry', address: 'Promenade Beach, Pondicherry' },
    ],
    vehicle: {
      name: 'Maruti Suzuki Ertiga',
      image: PLACEHOLDER_VEHICLE_IMG,
      seater: 7,
      fuel: 'CNG',
      ac: true,
      hasLuggageSpace: true,
    },
    notes: QUOTATION_NOTES,
    otherCharges: QUOTATION_OTHER_CHARGES,
    travelExecutive: STANDARD_EXECUTIVE,
    pickupTime: '08:00 AM',
    dropTime: '01:00 PM',
    advanceAmount: advanceOf(9800),
    acceptedAt: '2026-08-03T11:00:00Z',
  },
  {
    ...listItem('q_10257'),
    stopDetails: [
      { city: 'Delhi', address: 'Indira Gandhi International Airport, Delhi' },
      { city: 'Agra', address: 'Agra Fort, Agra' },
      { city: 'Jaipur', address: 'Jaipur Railway Station, Jaipur' },
      { city: 'Delhi', address: 'Indira Gandhi International Airport, Delhi' },
    ],
    vehicle: {
      name: 'Tempo Traveller',
      image: PLACEHOLDER_VEHICLE_IMG,
      seater: 20,
      fuel: 'Diesel',
      ac: true,
      hasLuggageSpace: true,
    },
    notes: QUOTATION_NOTES,
    otherCharges: QUOTATION_OTHER_CHARGES,
    travelExecutive: STANDARD_EXECUTIVE,
    pickupTime: '06:00 AM',
    dropTime: '09:30 PM',
    advanceAmount: advanceOf(35200),
    acceptedAt: '2026-08-10T10:45:00Z',
  },
  {
    ...listItem('q_10205'),
    stopDetails: [
      { city: 'Hyderabad', address: 'Rajiv Gandhi International Airport' },
      { city: 'Ramoji Film City', address: 'Ramoji Film City, Hyderabad' },
      { city: 'Hyderabad', address: 'Rajiv Gandhi International Airport' },
    ],
    vehicle: INNOVA_CRYSTA,
    notes: QUOTATION_NOTES,
    otherCharges: QUOTATION_OTHER_CHARGES,
    travelExecutive: STANDARD_EXECUTIVE,
    pickupTime: '09:00 AM',
    dropTime: '08:30 PM',
    advanceAmount: advanceOf(7600),
    acceptedAt: '2026-07-28T17:15:00Z',
  },

  /* ---------------- Expired ---------------- */
  {
    ...listItem('q_10245'),
    stopDetails: [
      {
        city: 'Mumbai',
        address: 'Chhatrapati Shivaji Maharaj Airport, Mumbai',
      },
      { city: 'Goa', address: 'Baga Beach, North Goa' },
      {
        city: 'Mumbai',
        address: 'Chhatrapati Shivaji Maharaj Airport, Mumbai',
      },
    ],
    vehicle: INNOVA_CRYSTA,
    notes: QUOTATION_NOTES,
    otherCharges: QUOTATION_OTHER_CHARGES,
    travelExecutive: STANDARD_EXECUTIVE,
    pickupTime: '06:30 AM',
    dropTime: '07:00 PM',
    advanceAmount: advanceOf(58400),
    /* Expired: the acceptance window closed before a decision. */
    expiresAt: '2026-08-14T23:59:00Z',
  },
];

export const MOCK_CUSTOMER_QUOTATION_DETAILS: Readonly<
  Record<QuotationId, CustomerQuotationDetail>
> = Object.fromEntries(DETAIL_RECORDS.map(d => [d.id, d])) as Record<
  QuotationId,
  CustomerQuotationDetail
>;

/* -------- Invariant check --------
 *
 * Every list item has a detail record, `stopDetails.length` equals
 * `stops.length`, city names match, round trips and pickup & drop
 * trips end at their origin, and a pickup & drop travel window spans
 * exactly `days + restDays` calendar days. Runs once at module load —
 * cost is negligible and the diagnostic catches drift immediately
 * during development. Wrapped in __DEV__ so production bundles pay
 * nothing. */
if (__DEV__) {
  const DAY_MS = 24 * 60 * 60 * 1000;
  for (const item of MOCK_CUSTOMER_QUOTATIONS) {
    const tag = `[quotations/mocks] ${item.quotationNumber}`;
    if (!MOCK_CUSTOMER_QUOTATION_DETAILS[item.id]) {
      throw new Error(`${tag}: missing detail record`);
    }
    if (
      item.tripType !== 'one_way' &&
      item.stops[item.stops.length - 1] !== item.stops[0]
    ) {
      throw new Error(`${tag}: ${item.tripType} must end at its origin`);
    }
    if (item.tripType === 'pickup_drop') {
      const span =
        Math.round(
          (Date.parse(item.travelDateEnd) - Date.parse(item.travelDateStart)) /
            DAY_MS,
        ) + 1;
      if (span !== item.days + (item.restDays ?? 0)) {
        throw new Error(
          `${tag}: travel window is ${span} days but days + restDays = ` +
            `${item.days + (item.restDays ?? 0)}`,
        );
      }
    } else if (item.restDays !== undefined) {
      throw new Error(`${tag}: restDays is only valid for pickup_drop`);
    }
  }
  for (const detail of Object.values(MOCK_CUSTOMER_QUOTATION_DETAILS)) {
    if (detail.stopDetails.length !== detail.stops.length) {
      throw new Error(
        `[quotations/mocks] ${detail.quotationNumber}: stopDetails length ` +
          `(${detail.stopDetails.length}) !== stops length (${detail.stops.length})`,
      );
    }
    detail.stops.forEach((city, i) => {
      if (detail.stopDetails[i]?.city !== city) {
        throw new Error(
          `[quotations/mocks] ${detail.quotationNumber}: stopDetails[${i}].city ` +
            `(${detail.stopDetails[i]?.city}) !== stops[${i}] (${city})`,
        );
      }
    });
  }
}

/* -------- Invariant check — vehicle-priced charges --------
 *
 * A `vehicleRates` key that isn't a real `VehicleOption.id` is a
 * silent bug: the row simply never narrows, and the customer keeps
 * seeing the full tier list after choosing a vehicle. Nothing in the
 * type system catches a typo'd string key, so check it here. Runs
 * once at module load in development only. */
if (__DEV__) {
  const optionIds = new Set(VEHICLE_OPTIONS.map(o => o.id));
  for (const charge of QUOTATION_OTHER_CHARGES) {
    if (!charge.vehicleRates) continue;
    for (const id of Object.keys(charge.vehicleRates)) {
      if (!optionIds.has(id)) {
        throw new Error(
          `[quotations/mocks] "${charge.label}" prices unknown vehicle ` +
            `option "${id}"`,
        );
      }
    }
  }
}

/**
 * O(1) detail lookup by id. Returns `null` when the id isn't in
 * the fixture (e.g. a stale deep-link) so the screen can render a
 * proper not-found state instead of crashing.
 */
export function getCustomerQuotationDetail(
  id: QuotationId,
): CustomerQuotationDetail | null {
  return MOCK_CUSTOMER_QUOTATION_DETAILS[id] ?? null;
}
