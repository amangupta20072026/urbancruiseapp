/**
 * ------------------------------------------------------------------
 * UC Trips — domain types
 * ------------------------------------------------------------------
 * Shapes used by the UC "Trips" tab. `UcTripListItem` mirrors what
 * `GET /uc/trips` is expected to return per row, so swapping the
 * fixture for the real endpoint is a one-block change in
 * `useUcTripList`.
 *
 * Product rule (confirmed): one trip per booking. The Trips tab lists
 * the same records as the Bookings tab, presented trip-first (trip ID,
 * vehicle, live progress). Each row still carries its `bookingRef`
 * so a trip can always be traced back to its booking.
 *
 * Shared vocabulary (type-only imports, erased at build time):
 *   - BookingStatus       → @shared/bookings (chip buckets)
 *   - BookingProgressStep → customer bookings (tracker steps)
 *   - TripType            → customer quotations (trip type tag)
 * ------------------------------------------------------------------
 */

import type { TripId } from '@app-types/ids';
import type { ISODateTime } from '@app-types/datetime';
import type { Money } from '@app-types/currency';
import type { BookingStatus } from '@shared/bookings';
import type { BookingProgressStep } from '@features/customer/bookings/types';
import type { TripType } from '@features/customer/quotations/types';

/* ================================================================
 * Status
 * ================================================================ */

/**
 * Row status: the four shared statuses plus `no_show` (vehicle
 * reached pickup, trip never started). `no_show` keeps its own pill
 * and falls under the Cancelled chip — same rule as UC Bookings and
 * customer Trip History.
 */
export type UcTripStatus = BookingStatus | 'no_show';

/** Chip filter: the four shared statuses plus the virtual "all". */
export type UcTripStatusFilter = 'all' | BookingStatus;

/** Per-chip totals for the badges. */
export type UcTripStatusCounts = Readonly<Record<UcTripStatusFilter, number>>;

/**
 * Valid `status` / `progressStep` pairs (the backend must honour
 * these; the tracker relies on them):
 *
 *   status      progressStep
 *   upcoming    booked | confirmed
 *   ongoing     started
 *   completed   completed
 *   cancelled   booked | confirmed   (last step reached before cancel)
 *   no_show     confirmed
 */
export type { BookingProgressStep };

/* ================================================================
 * List item
 * ================================================================ */

export type UcTripListItem = {
  id: TripId;
  /** Human-facing trip ID shown on the card and searchable. */
  tripRef: string;
  /** The booking this trip belongs to (one trip per booking). */
  bookingRef: string;
  status: UcTripStatus;
  /** Last lifecycle step reached — see the pairs table above. */
  progressStep: BookingProgressStep;
  /** One Way / Round Trip / Pickup & Drop. */
  tripType: TripType;

  customerId: string;
  /** Contact person's name (for corporate/agent too). */
  customerName: string;

  fromCity: string;
  toCity: string;
  /** Pickup date-time (UTC ISO). Rendered in device local time. */
  scheduledAt: ISODateTime;
  /** Total passengers, >= 1. */
  passengers: number;

  /** Vehicle class / model, e.g. "Innova Crysta", "Sedan". */
  vehicleName: string;

  /** Trip total. */
  amount: Money;
};
