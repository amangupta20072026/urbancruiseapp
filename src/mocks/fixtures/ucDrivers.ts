/* eslint-disable import-x/no-unresolved */
/**
 * ------------------------------------------------------------------
 * Fixture — UC Drivers
 * ------------------------------------------------------------------
 * ~120 deterministic driver rows for Directory > Drivers. Each row's
 * vendorId + vendorName references the vendors fixture, so the
 * "Filter by Vendor" chip returns internally consistent results.
 *
 * When the backend goes live, this whole module is deleted.
 * ------------------------------------------------------------------
 */

import type {
  Driver,
  DriverVerification,
} from '@features/uc/drivers/types';
import { fixtureUcVendorsAll } from './ucVendors';
import { asISODateTime, type ISODateTime } from '@app-types/datetime';

const NAMES = [
  'Ramesh Kumar',
  'Suresh Patil',
  'Anwar Sheikh',
  'Balbir Singh',
  'Deepak Yadav',
  'Farid Khan',
  'Ganesh Naik',
  'Hemant Rane',
  'Iqbal Ansari',
  'Jitendra Sharma',
  'Kartar Singh',
  'Lakshman Reddy',
  'Mahesh Chavan',
  'Naresh Rathod',
  'Om Prakash',
  'Pravin Jadhav',
  'Qamar Ali',
  'Rakesh Verma',
  'Sunil More',
  'Tarun Bansal',
  'Umesh Salunke',
  'Vijay Wagh',
  'Wasim Sayyed',
  'Yashwant Gaikwad',
  'Zakir Hussain',
  'Ajay Deshmukh',
  'Bharat Kadam',
  'Chandan Pawar',
  'Dinesh Gupta',
  'Eknath Save',
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

const VERIFICATION_CYCLE: DriverVerification[] = [
  'verified',
  'verified',
  'verified',
  'pending',
  'verified',
  'verified',
  'verified',
  'pending',
  'verified',
  'rejected',
];

function phoneFor(seed: number, offset = 0): string {
  const base = 96000000 + seed * 3457 + offset * 17;
  return `+91${base}`;
}

function licenseFor(seed: number): string {
  // MH-YYYY-NNNNNNN style
  const region = ['MH', 'KA', 'TN', 'GJ', 'DL', 'WB', 'RJ', 'KL'][seed % 8];
  const year = 2015 + (seed % 8);
  const num = 1000000 + seed * 137;
  return `${region}${year}${num}`;
}

function daysAgo(days: number): ISODateTime {
  const d = new Date('2025-08-01T09:00:00Z');
  d.setUTCDate(d.getUTCDate() - days);
  return asISODateTime(d.toISOString());
}

/**
 * Build ~3 drivers per vendor, cycling through names/cities.
 * Total ≈ vendors.length * 3 = 120 rows.
 */
function build(): Driver[] {
  const out: Driver[] = [];
  let seed = 0;
  fixtureUcVendorsAll.forEach(vendor => {
    const perVendor = 3;
    for (let i = 0; i < perVendor; i++) {
      const name = NAMES[seed % NAMES.length];
      const verification = VERIFICATION_CYCLE[seed % VERIFICATION_CYCLE.length];
      out.push({
        id: `d_${seed + 1}`,
        name,
        phone: phoneFor(seed),
        phoneAlt: seed % 5 === 0 ? phoneFor(seed, 1) : undefined,
        email:
          seed % 3 === 0
            ? `${name.toLowerCase().split(/\s+/).join('.')}@example.com`
            : undefined,
        city: CITIES[seed % CITIES.length],
        vendorId: vendor.id,
        vendorName: vendor.companyName,
        licenseNo: licenseFor(seed),
        verification,
        completedTrips: 10 + ((seed * 23) % 400),
        createdAt: daysAgo(seed * 2 + 3),
      });
      seed++;
    }
  });
  return out;
}

export const fixtureUcDriversAll: Driver[] = build();
