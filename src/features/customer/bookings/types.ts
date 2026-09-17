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

/* ------------------------------------------------------------------
 * Detail-only fields
 * ------------------------------------------------------------------
 * `CustomerBookingDetail` extends the list-item shape with the extra
 * data the BookingDetailScreen renders: the vehicle registration plate,
 * driver identity + rating, and a per-step timestamp map used by the
 * full-width progress tracker to date each completed milestone.
 *
 * Kept as a super-set (not a sibling) so the list-to-detail navigation
 * pass-through works without re-shaping. When /customer/bookings/:id
 * lands, the fetched DTO is expected to match this shape 1:1 — server
 * either includes these fields on completed bookings or omits them
 * (nullable) on bookings that haven't reached the relevant lifecycle
 * step (no driver assigned yet, no plate assigned yet).
 * ------------------------------------------------------------------
 */

/**
 * Timestamp label per progress step. Used by the detail-screen
 * tracker to render "05 Sep" under each dot. Absent keys render no
 * sub-label — same rule as `BookingProgressTracker.subLabels`.
 */
export type BookingProgressTimeline = Partial<
  Record<BookingProgressStep, string>
>;

/**
 * Driver assigned to the trip. Nullable at the top level because a
 * booking in 'upcoming' state may not have a driver assigned yet.
 * `avatarUrl` is nullable independently — a driver may exist without
 * a profile photo, in which case the UI falls back to initials.
 */
export type BookingDriver = {
  name: string;
  /** Optional remote avatar. When null, the UI renders initials. */
  avatarUrl: string | null;
  /** Aggregate rating, 0-5, one decimal. Null if unrated. */
  rating: number | null;
  /** Total number of trips completed by this driver. Drives the
   *  "(320 trips)" cred label next to the star rating. Null when
   *  the metric isn't available yet. */
  tripsCompleted: number | null;
  /** Phone in E.164 form (e.g. "+919876543210"). Used by the Call
   *  action; null hides the affordance. */
  phoneE164: string | null;
};

/**
 * Breakdown of the aggregate passenger count into adults + children.
 * Rendered as "(10 Adults, 2 Children)" under the passenger meta
 * item on the detail screen. Optional on the type because older
 * bookings may not carry it; callers must fall back to `passengers`
 * when this is null.
 */
export type PassengerBreakdown = {
  adults: number;
  children: number;
};

/**
 * Payment status vocabulary — mirrors the backend column verbatim
 * so no client-side remap is needed when /customer/bookings/:id
 * ships. `unpaid` covers both 'not paid yet' and 'refunded' since
 * neither has an amount owed by the customer; `partial` is the
 * split-tender case (advance paid, balance pending).
 */
export type BookingPaymentStatus = 'paid' | 'unpaid' | 'partial';

/**
 * Payment summary line on the detail screen. Independent from the
 * dedicated Payments tab (which drills into invoices, retries, etc)
 * — this is only what the detail card renders.
 */
export type BookingPaymentSummary = {
  status: BookingPaymentStatus;
  /** Free-text method label ("UPI", "Card •• 4321", "Cash"). Kept
   *  as a plain string so gateway-specific formatting stays on the
   *  server. Null when the booking has no successful charge. */
  method: string | null;
};

/**
 * Cancellation record — only populated when `status === 'cancelled'`.
 * Drives the "Booking Cancelled" banner and the Cancellation Details
 * card on the detail screen.
 */
export type BookingCancellation = {
  /** ISO timestamp of the cancellation event, e.g.
   *  "2026-08-12T14:15:00+05:30". Rendered both as the short date in
   *  the banner ("12 Aug 2026") and the full date+time in the details
   *  card ("12 Aug 2026, 02:15 PM"). */
  cancelledAt: string;
  /** Free-text reason, e.g. "Change of plans". */
  reason: string;
  /** Who initiated the cancellation — "You", a staff name, or
   *  "Urban Cruise Ops" for a system/ops-side cancellation. */
  cancelledBy: string;
  /** Refund amount in rupees. 0 when nothing is owed back. */
  refundAmount: number;
  /** Optional inline note next to the refund amount, e.g. "No refund
   *  applicable" or "Processed to original payment method". Null
   *  hides the info affordance. */
  refundNote: string | null;
};

/**
 * Fare split shown on the upcoming-booking detail screen: advance
 * paid at booking time vs. the balance still owed. `remainingNote`
 * renders as a small chip next to the remaining amount (e.g. "Pay
 * Later"); null hides the chip (e.g. once the balance is settled).
 */
export type BookingFareBreakdown = {
  advancePaid: number;
  /** Whole-number percent of total, e.g. 25 for "25%". */
  advancePercent: number;
  remainingAmount: number;
  remainingNote: string | null;
};

/**
 * Live tracking snapshot rendered on the ongoing-booking detail
 * screen's Live Location card. All three fields are display-ready
 * strings (formatted server-side / by the real telemetry pipeline
 * eventually) so the card can render without extra formatting.
 * Null on the detail when the booking is not currently 'ongoing'
 * or when no live feed is available yet.
 */
export type BookingLiveTracking = {
  /** Absolute ETA at the drop location, e.g. "12:45 PM". */
  etaLabel: string;
  /** Remaining travel time relative to now, e.g. "2h 15m remaining". */
  remainingLabel: string;
  /** One-line route summary shown as a chip over the map,
   *  e.g. "En route to Agra". */
  routeSummary: string;
};

export type CustomerBookingDetail = CustomerBookingListItem & {
  /** Populated only for cancelled bookings; null otherwise. */
  cancellation: BookingCancellation | null;
  /** Pickup / drop addresses for the Trip Information card. Null
   *  when not yet captured (e.g. a stale or malformed booking). */
  pickupLocation: string | null;
  dropLocation: string | null;
  /** Advance/remaining fare split for the upcoming-booking detail
   *  screen. Null once the trip completes and the simple total-only
   *  Invoice & Payment summary takes over instead. */
  fareBreakdown: BookingFareBreakdown | null;
  /** Vehicle registration plate, e.g. "MH 12 AB 4321". Null when the
   *  booking is still upcoming and no specific vehicle is assigned. */
  vehiclePlate: string | null;
  /** Fuel type label — "Diesel" / "Petrol" / "CNG" / "EV". Rendered
   *  in the vehicle-attributes strip. Null when unknown. */
  vehicleFuel: string | null;
  /** Split of the aggregate `passengers` count. Null when unknown. */
  passengerBreakdown: PassengerBreakdown | null;
  /** Assigned driver. Null until a driver is assigned. */
  driver: BookingDriver | null;
  /** ISO timestamp per lifecycle milestone reached so far. Used to
   *  render "05 Sep" (list card) or "05 Sept\n08:00 AM" (detail
   *  tracker) under each done step. Newline splits render as two
   *  lines in the detail tracker. */
  timeline: BookingProgressTimeline;
  /** Payment summary for the detail card's Invoice & Payment block.
   *  Null when the booking is pre-payment (e.g. cancelled before
   *  charge). */
  payment: BookingPaymentSummary | null;
  /** Live tracking snapshot for the ongoing-booking Live Location
   *  card. Null unless the booking is currently rolling and a feed
   *  is available. */
  liveTracking: BookingLiveTracking | null;
};
