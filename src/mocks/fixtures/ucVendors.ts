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

import type { Vendor, VendorStatus } from '@features/uc/vendors/types';
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
  'active',
];

/** Deterministic phone: 9<8 digits derived from index>. */
function phoneFor(index: number, offset = 0): string {
  const base = 90000000 + index * 1234 + offset * 7;
  return `+91${base}`;
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
  gstin: i % 4 === 0 ? undefined : `27ABCDE${1000 + i}F1Z${i % 10}`,
  status: STATUS_CYCLE[i % STATUS_CYCLE.length],
  vehicleCount: 3 + ((i * 7) % 40),
  driverCount: 4 + ((i * 5) % 25),
  createdAt: daysAgo(i * 3 + 5),
}));
