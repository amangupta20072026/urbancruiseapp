/* eslint-disable no-bitwise */
/**
 * ------------------------------------------------------------------
 * Customer trip history — deterministic mock generator
 * ------------------------------------------------------------------
 * Produces the full corpus of trips for every customer at module
 * init. Trip counts and distributions match the customer's own
 * `totalBookings` field (so a customer with `totalBookings: 317`
 * gets 317 rows here — no data-integrity mismatch between the
 * list card and the detail screen).
 *
 * DETERMINISM
 * ------------------------------------------------------------------
 * Every random-looking value is fed by a seed derived from the
 * customer id and the trip index. Reloading the app gives the same
 * trips in the same order — critical for:
 *   - React Query's cache staying stable across warm reloads
 *   - Reproducing bugs by trip id / booking ref
 *   - Screenshot tests staying stable
 *
 * Uses mulberry32 (a well-known 32-bit PRNG). Do NOT use Math.random
 * inside the generator — it would break every guarantee above.
 *
 * SHAPE INVARIANTS
 * ------------------------------------------------------------------
 *   - `completedAt` is only present when status='completed'.
 *   - `distanceKm`, `durationMinutes` are null for cancelled /
 *     no_show / upcoming (nothing was actually driven).
 *   - `rating` is only present when status='completed' AND the
 *     customer chose to rate — roughly 70% of completed trips.
 *   - `paymentStatus` follows status:
 *       completed        → paid | pending
 *       cancelled        → refunded | na
 *       no_show          → paid | na       (charge policy varies)
 *       in_progress      → pending
 *       upcoming         → na
 *   - Trips are sorted newest-first (descending `scheduledAt`).
 *
 * DELETE this file entirely when the backend goes live.
 * ------------------------------------------------------------------
 */

import { asISODateTime } from '@app-types/datetime';
import { rupeesToMoney } from '@app-types/currency';
import type {
  Trip,
  TripPaymentStatus,
  TripStatus,
} from '@features/uc/customers/types';

import { fixtureUcCustomersAll } from '@mocks/fixtures/ucCustomers';

/* ------------------------------------------------------------------ */
/* PRNG — mulberry32                                                  */
/* ------------------------------------------------------------------ */

/** 32-bit hash of a string. Used to derive per-customer seeds. */
function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/** Mulberry32 — returns a function that yields deterministic floats in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

const pick = <T>(rng: Rng, arr: readonly T[]): T =>
  arr[Math.floor(rng() * arr.length)];

const int = (rng: Rng, min: number, max: number): number =>
  Math.floor(rng() * (max - min + 1)) + min;

const chance = (rng: Rng, p: number): boolean => rng() < p;

/* ------------------------------------------------------------------ */
/* Pools                                                              */
/* ------------------------------------------------------------------ */

const CITIES = [
  'Mumbai',
  'Pune',
  'Delhi',
  'Gurugram',
  'Noida',
  'Bengaluru',
  'Chennai',
  'Hyderabad',
  'Kolkata',
  'Ahmedabad',
  'Jaipur',
  'Surat',
  'Chandigarh',
  'Indore',
  'Nagpur',
  'Kochi',
  'Manali',
  'Shimla',
  'Udaipur',
  'Goa',
] as const;

const LOCATIONS_BY_CITY: Record<string, readonly string[]> = {
  Mumbai: ['BKC', 'Andheri', 'Powai', 'Colaba', 'Bandra', 'Airport T2'],
  Pune: ['Hinjewadi', 'Koregaon Park', 'Baner', 'Airport'],
  Delhi: ['Connaught Place', 'Aerocity', 'Saket', 'Airport T3'],
  Gurugram: ['Cyber Hub', 'Golf Course Road', 'Sector 29'],
  Noida: ['Sector 62', 'Sector 18', 'Sector 137'],
  Bengaluru: ['Whitefield', 'HSR Layout', 'Koramangala', 'MG Road', 'Airport'],
  Chennai: ['Anna Nagar', 'T Nagar', 'OMR', 'Airport'],
  Hyderabad: ['HITEC City', 'Banjara Hills', 'Gachibowli', 'Airport'],
  Kolkata: ['Salt Lake', 'Park Street', 'Airport'],
  Ahmedabad: ['SG Highway', 'Prahlad Nagar'],
  Jaipur: ['MI Road', 'Malviya Nagar'],
  Chandigarh: ['Sector 17', 'IT Park'],
  Kochi: ['Ernakulam', 'Airport'],
  Manali: ['Old Manali', 'Solang'],
  Shimla: ['The Mall', 'Kufri'],
  Udaipur: ['City Palace', 'Fateh Sagar'],
  Goa: ['Panjim', 'Baga', 'Airport'],
};

const VEHICLE_TYPES = [
  'Sedan',
  'SUV',
  'Hatchback',
  'Tempo Traveller',
  'Innova Crysta',
  'Mini Bus',
  'Luxury Sedan',
] as const;

const VEHICLE_TYPE_WEIGHTS: readonly number[] = [
  30, // Sedan
  25, // SUV
  15, // Hatchback
  10, // Tempo
  10, // Innova
  6, // Mini bus
  4, // Luxury
];

const DRIVER_NAMES = [
  'Rakesh Yadav',
  'Suresh Kumar',
  'Manoj Verma',
  'Prakash Nair',
  'Ravi Shankar',
  'Anil Chauhan',
  'Deepak Singh',
  'Vinod Sharma',
  'Ganesh Iyer',
  'Sunil Rawat',
  'Bharat Patel',
  'Ashok Reddy',
  'Rohit Malhotra',
  'Sandeep Joshi',
  'Mahesh Kulkarni',
] as const;

const RTO_PREFIXES = [
  'MH-01',
  'MH-02',
  'MH-12',
  'DL-01',
  'DL-03',
  'KA-01',
  'KA-03',
  'KA-05',
  'TN-07',
  'TN-09',
  'TG-08',
  'HR-26',
  'HR-51',
  'UP-16',
  'RJ-14',
  'GJ-01',
  'WB-02',
  'PB-10',
  'CH-01',
  'KL-07',
] as const;

/* ------------------------------------------------------------------ */
/* Distributions                                                      */
/* ------------------------------------------------------------------ */

/** Weighted status roll. Numbers are approximate real-world ratios. */
function rollStatus(rng: Rng, isRecent: boolean): TripStatus {
  // Only recent (within ~14 days of today) trips can be in_progress/upcoming.
  if (isRecent) {
    const r = rng();
    if (r < 0.15) return 'upcoming';
    if (r < 0.2) return 'in_progress';
    if (r < 0.88) return 'completed';
    if (r < 0.95) return 'cancelled';
    return 'no_show';
  }
  // Historic — completed is dominant.
  const r = rng();
  if (r < 0.85) return 'completed';
  if (r < 0.94) return 'cancelled';
  return 'no_show';
}

function rollPayment(rng: Rng, status: TripStatus): TripPaymentStatus {
  switch (status) {
    case 'completed':
      return chance(rng, 0.9) ? 'paid' : 'pending';
    case 'cancelled':
      return chance(rng, 0.6) ? 'refunded' : 'na';
    case 'no_show':
      return chance(rng, 0.5) ? 'paid' : 'na';
    case 'in_progress':
      return 'pending';
    case 'upcoming':
      return 'na';
  }
}

/** Weighted vehicle pick using VEHICLE_TYPE_WEIGHTS. */
function pickVehicleType(rng: Rng): string {
  const total = VEHICLE_TYPE_WEIGHTS.reduce((s, w) => s + w, 0);
  let r = rng() * total;
  for (let i = 0; i < VEHICLE_TYPES.length; i += 1) {
    r -= VEHICLE_TYPE_WEIGHTS[i];
    if (r <= 0) return VEHICLE_TYPES[i];
  }
  return VEHICLE_TYPES[0];
}

/** Rate per km in rupees, based on vehicle type. */
function baseRatePerKm(vehicleType: string): number {
  switch (vehicleType) {
    case 'Hatchback':
      return 12;
    case 'Sedan':
      return 14;
    case 'SUV':
      return 18;
    case 'Innova Crysta':
      return 20;
    case 'Tempo Traveller':
      return 22;
    case 'Mini Bus':
      return 28;
    case 'Luxury Sedan':
      return 32;
    default:
      return 15;
  }
}

/** Random RTO-shaped vehicle number, e.g. "MH-01-AB-1234". */
function generateVehicleNumber(rng: Rng): string {
  const prefix = pick(rng, RTO_PREFIXES);
  const letterA = String.fromCharCode(65 + int(rng, 0, 25));
  const letterB = String.fromCharCode(65 + int(rng, 0, 25));
  const num = String(int(rng, 1000, 9999));
  return `${prefix}-${letterA}${letterB}-${num}`;
}

/* ------------------------------------------------------------------ */
/* Trip generation                                                    */
/* ------------------------------------------------------------------ */

const NOW = Date.now();
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

type CustomerInputForGen = {
  id: string;
  createdAt: string;
  totalBookings: number;
};

function generateTripsForCustomer(customer: CustomerInputForGen): Trip[] {
  const count = customer.totalBookings;
  if (count === 0) return [];

  const seed = hashString(customer.id);
  const rng = mulberry32(seed);

  const createdAtMs = new Date(customer.createdAt).getTime();
  const totalWindowMs = NOW - createdAtMs;
  if (totalWindowMs <= 0) return [];

  // Some trips can land up to ~2 weeks in the future (upcoming).
  const windowEndMs = NOW + TWO_WEEKS_MS;
  const windowStartMs = createdAtMs;
  const fullWindow = windowEndMs - windowStartMs;

  const trips: Trip[] = [];

  for (let i = 0; i < count; i += 1) {
    const scheduledMs = windowStartMs + Math.floor(rng() * fullWindow);
    const scheduledAt = new Date(scheduledMs);
    const isRecent = Math.abs(scheduledMs - NOW) < TWO_WEEKS_MS;
    const status = rollStatus(rng, isRecent);

    // Route
    const fromCity = pick(rng, CITIES);
    let toCity = pick(rng, CITIES);
    // 15% chance intra-city (from == to). Otherwise force different.
    if (toCity === fromCity && !chance(rng, 0.15)) {
      toCity =
        CITIES[(CITIES.indexOf(toCity) + 1 + int(rng, 0, 3)) % CITIES.length];
    }
    const fromLocs = LOCATIONS_BY_CITY[fromCity];
    const toLocs = LOCATIONS_BY_CITY[toCity];
    const fromLocation = fromLocs ? pick(rng, fromLocs) : undefined;
    const toLocation = toLocs ? pick(rng, toLocs) : undefined;

    // Vehicle
    const vehicleType = pickVehicleType(rng);
    const hasVehicleNumber = status !== 'upcoming' && chance(rng, 0.92);
    const vehicleNumber = hasVehicleNumber
      ? generateVehicleNumber(rng)
      : undefined;
    const hasDriver = status !== 'upcoming' && chance(rng, 0.9);
    const driverName = hasDriver ? pick(rng, DRIVER_NAMES) : undefined;

    // Distance / duration / amount — only meaningful for real drives
    let distanceKm: number | null = null;
    let durationMinutes: number | null = null;
    let completedAt: string | null = null;
    let amountRupees = 0;

    const isDriven = status === 'completed' || status === 'in_progress';
    if (isDriven) {
      // Intra-city 5–30 km; inter-city 60–450 km.
      distanceKm = fromCity === toCity ? int(rng, 5, 30) : int(rng, 60, 450);
      // Average 40 km/h intra-city, 60 km/h highway.
      const avgKmh = fromCity === toCity ? 25 : 55;
      durationMinutes = Math.round((distanceKm / avgKmh) * 60);

      const baseFare = 200;
      const perKm = baseRatePerKm(vehicleType);
      amountRupees = baseFare + distanceKm * perKm;
      // ±5% jitter for tolls, waiting, etc.
      const jitter = 1 + (rng() - 0.5) * 0.1;
      amountRupees = Math.round(amountRupees * jitter);

      if (status === 'completed') {
        // Completed on the same day, some hours after scheduled.
        completedAt = new Date(
          scheduledMs + durationMinutes * 60 * 1000,
        ).toISOString();
      }
    } else if (status === 'cancelled' || status === 'no_show') {
      // Cancellation fee sometimes charged (small).
      amountRupees = chance(rng, 0.4) ? int(rng, 100, 500) : 0;
    } else {
      // upcoming — pre-quoted amount based on a rough km estimate
      const estKm = fromCity === toCity ? int(rng, 5, 30) : int(rng, 60, 450);
      amountRupees = 200 + estKm * baseRatePerKm(vehicleType);
    }

    // Rating — 70% of completed trips get rated.
    const rating =
      status === 'completed' && chance(rng, 0.7)
        ? int(rng, 3, 5) // ratings skew high in the wild
        : undefined;

    // Booking ref — human-readable, e.g. "BKG-25-08-004521"
    const refYear = scheduledAt.getFullYear() % 100;
    const refMonth = String(scheduledAt.getMonth() + 1).padStart(2, '0');
    const refSeq = String(int(rng, 100000, 999999));
    const bookingRef = `BKG-${refYear}${refMonth}-${refSeq}`;

    // Trip id — globally unique per customer + index.
    const tripId = `TRP-${customer.id.slice(-6)}-${String(i + 1).padStart(
      5,
      '0',
    )}`;

    trips.push({
      id: tripId,
      customerId: customer.id,
      bookingRef,
      fromCity,
      toCity,
      fromLocation,
      toLocation,
      scheduledAt: asISODateTime(scheduledAt.toISOString()),
      completedAt: completedAt ? asISODateTime(completedAt) : null,
      status,
      vehicleType,
      vehicleNumber,
      driverName,
      distanceKm,
      durationMinutes,
      amount: rupeesToMoney(amountRupees),
      paymentStatus: rollPayment(rng, status),
      rating,
    });
  }

  // Sort newest-first by scheduled date.
  trips.sort(
    (a, b) =>
      new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
  );

  return trips;
}

/* ------------------------------------------------------------------ */
/* Corpus                                                             */
/* ------------------------------------------------------------------ */

/**
 * The full generated trip set, keyed by customerId. Generated ONCE
 * at module init from the current customer fixtures.
 */
export const mockTripsByCustomerId: Record<string, Trip[]> = (() => {
  const map: Record<string, Trip[]> = {};
  for (const customer of fixtureUcCustomersAll) {
    map[customer.id] = generateTripsForCustomer({
      id: customer.id,
      createdAt: customer.createdAt,
      totalBookings: customer.totalBookings,
    });
  }
  return map;
})();

/** Total trip count across all customers — mostly useful for logging. */
export const mockTripsTotalCount: number = Object.values(
  mockTripsByCustomerId,
).reduce((sum, trips) => sum + trips.length, 0);

if (__DEV__) {
  console.log(
    `[mock] generated ${mockTripsTotalCount} trips across ${
      Object.keys(mockTripsByCustomerId).length
    } customers`,
  );
}
