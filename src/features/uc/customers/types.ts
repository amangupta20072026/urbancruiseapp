import type { ISODateTime } from '@app-types/datetime';
import type { Money } from '@app-types/currency';
import { Colors } from '@theme';

/* ------------------------------------------------------------------
 * Customer schema — matches the 3-category business model.
 *
 *   Category      →  Sub-type (customerType)      →  Company fields
 *   personal         'personal' (auto)               —
 *   corporate        company / ngo / educational_    companyName
 *                    institute / sporting_company /
 *                    government
 *   agent            travel_agent / tour_operator /  companyName
 *                    hotel / wedding_planner / dmc
 *
 * `name` is ALWAYS the contact person's name, even for corporate /
 * agent (per product spec). The company name lives in `companyName`
 * and is only shown on the detail sheet.
 * ------------------------------------------------------------------ */

export type CustomerCategory = 'personal' | 'corporate' | 'agent';

/* Sub-types — separate string unions per category, then joined.
 * Keeping them separate lets us render category-scoped dropdowns
 * without runtime filtering. */
export type PersonalCustomerType = 'personal';

export type CorporateCustomerType =
  | 'company'
  | 'ngo'
  | 'educational_institute'
  | 'sporting_company'
  | 'government';

export type AgentCustomerType =
  | 'travel_agent'
  | 'tour_operator'
  | 'hotel'
  | 'wedding_planner'
  | 'dmc';

export type CustomerSubType =
  | PersonalCustomerType
  | CorporateCustomerType
  | AgentCustomerType;

/* Human-readable labels for UI. Keep the enum values immutable
 * (they're stored in the DB); this map is the render-time layer. */

export const CUSTOMER_CATEGORY_LABEL: Record<CustomerCategory, string> = {
  personal: 'Personal',
  corporate: 'Corporate',
  agent: 'Agent',
};

export const CUSTOMER_SUBTYPE_LABEL: Record<CustomerSubType, string> = {
  personal: 'Personal',
  company: 'Company',
  ngo: 'NGO',
  educational_institute: 'Educational Institute',
  sporting_company: 'Sporting Company',
  government: 'Government',
  travel_agent: 'Travel Agent',
  tour_operator: 'Tour Operator',
  hotel: 'Hotel',
  wedding_planner: 'Wedding Planner',
  dmc: 'DMC',
};

export type Customer = {
  id: string;
  category: CustomerCategory;
  customerType: CustomerSubType;
  /** Person's name — displayed on card and sheet, always. */
  name: string;
  /** Primary Indian phone (with country code). */
  /** Primary Indian phone (with country code). */
  phoneIndia: string;
  /** Secondary international phone (with country code). Always present. */
  phoneGlobal: string;
  email: string;
  city: string;
  /** Only meaningful for corporate + agent. */
  companyName?: string;
  gstin?: string;
  createdAt: ISODateTime;
  totalBookings: number;
  lastBookingAt: ISODateTime | null;
};

/* ------------------------------------------------------------------
 * Filter sheet state
 * ------------------------------------------------------------------ */

export type CustomerFilter = 'all' | CustomerCategory;

export type CustomerSortBy = 'newest' | 'oldest' | 'nameAsc' | 'mostTrips';

export type CustomerTripsBucket = 'all' | 'none' | '1to10' | '10plus';

export type CustomerFilters = {
  type: CustomerFilter;
  dateFrom: string | null;
  dateTo: string | null;
  sortBy: CustomerSortBy;
  tripsBucket: CustomerTripsBucket;
};

export const DEFAULT_CUSTOMER_FILTERS: CustomerFilters = {
  type: 'all',
  dateFrom: null,
  dateTo: null,
  sortBy: 'newest',
  tripsBucket: 'all',
};

export function countActiveFilters(f: CustomerFilters): number {
  let n = 0;
  if (f.type !== DEFAULT_CUSTOMER_FILTERS.type) n += 1;
  if (f.dateFrom || f.dateTo) n += 1;
  if (f.sortBy !== DEFAULT_CUSTOMER_FILTERS.sortBy) n += 1;
  if (f.tripsBucket !== DEFAULT_CUSTOMER_FILTERS.tripsBucket) n += 1;
  return n;
}

/* ==================================================================
 * TRIP HISTORY
 * ==================================================================
 * A Customer has many Trip records. `Trip` describes one completed,
 * cancelled, or scheduled booking. Every field is intentionally
 * "flat" (no nested objects) to match how CRM/dispatch backends
 * typically expose booking rows over the wire — one denormalised
 * row per trip, joined server-side.
 *
 * `amount` uses the branded `Money` type (integer paise) — never
 * raw rupees. This is the same rule the rest of the codebase
 * follows and prevents float-drift bugs in reconciliation.
 * ================================================================== */

export type TripStatus =
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'in_progress'
  | 'upcoming';

export type TripPaymentStatus = 'paid' | 'pending' | 'refunded' | 'na';

export type Trip = {
  id: string;
  customerId: string;
  bookingRef: string;

  fromCity: string;
  toCity: string;
  fromLocation?: string;
  toLocation?: string;

  scheduledAt: ISODateTime;
  completedAt: ISODateTime | null;

  status: TripStatus;

  vehicleType: string;
  vehicleNumber?: string;
  driverName?: string;

  distanceKm: number | null;
  durationMinutes: number | null;

  amount: Money;
  paymentStatus: TripPaymentStatus;

  rating?: number;
};

/* ------------------------------------------------------------------
 * History filter
 * ------------------------------------------------------------------ */

export type HistoryStatusFilter =
  | 'all'
  | 'completed'
  | 'cancelled'
  | 'upcoming';

export const HISTORY_STATUS_LABEL: Record<HistoryStatusFilter, string> = {
  all: 'All',
  completed: 'Completed',
  cancelled: 'Cancelled',
  upcoming: 'Upcoming',
};

export const TRIP_STATUS_LABEL: Record<TripStatus, string> = {
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No show',
  in_progress: 'In progress',
  upcoming: 'Upcoming',
};

export const TRIP_PAYMENT_LABEL: Record<TripPaymentStatus, string> = {
  paid: 'Paid',
  pending: 'Pending',
  refunded: 'Refunded',
  na: '—',
};

/* Status colour tokens — derived from centralised Colors so no hex
 * literals live in components. The `bg` is a soft tint of `fg`;
 * we use theme's own tokens for the tints. */
type StatusColorPair = { fg: string; bg: string };

export const TRIP_STATUS_COLOR: Record<TripStatus, StatusColorPair> = {
  completed: { fg: Colors.completed, bg: '#DBEAFE' },
  cancelled: { fg: Colors.cancelled, bg: '#FEE2E2' },
  no_show: { fg: Colors.warning, bg: '#FEF3C7' },
  in_progress: { fg: Colors.success, bg: '#E7F7EC' },
  upcoming: { fg: Colors.info, bg: '#E0F2FE' },
};
