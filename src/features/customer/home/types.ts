/**
 * ==================================================================
 * Customer Home types
 * ==================================================================
 * Shape definitions for the Home tab of the customer role. Every
 * type here is CONSUMED by the home screen and its components; none
 * of these types leak outside `features/customer/home/`.
 *
 * Keeping these local (rather than in a top-level `types/` folder)
 * matches the pattern established by `uc/customers/types.ts`. When a
 * type needs to be shared across features (e.g. Trip, once we build
 * the customer-side trips tab), it gets promoted.
 * ================================================================== */

import type { ISODateTime } from '@app-types/datetime';
import type { Money } from '@app-types/currency';
import type {
  QuotationStatus,
  TripType,
} from '@features/customer/quotations/types';
import { Colors } from '@theme';

/* ------------------------------------------------------------------
 * Service mode — the top-of-screen segmented control.
 *
 * Per Q2 confirmation: both modes share the same underlying product
 * (car & bus). "Spiritual Tours" is a UX filter/theme, not a separate
 * backend model. So this state stays local to the home screen — no
 * Redux slice, no query param. When we later persist it (e.g. so
 * the user's last choice sticks across app restarts), it becomes a
 * simple MMKV read/write in the hook.
 * ------------------------------------------------------------------ */

export type ServiceMode = 'car_bus' | 'spiritual_tour';

export const SERVICE_MODE_LABEL: Record<ServiceMode, string> = {
  car_bus: 'Vehicle Rental',
  spiritual_tour: 'Spiritual Tours',
};

/* ------------------------------------------------------------------
 * Primary card: quotation status
 *
 * The home screen shows ONE of two mutually-exclusive cards at the
 * top of the content area:
 *
 *   ready         → QuotationReadyCard   (green CTA, "Review Quotation")
 *   in_progress   → QuotationReadyCard   (muted CTA, "In progress")
 *   (absent)      → RequestQuotationCard (outline CTA, "Request a Quotation")
 *
 * The absence case is the "no active quotation" state — the hook
 * returns `null` and the screen picks the empty-state card. This
 * keeps the state modelling honest: null means null, not a sentinel
 * "empty" status string.
 * ------------------------------------------------------------------ */

export type QuotationCardStatus = 'ready' | 'in_progress';

export const QUOTATION_STATUS_LABEL: Record<QuotationCardStatus, string> = {
  ready: 'Quotation ready',
  in_progress: 'Being prepared',
};

export type QuotationSummary = {
  id: string;
  /** Human-facing quotation number shown (and copyable) on the card,
   *  e.g. "QUO-2026-239147". */
  quotationNumber: string;
  /** Customer-side approval state — the "Pending" / "Accepted" /
   *  "Expired" pill. Separate from `status` (ready vs being prepared):
   *  a ready quotation is usually still pending the customer's OK. */
  approvalStatus: QuotationStatus;
  tripType: TripType;
  fromCity: string;
  toCity: string;
  /** Travel date the customer will actually leave — not creation date. */
  travelDate: ISODateTime;
  /** Last travel day (inclusive). */
  travelEndDate: ISODateTime;
  /** Days, as the team quotes them (billed days) — sent by the backend,
   *  never counted from the dates in the app. */
  durationDays: number;
  /** Number of vehicle options in the quotation (e.g. "3 Options"). */
  optionsCount: number;
  passengerCount: number;
  status: QuotationCardStatus;
};

/* ------------------------------------------------------------------
 * Upcoming trip card
 *
 * Shows the next non-cancelled trip. Multi-trip customers get only
 * the earliest — a "View All" button below routes to the (future)
 * Trips screen for the full list.
 *
 * The status field intentionally mirrors the underlying Trip.status
 * enum (from the UC-side history model) so we can share Trip-shaped
 * data across the roles later without a translation layer. That said,
 * this card only ever renders three statuses — the rest map to
 * "not currently upcoming" and are filtered upstream by the hook.
 * ------------------------------------------------------------------ */

export type UpcomingTripStatus = 'confirmed' | 'pending' | 'in_progress';

export const UPCOMING_STATUS_LABEL: Record<UpcomingTripStatus, string> = {
  confirmed: 'CONFIRMED',
  pending: 'PENDING',
  in_progress: 'IN PROGRESS',
};

/* Foreground + background colour pairs for the status pill. Sourced
 * from centralised Colors so the badge follows theme changes. */
export const UPCOMING_STATUS_COLOR: Record<
  UpcomingTripStatus,
  { fg: string; bg: string }
> = {
  confirmed: { fg: Colors.success, bg: '#E7F7EC' },
  pending: { fg: Colors.warning, bg: '#FEF3C7' },
  in_progress: { fg: Colors.info, bg: '#DBEAFE' },
};

/** Driver assigned to a trip. Present only once UC has assigned one. */
export type UpcomingTripDriver = {
  name: string;
  /** Display-ready phone, e.g. "+91 98765 43210". */
  phone: string;
};

export type UpcomingTrip = {
  /** Internal record id. Not shown to the customer. */
  id: string;
  /** Human-facing trip number shown (and copyable) on the card,
   *  e.g. "TRP-2026-0847". */
  tripNumber: string;
  status: UpcomingTripStatus;
  fromCity: string;
  toCity: string;
  /** Pickup moment (date + time) — the trip start. */
  scheduledAt: ISODateTime;
  /** Last travel day (inclusive). */
  travelEndDate: ISODateTime;
  /** Days, as the team quotes them (billed days) — sent by the
   *  backend, never counted from the dates in the app. */
  durationDays: number;
  passengerCount: number;
  vehicleName: string;
  /** e.g. "White". Optional — hidden when absent. */
  vehicleColor?: string;
  /** Registration plate, e.g. "UP16AB1234". Optional — hidden when
   *  absent. */
  vehicleRegNo?: string;
  /** Local asset path or remote URL — the card `<Image source>`
   * consumer decides which. In mock we use a placeholder URL. */
  vehicleImageUrl: string;
  /** One-way route distance in km. Optional — hidden when absent. */
  distanceKm?: number;
  /** Estimated one-way drive time in minutes. Optional — hidden when
   *  absent. */
  estimatedDurationMinutes?: number;
  /** Expected drop time at the destination on the first day.
   *  Optional — the drop line omits the time when absent. */
  expectedDropAt?: ISODateTime;
  /** Assigned driver. Absent until UC assigns one. */
  driver?: UpcomingTripDriver;
  /** When the driver reports for duty. Optional — the block is
   *  hidden when absent. */
  driverReportingAt?: ISODateTime;
  /** Free-form status line shown only while no driver is assigned,
   * e.g. "Driver details available tomorrow". Optional — the row is
   * omitted entirely when absent, rather than rendering a
   * placeholder. */
  driverDetailsNote?: string;
};

/* ------------------------------------------------------------------
 * Recent activity row
 *
 * Every event the customer has recently done or received —
 * quotations prepared, payments received, trips confirmed, etc.
 * The home screen shows the LATEST THREE with a "View All" that
 * routes to a full activity screen (built in a later sprint).
 *
 * kind ⇒ Icon component + colour pair, resolved at render time by
 * a helper (see ActivityRow.tsx). Not baked into the type so the
 * data stays serialisable and cache-friendly.
 * ------------------------------------------------------------------ */

export type ActivityKind =
  | 'quotation_prepared'
  | 'quotation_reviewed'
  | 'payment_received'
  | 'payment_pending'
  | 'trip_confirmed'
  | 'trip_completed'
  | 'trip_cancelled'
  | 'invoice_generated';

export const ACTIVITY_KIND_LABEL: Record<ActivityKind, string> = {
  quotation_prepared: 'Quotation Prepared',
  quotation_reviewed: 'Quotation Reviewed',
  payment_received: 'Payment Received',
  payment_pending: 'Payment Pending',
  trip_confirmed: 'Trip Confirmed',
  trip_completed: 'Trip Completed',
  trip_cancelled: 'Trip Cancelled',
  invoice_generated: 'Invoice Generated',
};

/* Icon-tint palette per activity kind. Same principle as
 * UPCOMING_STATUS_COLOR — screens/components look up the pair, they
 * don't hard-code colours. When a new activity kind is added, the
 * enum + label + colour + icon in ActivityRow all get updated in one
 * atomic change. */
export const ACTIVITY_KIND_COLOR: Record<
  ActivityKind,
  { fg: string; bg: string }
> = {
  quotation_prepared: { fg: Colors.success, bg: '#E7F7EC' },
  quotation_reviewed: { fg: Colors.completed, bg: '#DBEAFE' },
  payment_received: { fg: Colors.warning, bg: '#FFEDD5' },
  payment_pending: { fg: Colors.warning, bg: '#FEF3C7' },
  trip_confirmed: { fg: Colors.success, bg: '#E7F7EC' },
  trip_completed: { fg: Colors.completed, bg: '#DBEAFE' },
  trip_cancelled: { fg: Colors.error, bg: '#FEE2E2' },
  invoice_generated: { fg: Colors.warning, bg: '#FFEDD5' },
};

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  /** Short header line — e.g. "Quotation Prepared". Derived from
   * kind in mock data, but we store it for i18n/future flexibility. */
  title: string;
  /** Second line — e.g. "Delhi → Jaipur · 3 Options" or
   * "Advance payment of ₹3,750 received". Free-form content
   * because the shape varies per activity kind. */
  subtitle: string;
  timestamp: ISODateTime;
  /** For payment activities — otherwise undefined. Renders as a
   * secondary detail line. Kept optional so activity rows have a
   * uniform shape regardless of kind. */
  amount?: Money;
};

/* ------------------------------------------------------------------
 * Home screen composite
 *
 * The one shape the home screen's hook returns. Composing all three
 * feeds into one type means the screen's contract with the hook is
 * one import, not three.
 * ------------------------------------------------------------------ */

export type HomeScreenData = {
  /** Null = no active quotation → show RequestQuotationCard instead. */
  quotation: QuotationSummary | null;
  /** Null = no upcoming trip → the "Upcoming Trip" section still
   * renders, but shows its iconified empty state instead of a card. */
  upcomingTrip: UpcomingTrip | null;
  /** Empty = show the Recent Activity section with an empty state. */
  recentActivity: ActivityItem[];
};
