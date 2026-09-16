/**
 * ------------------------------------------------------------------
 * Customer Quotations — mock fixture
 * ------------------------------------------------------------------
 * Seeds the Quotations tab list. Matches the redesign spec (Image 1
 * of the mockup set) 1:1 so the screen renders exactly what product
 * signed off on:
 *
 *   All: 6, Pending: 2, Accepted: 3, Expired: 1
 *
 * NOTE ON COUNTS:
 *   The header chip strip renders live counts derived from this
 *   array. If you edit an item's `status`, verify the chip numbers
 *   still line up with the design (or update the design copy). The
 *   screen has no hard-coded totals — it always trusts the data.
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
  QuotationTerm,
  TravelExecutive,
} from './types';

export const MOCK_CUSTOMER_QUOTATIONS: readonly CustomerQuotationListItem[] = [
  {
    id: asQuotationId('q_10257'),
    quotationNumber: 'QU10257',
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
    id: asQuotationId('q_10245'),
    quotationNumber: 'QU10245',
    status: 'accepted',
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
  {
    id: asQuotationId('q_10230'),
    quotationNumber: 'QU10230',
    status: 'pending',
    tripType: 'one_way',
    stops: ['Bangalore', 'Mysore', 'Ooty', 'Bangalore'],
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
    id: asQuotationId('q_10218'),
    quotationNumber: 'QU10218',
    status: 'expired',
    tripType: 'pickup_drop',
    stops: ['Chennai', 'Pondicherry', 'Chennai'],
    travelDateStart: '2026-09-18',
    travelDateEnd: '2026-09-20',
    nights: 2,
    days: 3,
    adults: 2,
    children: 1,
    amount: 19600,
    createdAt: '2026-08-02T08:15:00Z',
  },
  {
    id: asQuotationId('q_10205'),
    quotationNumber: 'QU10205',
    status: 'accepted',
    tripType: 'round_trip',
    stops: ['Hyderabad', 'Ramoji', 'Hyderabad'],
    travelDateStart: '2026-10-05',
    travelDateEnd: '2026-10-07',
    nights: 2,
    days: 3,
    adults: 2,
    children: 0,
    amount: 24900,
    createdAt: '2026-07-28T14:45:00Z',
  },
  {
    id: asQuotationId('q_10198'),
    quotationNumber: 'QU10198',
    status: 'pending',
    tripType: 'round_trip',
    stops: ['Kolkata', 'Darjeeling', 'Gangtok', 'Kolkata'],
    travelDateStart: '2026-10-12',
    travelDateEnd: '2026-10-18',
    nights: 6,
    days: 7,
    adults: 2,
    children: 1,
    amount: 46200,
    createdAt: '2026-07-25T11:20:00Z',
  },
];

/* ================================================================
 * DETAIL MOCKS
 * ================================================================
 * Keyed by QuotationId so the detail screen can do an O(1) lookup
 * from `route.params.quotationId`. All six list items are seeded so
 * every "View" tap from the list has somewhere to land — otherwise
 * we'd need a not-found state for perfectly valid IDs.
 *
 * INVARIANT ENFORCEMENT:
 *   Each record's `stopDetails` array is asserted at module load
 *   time to have the same length as its `stops`. This catches
 *   drift while the two are hand-maintained; when the endpoint
 *   ships, the assertion goes away.
 * ================================================================ */

/**
 * Shared T&C block used by every mock detail. Ops has one
 * standard set of terms today; keeping it as a shared constant
 * (rather than duplicating per record) makes the intent obvious.
 * A future quotation with bespoke terms just inlines its own
 * `terms` array on the record.
 */
const STANDARD_TERMS: readonly QuotationTerm[] = [
  {
    variant: 'toll',
    title: 'Toll Charges',
    lines: ['Included in the cost'],
  },
  {
    variant: 'parking',
    title: 'Parking & Police Entry',
    lines: ['Not Included', 'Pay to Driver'],
  },
  {
    variant: 'extra_km',
    title: 'Extra KM Charge',
    lines: ['After 800 km', '₹28/km (1-3)  |  ₹35/km (4)'],
  },
  {
    variant: 'night',
    title: 'Driver Night Charge',
    lines: ['Before 6 AM & after 11 PM', '₹500  |  After 1 AM ₹500/hr'],
  },
];

const STANDARD_PRICE_INCLUDES =
  'Prices include Vehicle Cost, Fuel, Driver & Tax intermittently on Hills.';
const STANDARD_PRICE_EXTRA = 'AC will be switched OFF';

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

export const MOCK_CUSTOMER_QUOTATION_DETAILS: Readonly<
  Record<QuotationId, CustomerQuotationDetail>
> = {
  [asQuotationId('q_10257')]: {
    ...(MOCK_CUSTOMER_QUOTATIONS[0] as CustomerQuotationListItem),
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
    priceIncludes: STANDARD_PRICE_INCLUDES,
    priceExtra: STANDARD_PRICE_EXTRA,
    terms: STANDARD_TERMS,
    travelExecutive: STANDARD_EXECUTIVE,
    advanceAmount: advanceOf(35200),
    acceptedAt: '2026-08-10T10:45:00Z',
  },
  [asQuotationId('q_10245')]: {
    ...(MOCK_CUSTOMER_QUOTATIONS[1] as CustomerQuotationListItem),
    stopDetails: [
      { city: 'Mumbai', address: 'Chhatrapati Shivaji Airport, Mumbai' },
      { city: 'Goa', address: 'Baga Beach, North Goa' },
      { city: 'Mumbai', address: 'Chhatrapati Shivaji Airport, Mumbai' },
    ],
    vehicle: {
      name: 'Toyota Innova Crysta',
      image: PLACEHOLDER_VEHICLE_IMG,
      seater: 7,
      fuel: 'Diesel',
      ac: true,
      hasLuggageSpace: true,
    },
    priceIncludes: STANDARD_PRICE_INCLUDES,
    priceExtra: STANDARD_PRICE_EXTRA,
    terms: STANDARD_TERMS,
    travelExecutive: STANDARD_EXECUTIVE,
    advanceAmount: advanceOf(58400),
    acceptedAt: '2026-08-08T14:20:00Z',
  },
  [asQuotationId('q_10230')]: {
    ...(MOCK_CUSTOMER_QUOTATIONS[2] as CustomerQuotationListItem),
    stopDetails: [
      { city: 'Bangalore', address: 'Kempegowda International Airport' },
      { city: 'Mysore', address: 'Mysore Palace, Mysore' },
      { city: 'Ooty', address: 'Ooty Lake, Ooty' },
      { city: 'Bangalore', address: 'Kempegowda International Airport' },
    ],
    vehicle: {
      name: 'Toyota Innova Crysta',
      image: PLACEHOLDER_VEHICLE_IMG,
      seater: 7,
      fuel: 'Diesel',
      ac: true,
      hasLuggageSpace: true,
    },
    priceIncludes: STANDARD_PRICE_INCLUDES,
    priceExtra: STANDARD_PRICE_EXTRA,
    terms: STANDARD_TERMS,
    travelExecutive: STANDARD_EXECUTIVE,
    advanceAmount: advanceOf(28750),
    /* Pending: not yet accepted, so `expiresAt` is set instead. */
    expiresAt: '2026-09-09T23:59:00Z',
  },
  [asQuotationId('q_10218')]: {
    ...(MOCK_CUSTOMER_QUOTATIONS[3] as CustomerQuotationListItem),
    stopDetails: [
      { city: 'Chennai', address: 'Chennai International Airport' },
      { city: 'Pondicherry', address: 'Promenade Beach, Pondicherry' },
      { city: 'Chennai', address: 'Chennai International Airport' },
    ],
    vehicle: {
      name: 'Maruti Suzuki Ertiga',
      image: PLACEHOLDER_VEHICLE_IMG,
      seater: 7,
      fuel: 'CNG',
      ac: true,
      hasLuggageSpace: true,
    },
    priceIncludes: STANDARD_PRICE_INCLUDES,
    priceExtra: STANDARD_PRICE_EXTRA,
    terms: STANDARD_TERMS,
    travelExecutive: STANDARD_EXECUTIVE,
    advanceAmount: advanceOf(19600),
    /* Expired: window has closed. */
    expiresAt: '2026-08-30T23:59:00Z',
  },
  [asQuotationId('q_10205')]: {
    ...(MOCK_CUSTOMER_QUOTATIONS[4] as CustomerQuotationListItem),
    stopDetails: [
      { city: 'Hyderabad', address: 'Rajiv Gandhi International Airport' },
      { city: 'Ramoji', address: 'Ramoji Film City, Hyderabad' },
      { city: 'Hyderabad', address: 'Rajiv Gandhi International Airport' },
    ],
    vehicle: {
      name: 'Toyota Innova Crysta',
      image: PLACEHOLDER_VEHICLE_IMG,
      seater: 7,
      fuel: 'Diesel',
      ac: true,
      hasLuggageSpace: true,
    },
    priceIncludes: STANDARD_PRICE_INCLUDES,
    priceExtra: STANDARD_PRICE_EXTRA,
    terms: STANDARD_TERMS,
    travelExecutive: STANDARD_EXECUTIVE,
    advanceAmount: advanceOf(24900),
    acceptedAt: '2026-07-28T17:15:00Z',
  },
  [asQuotationId('q_10198')]: {
    ...(MOCK_CUSTOMER_QUOTATIONS[5] as CustomerQuotationListItem),
    stopDetails: [
      { city: 'Kolkata', address: 'Netaji Subhas Chandra Bose Airport' },
      { city: 'Darjeeling', address: 'Mall Road, Darjeeling' },
      { city: 'Gangtok', address: 'MG Marg, Gangtok' },
      { city: 'Kolkata', address: 'Netaji Subhas Chandra Bose Airport' },
    ],
    vehicle: {
      name: 'Toyota Innova Crysta',
      image: PLACEHOLDER_VEHICLE_IMG,
      seater: 7,
      fuel: 'Diesel',
      ac: true,
      hasLuggageSpace: true,
    },
    priceIncludes: STANDARD_PRICE_INCLUDES,
    priceExtra: STANDARD_PRICE_EXTRA,
    terms: STANDARD_TERMS,
    travelExecutive: STANDARD_EXECUTIVE,
    advanceAmount: advanceOf(46200),
    expiresAt: '2026-10-11T23:59:00Z',
  },
};

/* -------- Invariant check --------
 *
 * `stopDetails.length` must equal `stops.length`, and city names
 * must match. Runs once at module load — cost is negligible and
 * the diagnostic catches drift immediately during development.
 * Wrapped in __DEV__ so production bundles pay nothing. */
if (__DEV__) {
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
