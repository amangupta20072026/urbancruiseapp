/**
 * ------------------------------------------------------------------
 * Customer Bookings — types
 * ------------------------------------------------------------------
 * SSoT for the Bookings tab list. Independent of the home-screen
 * `UpcomingTrip` type (in features/customer/home/types) — they show
 * different fields and have different lifecycles, so they do not
 * share a shape.
 *
 * When the /customer/bookings endpoint lands, this file is the DTO
 * contract; only enum mappings may need a tiny client-side adapter.
 * ------------------------------------------------------------------
 */

import type { BookingId } from '@app-types/ids';

/**
 * The user-facing booking status. Drives:
 *   - the status pill on the card
 *   - which action buttons render
 *   - the leading vehicle-image tile background
 *   - filter-chip bucketing
 *
 *   upcoming  — confirmed, trip in the future
 *   ongoing   — trip in progress (driver dispatched / at pickup / rolling)
 *   completed — trip finished
 *   cancelled — booking cancelled (by customer OR ops)
 */
export type BookingStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

/** Chip-strip filter buckets. `all` is a virtual filter. */
export type BookingFilter = 'all' | BookingStatus;

/**
 * Progress steps rendered inside the upcoming-booking tracker. The
 * step names are fixed by product; the `current` cursor decides
 * which step highlights and which sub-label appears.
 *
 *   booked    — enquiry converted into a booking
 *   confirmed — vendor/vehicle assigned; may still be "pending"
 *   started   — trip started (this is the transition into 'ongoing')
 *   completed — trip finished (this is the transition into 'completed')
 */
export type BookingProgressStep =
  | 'booked'
  | 'confirmed'
  | 'started'
  | 'completed';

export type CustomerBookingListItem = {
  id: BookingId;
  /** Human-facing booking id, e.g. "BK-2026-00123". */
  bookingNumber: string;
  status: BookingStatus;

  /* Journey */
  from: string;
  to: string;
  /** ISO date of travel. */
  travelDate: string;
  /** Pickup wall-clock time e.g. "09:00 AM". Kept as string so the
   *  card doesn't have to parse it back into a Date to render. */
  pickupTime: string;
  passengers: number;

  /* Vehicle — the top line is the class (Tempo Traveller / Sedan /
   * Urbania / SUV); the bottom line is the specific model +
   * amenities row (17 Seater | AC). */
  vehicleType: string;
  vehicleModel: string | null;
  seater: number | null;
  hasAC: boolean;

  /** Total booking amount in the smallest unit? No — plain rupees
   *  for the demo. When the backend lands, swap to Money and format
   *  through `rupeesToMoney` like the rest of the app. */
  totalAmount: number;

  /* Progress tracker fields — populated for every booking, not just
   * 'upcoming', so a completed card could optionally show the full
   * timeline in QuotationDetail later without refetching. */
  bookedDate: string; // ISO
  /** The step the cursor is on right now. */
  progressStep: BookingProgressStep;
  /** Optional short label under the current step, e.g. "Pending". */
  progressNote: string | null;
};
