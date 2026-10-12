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
  status: UcQuotationStatus;
  serviceType: UcServiceType;
  vehicleLabel: string;
  tripType: UcTripType;
  stops: readonly string[];
  /** Days from today until travel. */
  travelInDays: number;
  days: number;
  /** Rupees; null = not priced yet. */
  amountRupees: number | null;
};

const SEEDS: readonly Seed[] = [
  {
    customerName: 'Rahul Sharma',
    customerPhone: '+91 98765 43210',
    status: 'accepted',
    serviceType: 'car_rental',
    vehicleLabel: 'Sedan',
    tripType: 'one_way',
    stops: ['Delhi', 'Agra'],
    travelInDays: 3,
    days: 1,
    amountRupees: 12500,
  },
  {
    customerName: 'Priya Mehta',
    customerPhone: '+91 99887 66554',
    status: 'sent',
    serviceType: 'car_rental',
    vehicleLabel: 'Hatchback',
    tripType: 'round_trip',
    stops: ['Delhi', 'Jaipur'],
    travelInDays: 9,
    days: 2,
    amountRupees: 9800,
  },
  {
    customerName: 'Amit Kumar',
    customerPhone: '+91 91234 56789',
    status: 'draft',
    serviceType: 'tempo_traveller',
    vehicleLabel: '12 Seater',
    tripType: 'local',
    stops: ['Delhi'],
    travelInDays: 11,
    days: 1,
    amountRupees: null,
  },
  {
    customerName: 'Sneha Gupta',
    customerPhone: '+91 87654 32109',
    status: 'rejected',
    serviceType: 'bus_rental',
    vehicleLabel: 'Coach',
    tripType: 'one_way',
    stops: ['Delhi', 'Chandigarh'],
    travelInDays: 19,
    days: 3,
    amountRupees: 15200,
  },
  {
    customerName: 'Vikram Singh',
    customerPhone: '+91 76543 21098',
    status: 'sent',
    serviceType: 'rail_rental',
    vehicleLabel: 'Executive',
    tripType: 'one_way',
    stops: ['Delhi', 'Varanasi'],
    travelInDays: 36,
    days: 1,
    amountRupees: 18450,
  },
  {
    customerName: 'Neha Iyer',
    customerPhone: '+91 98111 22334',
    status: 'accepted',
    serviceType: 'tempo_traveller',
    vehicleLabel: '17 Seater',
    tripType: 'round_trip',
    stops: ['Delhi', 'Rishikesh', 'Haridwar'],
    travelInDays: 14,
    days: 3,
    amountRupees: 42600,
  },
  {
    customerName: 'Karan Mehta',
    customerPhone: '+91 99100 45678',
    status: 'draft',
    serviceType: 'car_rental',
    vehicleLabel: 'SUV',
    tripType: 'one_way',
    stops: ['Gurugram', 'Jaipur'],
    travelInDays: 6,
    days: 1,
    amountRupees: 8900,
  },
  {
    customerName: 'Divya Nair',
    customerPhone: '+91 90000 11223',
    status: 'sent',
    serviceType: 'car_rental',
    vehicleLabel: 'Innova Crysta',
    tripType: 'round_trip',
    stops: ['Noida', 'Mathura', 'Vrindavan'],
    travelInDays: 8,
    days: 2,
    amountRupees: 13750,
  },
  {
    customerName: 'Suresh Rao',
    customerPhone: '+91 98989 89898',
    status: 'accepted',
    serviceType: 'bus_rental',
    vehicleLabel: '35 Seater',
    tripType: 'round_trip',
    stops: ['Delhi', 'Shimla'],
    travelInDays: 22,
    days: 4,
    amountRupees: 96000,
  },
  {
    customerName: 'Anita Deshmukh',
    customerPhone: '+91 97654 01234',
    status: 'rejected',
    serviceType: 'car_rental',
    vehicleLabel: 'Sedan',
    tripType: 'local',
    stops: ['Delhi'],
    travelInDays: 2,
    days: 1,
    amountRupees: 3200,
  },
  {
    customerName: 'Kavya Menon',
    customerPhone: '+91 93111 77665',
    status: 'sent',
    serviceType: 'tempo_traveller',
    vehicleLabel: '26 Seater',
    tripType: 'one_way',
    stops: ['Delhi', 'Dehradun'],
    travelInDays: 15,
    days: 1,
    amountRupees: 21800,
  },
  {
    customerName: 'Rohit Bansal',
    customerPhone: '+91 98110 55443',
    status: 'draft',
    serviceType: 'rail_rental',
    vehicleLabel: 'Saloon',
    tripType: 'round_trip',
    stops: ['Delhi', 'Udaipur'],
    travelInDays: 45,
    days: 5,
    amountRupees: null,
  },
];

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

function startOfToday(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
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

    rows.push({
      id: asQuotationId(`uc-q-${serial}`),
      quotationNumber: `Q-${createdAt.getFullYear()}-${String(serial).padStart(
        5,
        '0',
      )}`,
      status: seed.status,
      customerId: `uc-c-${(i % SEEDS.length) + 1}`,
      customerName: seed.customerName,
      customerPhone: seed.customerPhone,
      serviceType: seed.serviceType,
      vehicleLabel: seed.vehicleLabel,
      tripType: seed.tripType,
      stops: seed.stops,
      travelDate: asISODateTime(travel.toISOString()),
      days: seed.days,
      amountPaise:
        seed.amountRupees === null
          ? null
          : Math.round((seed.amountRupees + pass * 250) * 100),
      createdAt: asISODateTime(createdAt.toISOString()),
      updatedAt: asISODateTime(createdAt.toISOString()),
    });
  }
  return rows;
}

export const fixtureUcQuotationsAll: readonly UcQuotationListItem[] =
  buildFixture();