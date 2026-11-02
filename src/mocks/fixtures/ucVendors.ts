/**
 * ------------------------------------------------------------------
 * Fixture — UC Vendors
 * ------------------------------------------------------------------
 * 40 deterministic vendor rows for the Directory > Vendors tab. Used
 * by useVendorList until the real /uc/vendors endpoint ships.
 *
 * The `id` values here (`v_1` through `v_40`) are referenced by the
 * driver fixture's `vendorId` field so the Drivers tab's "Filter by
 * Vendor" chip stays consistent across both mocks.
 *
 * When the backend goes live, this whole module is deleted.
 * ------------------------------------------------------------------
 */

import type {
  Vendor,
  VendorGarage,
  VendorStatus,
  VendorVerification,
} from '@features/uc/vendors/types';
import { asISODateTime, type ISODateTime } from '@app-types/datetime';

const COMPANIES = [
  'Highway Kings Transports',
  'BlueLine Fleet Services',
  'MetroCabs India',
  'Ashoka Motors',
  'Sunrise Rentals',
  'Coastal Ride Co',
  'Peak Voyage Fleet',
  'GreenWheel Logistics',
  'Silverline Cars',
  'Ravi Travels',
  'Skyway Transport',
  'Trident Fleet',
  'Nova Cabs',
  'Sarthi Rentals',
  'GoldStar Vehicles',
  'Pioneer Motors',
  'Urban Ride Partners',
  'Eastern Star Fleet',
  'Delta Cabs',
  'Om Travels',
  'Vinayak Rentals',
  'Rajdhani Fleet',
  'Konkan Cabs',
  'Vasudev Motors',
  'Pearl Transport',
  'Prime Voyage',
  'Vaayu Motors',
  'Chariot Cabs',
  'Sunny Rentals',
  'Aravali Fleet',
  'Krishna Travels',
  'Sagar Motors',
  'Nirmal Cabs',
  'Champion Fleet',
  'Zenith Motors',
  'Yashwant Travels',
  'Bhagat Cabs',
  'Wanderlust Wheels',
  'Neelkanth Rentals',
  'Anand Motors',
];

const OWNERS = [
  'Ramesh Choudhary',
  'Anil Bhatia',
  'Sudhir Kulkarni',
  'Rekha Sharma',
  'Manoj Gupta',
  'Sanjay Rane',
  'Vinod Nayak',
  'Deepa Iyer',
  'Kishore Menon',
  'Nitin Deshmukh',
];

const CITIES = [
  'Mumbai',
  'Pune',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Delhi',
  'Ahmedabad',
  'Kolkata',
  'Jaipur',
  'Kochi',
];

/** Sample road, locality, state and PIN per city — mock data only. */
const ADDRESS_PARTS: Record<string, [string, string, string, string]> = {
  Mumbai: ['Andheri Kurla Road', 'Andheri East', 'Maharashtra', '400069'],
  Pune: ['FC Road', 'Shivajinagar', 'Maharashtra', '411005'],
  Bengaluru: ['MG Road', 'Ashok Nagar', 'Karnataka', '560001'],
  Hyderabad: ['Road No. 2', 'Banjara Hills', 'Telangana', '500034'],
  Chennai: ['Usman Road', 'T Nagar', 'Tamil Nadu', '600017'],
  Delhi: ['Barakhamba Road', 'Connaught Place', 'Delhi', '110001'],
  Ahmedabad: ['CG Road', 'Navrangpura', 'Gujarat', '380009'],
  Kolkata: ['Park Street', 'Mullick Bazar', 'West Bengal', '700016'],
  Jaipur: ['MI Road', 'Panch Batti', 'Rajasthan', '302001'],
  Kochi: ['MG Road', 'Ernakulam', 'Kerala', '682016'],
};

/** Every 13th vendor has no address and no locality, to exercise the
 *  "no address" case (card falls back to the city alone). */
const hasNoAddress = (index: number): boolean => index % 13 === 12;

/** Deterministic sample address. */
function addressFor(index: number, city: string): string {
  if (hasNoAddress(index)) return '';
  const parts = ADDRESS_PARTS[city];
  if (!parts) return '';
  const [road, locality, state, pin] = parts;
  return `Shop ${
    ((index * 7) % 90) + 1
  }, ${road}, ${locality}, ${city}, ${state} ${pin}`;
}

/** Locality for the same vendor; undefined when it has no address. */
function localityFor(index: number, city: string): string | undefined {
  if (hasNoAddress(index)) return undefined;
  return ADDRESS_PARTS[city]?.[1];
}

/** Sample garage area per city — mock data only. */
const GARAGE_LOCALITY: Record<string, string> = {
  Mumbai: 'Sakinaka',
  Pune: 'Hinjewadi',
  Bengaluru: 'Peenya',
  Hyderabad: 'Kukatpally',
  Chennai: 'Guindy',
  Delhi: 'Mahipalpur',
  Ahmedabad: 'Naroda',
  Kolkata: 'Topsia',
  Jaipur: 'Sitapura',
  Kochi: 'Kalamassery',
};

/**
 * Deterministic sample garages. Each vendor has garages in most cities
 * but not all, so some drivers have no garage in their city (the card
 * then shows the city alone). Vendors with no address have no garages.
 * Vendor 1 has two Mumbai garages, to exercise "first one is shown".
 */
function garagesFor(index: number): VendorGarage[] {
  if (hasNoAddress(index)) return [];
  const garages: VendorGarage[] = CITIES.filter(
    (_, c) => (c + index) % 4 !== 0,
  ).map(city => ({ locality: GARAGE_LOCALITY[city], city }));
  if (index === 0) {
    // Two Mumbai garages, main one (Sakinaka) first.
    return [
      { locality: GARAGE_LOCALITY.Mumbai, city: 'Mumbai' },
      { locality: 'Marol', city: 'Mumbai' },
      ...garages.filter(g => g.city !== 'Mumbai'),
    ];
  }
  return garages;
}

const STATUS_CYCLE: VendorStatus[] = [
  'active',
  'active',
  'active',
  'pending',
  'active',
  'active',
  'pending',
  'suspended',
  'active',
  'inactive',
];

/** Deterministic 10-digit Indian mobile starting with 9, stored as
 *  '+91XXXXXXXXXX' (no spaces), e.g. '+919000000000'. */
function phoneFor(index: number, offset = 0): string {
  const base = 9000000000 + index * 1234 + offset * 7;
  return `+91${base}`;
}

const VERIFICATION_CYCLE: VendorVerification[] = [
  'verified',
  'verified',
  'pending',
  'verified',
  'verified',
  'rejected',
];

const BUSINESS_TYPES = [
  'Transport Services',
  'Car Rental',
  'Fleet Operator',
  'Tour Operator',
];

/** Designation keys known to the app today (see vendors/types.ts). */
const DESIGNATIONS = ['admin', 'operations_manager', 'booking_manager'];

/** Sample PAN. Matches the PAN inside the same vendor's sample GSTIN
 *  (a GSTIN's characters 3–12 are the holder's PAN). */
function panFor(index: number): string {
  return `ABCDE${1000 + index}F`;
}

function emailFor(company: string): string {
  const slug = company
    .toLowerCase()
    .replace(/[^a-z]+/g, '')
    .slice(0, 12);
  return `contact@${slug}.in`;
}

/** ISO date roughly `daysAgo` days before now, deterministic. */
function daysAgo(days: number): ISODateTime {
  const d = new Date('2025-08-01T09:00:00Z');
  d.setUTCDate(d.getUTCDate() - days);
  return asISODateTime(d.toISOString());
}

export const fixtureUcVendorsAll: Vendor[] = COMPANIES.map((company, i) => ({
  id: `v_${i + 1}`,
  ownerName: OWNERS[i % OWNERS.length],
  companyName: company,
  phone: phoneFor(i),
  phoneAlt: i % 3 === 0 ? phoneFor(i, 1) : undefined,
  email: emailFor(company),
  city: CITIES[i % CITIES.length],
  address: addressFor(i, CITIES[i % CITIES.length]),
  locality: localityFor(i, CITIES[i % CITIES.length]),
  garages: garagesFor(i),
  gstin: i % 4 === 0 ? undefined : `27${panFor(i)}1Z${i % 10}`,
  // Every 5th vendor has no PAN and every 7th no business type, to
  // exercise the hidden-row case on the contact sheet.
  pan: i % 5 === 4 ? undefined : panFor(i),
  businessType:
    i % 7 === 6 ? undefined : BUSINESS_TYPES[i % BUSINESS_TYPES.length],
  // Every 6th vendor has no designation: exercises the hidden row.
  designation: i % 6 === 5 ? undefined : DESIGNATIONS[i % DESIGNATIONS.length],
  status: STATUS_CYCLE[i % STATUS_CYCLE.length],
  verification: VERIFICATION_CYCLE[i % VERIFICATION_CYCLE.length],
  vehicleCount: 3 + ((i * 7) % 40),
  driverCount: 4 + ((i * 5) % 25),
  createdAt: daysAgo(i * 3 + 5),
}));
