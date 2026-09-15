/**
 * ------------------------------------------------------------------
 * Customer Quotations — types
 * ------------------------------------------------------------------
 * SSoT for the Quotations tab list. Distinct from
 * `features/customer/home/types` (which holds the home-screen hero
 * card's `QuotationSummary`) — those two consumers show different
 * fields and have different lifecycle needs, so they intentionally
 * do not share a type.
 *
 * When the /customer/quotations endpoint lands, the API DTO will map
 * onto `CustomerQuotationListItem` verbatim; only `status` might
 * need a client-side enum mapping.
 *
 * DESIGN NOTE (Aug/Sep 2026 redesign):
 *   The Quotations tab was reworked to a receipt-style card that
 *   shows a priced quotation (multi-stop route, travel window with
 *   nights/days, passenger breakdown, total amount). The prior
 *   list showed a raw quotation REQUEST (single-hop, no price) and
 *   was collapsed into the RequestQuotation entry point at the app
 *   root. As a result:
 *     - `QuotationStatus` is trimmed to the three states a priced
 *        quotation can be in from the customer's point of view:
 *        pending (ops still preparing / customer hasn't decided),
 *        accepted (customer confirmed), expired (window elapsed).
 *     - `QuotationFilter` mirrors those three states plus `all`.
 *     - Item shape is priced + multi-stop.
 * ------------------------------------------------------------------
 */

import type { QuotationId } from '@app-types/ids';

/**
 * Customer-facing lifecycle status of a priced quotation.
 *
 *   pending  — quotation issued; customer has not yet accepted, and
 *              it has not yet expired.
 *   accepted — customer accepted; a booking is being / has been
 *              created downstream.
 *   expired  — the acceptance window elapsed without a decision.
 *              Distinct from `rejected` (which was a customer-driven
 *              decline in the older request model) — expiry is
 *              time-driven and not the customer's fault.
 */
export type QuotationStatus = 'pending' | 'accepted' | 'expired';

/**
 * Chip-strip filter buckets. `all` is a virtual filter (matches
 * every status); the remaining chips map 1:1 to a `QuotationStatus`.
 */
export type QuotationFilter = 'all' | 'pending' | 'accepted' | 'expired';

/**
 * Service category the quotation was requested under. Distinct from
 * `stops` (the actual route) — e.g. a `pickup_drop` job can still
 * have the same origin/destination city as a `round_trip` one; the
 * difference is billing/usage intent, not geometry. Shared between
 * the Request Quotation form (where the customer picks it) and the
 * Quotation Details screen (where it's shown read-only as a badge)
 * so the three values only live in one place.
 */
export type TripType = 'one_way' | 'round_trip' | 'pickup_drop';

export type CustomerQuotationListItem = {
  id: QuotationId;

  /**
   * Human-facing quotation number, e.g. "QU10257".
   * NB: distinct from the older QREQ- (request) numbering — a
   * quotation is issued by ops in response to a request, so the
   * numbers do not share a namespace with request IDs.
   */
  quotationNumber: string;

  status: QuotationStatus;

  /** Service category the trip was requested under. */
  tripType: TripType;

  /**
   * Ordered list of cities on the itinerary. First entry is the
   * origin; last entry is the final drop-off (which may equal the
   * origin for round trips). Modelled as `readonly string[]` for
   * flexibility with future intermediate stops; the card renders
   * them joined with arrows.
   *
   * INVARIANT: length ≥ 2. A zero- or single-stop trip has no
   * meaningful visualisation on this card.
   */
  stops: readonly string[];

  /** ISO date of travel start (inclusive). */
  travelDateStart: string;
  /** ISO date of travel end (inclusive). */
  travelDateEnd: string;

  /**
   * Duration components as ops quoted them. Kept as separate ints
   * rather than derived from the date pair because ops sometimes
   * quotes fractional-night packages (e.g. red-eye returns) that a
   * naïve `dateDiff / 24h` calculation would miscount.
   */
  nights: number;
  days: number;

  /** Adult passenger count. */
  adults: number;
  /** Child passenger count (0 or more). */
  children: number;

  /**
   * Total quotation amount in Indian rupees (INR, whole rupees —
   * paise are irrelevant at quotation granularity and the backend
   * currently rounds server-side). Rendered with `₹` grouping in
   * `en-IN` locale by the card.
   */
  amount: number;

  /** ISO timestamp when the quotation was issued to the customer. */
  createdAt: string;
};

/* ================================================================
 * DETAIL SHAPE
 * ================================================================
 * The detail screen consumes a richer object than the list — it
 * needs per-stop addresses, the vehicle assigned to the trip, a
 * curated Terms & Conditions block, and lifecycle timestamps
 * (accepted-at / expires-at) that don't matter on the list card.
 *
 * DESIGN CHOICE — separate type, not extension of the list item:
 *   The list card and detail screen have wildly different data
 *   needs. Baking every detail field into `CustomerQuotationListItem`
 *   would bloat the list query and make `mocks.ts` noisy. Instead
 *   the detail type EXTENDS the list item, so the detail screen
 *   receives everything the card had plus the extras — and the
 *   list query stays cheap.
 *
 * INVARIANT (checked at runtime by the mock loader — see mocks.ts):
 *   `stopDetails.length === stops.length` and `stopDetails[i].city
 *   === stops[i]`. Enforcing this in the type would require a
 *   dependent-typing dance TS can't do cleanly, so it's a mock
 *   assertion instead. The server will guarantee it structurally.
 * ================================================================ */

/**
 * A single stop in the itinerary — city plus a human-readable
 * pickup/drop address. Rendered in the horizontal timeline on the
 * detail screen (title on top, address underneath).
 */
export type QuotationStop = {
  city: string;
  /** e.g. "Indira Gandhi International Airport, Delhi" */
  address: string;
};

/**
 * Vehicle assigned to the quotation. `image` is a `require()` result
 * (RN's static asset registry number) — kept nullable so the mock
 * can fall back to a generic placeholder when a brand-specific asset
 * isn't shipped yet.
 *
 * FUEL is an enum (not a free string) so downstream widgets — e.g.
 * a fuel-type chip — can style consistently.
 */
export type QuotationVehicle = {
  name: string; // "Tempo Traveller"
  image: number; // require('@assets/images/…')
  seater: number;
  fuel: 'Diesel' | 'Petrol' | 'CNG' | 'Electric';
  ac: boolean;
  hasLuggageSpace: boolean;
};

/**
 * A single Terms & Conditions tile rendered in the 4-column grid.
 * `variant` picks the icon + colour treatment; keeping this as a
 * discriminant rather than raw icon/colour props means product can
 * reorder / relabel tiles without callers needing to know about
 * lucide components or hex values.
 *
 *   toll     — included/excluded flag for toll charges
 *   parking  — parking + police entry rules
 *   extra_km — per-km overage rate
 *   night    — driver-night-charge rules
 */
export type QuotationTerm = {
  variant: 'toll' | 'parking' | 'extra_km' | 'night';
  title: string;
  /** 1–2 short lines shown under the title. */
  lines: readonly string[];
};

/**
 * The travel executive (a.k.a. consultant) assigned to a customer's
 * quotation. Consumed by the "Request Changes" sheet — the sheet
 * shows this person's card so the customer knows exactly who is
 * going to receive the request and can reach them directly by
 * phone if they'd rather not fill in the form.
 *
 * `avatar` is a `require()`-returned asset number, kept optional
 * so the sheet can fall back to an initials-based placeholder when
 * the exec doesn't have a photo (or when the CDN URL is stale in
 * the future API-backed version). `phoneE164` is stored in E.164
 * form (with `+`) so `makePhoneCall` / `openWhatsApp` from
 * `@services/contact` accept it verbatim — the display string is
 * derived per-render.
 *
 * `slaLine` is intentionally a short free-text line (e.g. "Usually
 * replies within 5 minutes") so ops can tune the promise per exec
 * / per business-hour bucket without a schema change.
 */
export type TravelExecutive = {
  id: string;
  name: string;
  role: string; // e.g. "Travel Consultant"
  phoneE164: string; // "+919876543210"
  /** Email address used by the quotation-detail advisor email action. */
  email?: string;
  avatar?: number; // require('@assets/...') result, optional
  slaLine: string; // "Usually replies within 5 minutes"
};

/**
 * Categories the customer can flag on a "Request Changes" form.
 * Kept as a discriminated string union (rather than free text) so
 * the ops-side dashboard can aggregate by category — e.g. "20% of
 * change requests hit Pickup Time; revisit our default slot".
 *
 * `other` remains for anything not covered above; the sheet
 * requires `notes` when only `other` is selected so ops always
 * has context.
 */
export type QuotationChangeCategory =
  | 'vehicle'
  | 'price'
  | 'travel_date'
  | 'pickup_time'
  | 'route'
  | 'passenger_count'
  | 'pickup_drop_location'
  | 'other';

/**
 * Payload the "Request Changes" sheet emits on submit. Shape maps
 * onto the POST `/customer/quotations/:id/change-requests` DTO
 * verbatim when the endpoint ships.
 */
export type QuotationChangeRequest = {
  categories: readonly QuotationChangeCategory[];
  /** Free-text notes; may be empty when at least one category is set. */
  notes: string;
};

/**
 * Full detail record. Consumed by `QuotationDetailScreen`. When the
 * `/customer/quotations/:id` endpoint ships, replace the mock lookup
 * with a TanStack Query hook keyed on `quotationId` — the DTO maps
 * onto this type verbatim.
 *
 * LIFECYCLE TIMESTAMPS:
 *   - `acceptedAt` is present iff `status === 'accepted'`
 *   - `expiresAt` is present iff `status === 'pending' | 'expired'`
 *   The type keeps them both optional (rather than a discriminated
 *   union) so the screen can read them without narrowing gymnastics
 *   in every render — invalid combos are the mock's / server's job
 *   to prevent.
 */
export type CustomerQuotationDetail = CustomerQuotationListItem & {
  /** Per-stop addresses; length + order match `stops`. */
  stopDetails: readonly QuotationStop[];

  vehicle: QuotationVehicle;

  /**
   * Left half of the inclusions banner ("Prices include …").
   * Free text so ops can tweak wording per quotation without a
   * schema change.
   */
  priceIncludes: string;

  /** Right half of the inclusions banner (e.g. "AC OFF on hills"). */
  priceExtra: string;

  /** Four-tile Terms & Conditions grid, in display order. */
  terms: readonly QuotationTerm[];

  /**
   * The travel executive on the customer's side. The "Request
   * Changes" sheet renders their card so the customer knows who
   * will pick up the request.
   */
  travelExecutive: TravelExecutive;

  /**
   * Booking-advance amount in INR (whole rupees). Shown on the
   * "Ready to Book" sheet as the deposit required to lock the
   * vehicle. Stored on the record (not derived from `amount`) so
   * ops can tune the % per quotation without a code change — the
   * mock currently sets it to 25% of total.
   */
  advanceAmount: number;

  /** Set when accepted. ISO timestamp. */
  acceptedAt?: string;

  /** Set when pending or expired. ISO timestamp. */
  expiresAt?: string;
};
