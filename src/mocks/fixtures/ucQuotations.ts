/* eslint-disable no-bitwise */
/**
 * ------------------------------------------------------------------
 * Fixture: UC quotations list
 * ------------------------------------------------------------------
 * Feeds `useUcQuotationList` until `GET /uc/quotations` ships. Rows
 * are deterministic (built from fixed seed tables by index), so the
 * list is stable across reloads. Timestamps are anchored to "now" at
 * module load so the newest rows always read as "today" and the
 * card's time-vs-date formatting can be exercised.
 *
 * When the backend goes live, delete this module and the TEMP block
 * in the hook.
 * ------------------------------------------------------------------
 */

import { asQuotationId } from '@app-types/ids';
import { asISODateTime } from '@app-types/datetime';
import type {
  UcQuotationListItem,
  UcQuotationStatus,
  UcServiceType,
  UcTripType,
} from '@features/uc/quotations/types';

type Seed = {
  customerName: string;
  customerPhone: string;
  /** null = no email on file (exercises the hidden Email action). */
  customerEmail: string | null;
  status: UcQuotationStatus;
  serviceType: UcServiceType;
  /** Sample model names only, not the real fleet. */
  vehicleName: string;
  /** null = seats unknown (exercises the name-only vehicle line). */
  seatingCapacity: number | null;
  tripType: UcTripType;
  stops: readonly string[];
  /** Days from today until travel. */
  travelInDays: number;
  days: number;
};

const SEEDS: readonly Seed[] = [
  {
    customerName: 'Rahul Sharma',
    customerPhone: '+91 98765 43210',
    customerEmail: 'rahul.sharma@example.com',
    status: 'accepted',
    serviceType: 'car_rental',
    vehicleName: 'Maruti Dzire',
    seatingCapacity: 4,
    tripType: 'one_way',
    stops: ['Delhi', 'Agra'],
    travelInDays: 3,
    days: 1,
  },
  {
    customerName: 'Priya Mehta',
    customerPhone: '+91 99887 66554',
    customerEmail: null,
    status: 'sent',
    serviceType: 'car_rental',
    vehicleName: 'Maruti Swift',
    seatingCapacity: 4,
    tripType: 'round_trip',
    stops: ['Delhi', 'Jaipur'],
    travelInDays: 9,
    days: 2,
  },
  {
    customerName: 'Amit Kumar',
    customerPhone: '+91 91234 56789',
    customerEmail: 'amit.kumar@example.com',
    status: 'draft',
    serviceType: 'tempo_traveller',
    vehicleName: 'Force Traveller',
    seatingCapacity: 12,
    tripType: 'local',
    stops: ['Delhi'],
    travelInDays: 11,
    days: 1,
  },
  {
    customerName: 'Sneha Gupta',
    customerPhone: '+91 87654 32109',
    customerEmail: null,
    status: 'rejected',
    serviceType: 'bus_rental',
    vehicleName: 'Luxury Coach',
    seatingCapacity: 45,
    tripType: 'one_way',
    stops: ['Delhi', 'Chandigarh'],
    travelInDays: 19,
    days: 3,
  },
  {
    customerName: 'Vikram Singh',
    customerPhone: '+91 76543 21098',
    customerEmail: 'vikram.singh@example.com',
    status: 'sent',
    serviceType: 'rail_rental',
    vehicleName: 'Executive Coach',
    seatingCapacity: null,
    tripType: 'one_way',
    stops: ['Delhi', 'Varanasi'],
    travelInDays: 36,
    days: 1,
  },
  {
    customerName: 'Neha Iyer',
    customerPhone: '+91 98111 22334',
    customerEmail: null,
    status: 'accepted',
    serviceType: 'tempo_traveller',
    vehicleName: 'Force Traveller',
    seatingCapacity: 17,
    tripType: 'round_trip',
    stops: ['Delhi', 'Rishikesh', 'Haridwar'],
    travelInDays: 14,
    days: 3,
  },
  {
    customerName: 'Karan Mehta',
    customerPhone: '+91 99100 45678',
    customerEmail: 'karan.mehta@example.com',
    status: 'draft',
    serviceType: 'car_rental',
    vehicleName: 'Mahindra XUV700',
    seatingCapacity: 7,
    tripType: 'one_way',
    stops: ['Gurugram', 'Jaipur'],
    travelInDays: 6,
    days: 1,
  },
  {
    customerName: 'Divya Nair',
    customerPhone: '+91 90000 11223',
    customerEmail: null,
    status: 'sent',
    serviceType: 'car_rental',
    vehicleName: 'Toyota Innova Crysta',
    seatingCapacity: 7,
    tripType: 'round_trip',
    stops: ['Noida', 'Mathura', 'Vrindavan'],
    travelInDays: 8,
    days: 2,
  },
  {
    customerName: 'Suresh Rao',
    customerPhone: '+91 98989 89898',
    customerEmail: 'suresh.rao@example.com',
    status: 'accepted',
    serviceType: 'bus_rental',
    vehicleName: 'Mini Bus',
    seatingCapacity: 35,
    tripType: 'round_trip',
    stops: ['Delhi', 'Shimla'],
    travelInDays: 22,
    days: 4,
  },
  {
    customerName: 'Anita Deshmukh',
    customerPhone: '+91 97654 01234',
    customerEmail: null,
    status: 'rejected',
    serviceType: 'car_rental',
    vehicleName: 'Honda City',
    seatingCapacity: 4,
    tripType: 'local',
    stops: ['Delhi'],
    travelInDays: 2,
    days: 1,
  },
  {
    customerName: 'Kavya Menon',
    customerPhone: '+91 93111 77665',
    customerEmail: 'kavya.menon@example.com',
    status: 'sent',
    serviceType: 'tempo_traveller',
    vehicleName: 'Force Traveller',
    seatingCapacity: 26,
    tripType: 'one_way',
    stops: ['Delhi', 'Dehradun'],
    travelInDays: 15,
    days: 1,
  },
  {
    customerName: 'Rohit Bansal',
    customerPhone: '+91 98110 55443',
    customerEmail: null,
    status: 'draft',
    serviceType: 'rail_rental',
    vehicleName: 'Saloon Car',
    seatingCapacity: null,
    tripType: 'round_trip',
    stops: ['Delhi', 'Udaipur'],
    travelInDays: 45,
    days: 5,
  },
];

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

function startOfToday(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * QU-<year created>-<6 digits>, e.g. "QU-2026-482913".
 * The 6 digits come from an integer hash of the serial, so they look
 * random but each row keeps the same number on every launch (the 36
 * fixture serials, 93–128, all hash to distinct values).
 */
function quotationNumberFor(createdAt: Date, serial: number): string {
  let h = Math.imul(serial ^ 0x5bd1e995, 0x27d4eb2d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x165667b1);
  h ^= h >>> 13;
  const digits = ((h >>> 0) % 900000) + 100000;
  return `QU-${createdAt.getFullYear()}-${digits}`;
}

function buildFixture(): UcQuotationListItem[] {
  const now = new Date();
  const today = startOfToday(now);
  const rows: UcQuotationListItem[] = [];

  // Three passes over the seeds → 36 rows, enough to exercise paging.
  const TOTAL = SEEDS.length * 3;
  for (let i = 0; i < TOTAL; i += 1) {
    const seed = SEEDS[i % SEEDS.length];
    const pass = Math.floor(i / SEEDS.length);
    const serial = 128 - i;

    // Row 0–1 created earlier today; then roughly one per ~11 hours back.
    const createdAt =
      i < 2
        ? new Date(now.getTime() - (i + 1) * 47 * MINUTE)
        : new Date(now.getTime() - i * 11 * 60 * MINUTE);
    const travel = new Date(
      today.getTime() + (seed.travelInDays + pass * 7) * DAY,
    );
    // Mock only: the real end date comes from the server. Here the
    // last day of travel is start + (days − 1), so a one-day trip
    // starts and ends on the same date.
    const travelEnd = new Date(travel);
    travelEnd.setDate(travelEnd.getDate() + seed.days - 1);

    rows.push({
      id: asQuotationId(`uc-q-${serial}`),
      quotationNumber: quotationNumberFor(createdAt, serial),
      status: seed.status,
      customerId: `uc-c-${(i % SEEDS.length) + 1}`,
      customerName: seed.customerName,
      customerPhone: seed.customerPhone,
      customerEmail: seed.customerEmail,
      serviceType: seed.serviceType,
      vehicleName: seed.vehicleName,
      seatingCapacity: seed.seatingCapacity,
      tripType: seed.tripType,
      stops: seed.stops,
      travelDateStart: asISODateTime(travel.toISOString()),
      travelDateEnd: asISODateTime(travelEnd.toISOString()),
      days: seed.days,
      createdAt: asISODateTime(createdAt.toISOString()),
      updatedAt: asISODateTime(createdAt.toISOString()),
    });
  }
  return rows;
}

export const fixtureUcQuotationsAll: readonly UcQuotationListItem[] =
  buildFixture();
