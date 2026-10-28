/**
 * ------------------------------------------------------------------
 * UC Bookings — domain types
 * ------------------------------------------------------------------
 * Shapes used by the UC "Bookings" tab (all bookings, all customers).
 * `UcBookingListItem` mirrors what `GET /uc/bookings` is expected to
 * return per row, so swapping the fixture for the real endpoint is a
 * one-block change in `useUcBookingList`.
 *
 * Vocabulary is SHARED, not re-invented:
 *   - BookingStatus      → @shared/bookings (chip buckets)
 *   - BookingProgressStep→ customer bookings (tracker steps)
 *   - TripType           → customer quotations (trip type pill)
 *   - CustomerCategory   → UC customers (Personal / Corporate / Agent)
 * All are type-only imports, erased at build time, so they do not
 * pull other features' screens into the lazily-loaded UC bundle.
 *
 * Money is `Money` (integer paise), formatted with `formatMoney`.
 * ------------------------------------------------------------------
 */

import type { BookingId } from '@app-types/ids';
import type { ISODateTime } from '@app-types/datetime';
import type { Money } from '@app-types/currency';
import type { BookingStatus } from '@shared/bookings';
import type { BookingProgressStep } from '@features/customer/bookings/types';
import type { TripType } from '@features/customer/quotations/types';
import type { CustomerCategory } from '@features/uc/customers/types';

/* ================================================================
 * Status
 * ================================================================ */

/**
 * Row status. The four shared booking statuses plus `no_show`
 * (vehicle reached pickup, trip never started). `no_show` is kept
 * separate so the pill never mislabels it as "Cancelled"; for
 * filtering it falls under the Cancelled chip — the same rule the
 * UC customer trip history uses.
 */
export type UcBookingStatus = BookingStatus | 'no_show';

/** Chip filter: the four shared statuses plus the virtual "all". */
export type UcBookingStatusFilter = 'all' | BookingStatus;

/** Chip order, left → right (matches the approved design). */
export const UC_BOOKING_STATUS_FILTERS: readonly UcBookingStatusFilter[] = [
  'all',
  'upcoming',
  'ongoing',
  'completed',
  'cancelled',
];

/** Per-chip totals for the badges. */
export type UcBookingStatusCounts = Readonly<
  Record<UcBookingStatusFilter, number>
>;

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

export type UcBookingListItem = {
  id: BookingId;
  /** Human-facing reference, e.g. "BKG-2611-467128". */
  bookingRef: string;
  status: UcBookingStatus;
  /** Last lifecycle step reached — see the pairs table above. */
  progressStep: BookingProgressStep;
  /** One Way / Round Trip / Pickup & Drop. */
  tripType: TripType;

  customerId: string;
  /** Contact person's name (for corporate/agent too). */
  customerName: string;
  /** Raw stored number. Shown masked on screen (maskPhone). */
  customerPhone: string;
  customerCategory: CustomerCategory;

  fromCity: string;
  toCity: string;
  /** Pickup date-time (UTC ISO). Rendered in device local time. */
  scheduledAt: ISODateTime;
  /** Total passengers, >= 1. */
  passengers: number;

  /** Vehicle class / model, e.g. "Innova Crysta", "Sedan". */
  vehicleName: string;
  /** Seats in the vehicle; null when the server doesn't know. */
  seatingCapacity: number | null;

  /** Booking total. */
  amount: Money;
};
