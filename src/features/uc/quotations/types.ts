/**
 * ------------------------------------------------------------------
 * UC Quotations — domain types
 * ------------------------------------------------------------------
 * Shapes used by the UC "Quotations" tab (list, filters, actions).
 * The list item mirrors what `GET /uc/quotations` is expected to
 * return per row, so swapping the fixture for the real endpoint is a
 * one-line change in `useUcQuotationList`.
 *
 * The list row carries no price: the card does not show one and the
 * list has no amount sort. Pricing belongs to the quotation detail.
 *
 * Travel dates come from the server as a start AND an end. The app
 * never derives the end date from `days`; the server is the single
 * source of truth for both.
 * ------------------------------------------------------------------
 */

import type { QuotationId } from '@app-types/ids';
import type { ISODateTime } from '@app-types/datetime';

/* ================================================================
 * Status
 * ================================================================ */

export type UcQuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

/** Chip filter: every status plus the virtual "all". */
export type UcQuotationStatusFilter = 'all' | UcQuotationStatus;

export const UC_QUOTATION_STATUS_LABEL: Readonly<
  Record<UcQuotationStatus, string>
> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

/** Chip order, left → right. */
export const UC_QUOTATION_STATUS_FILTERS: readonly {
  key: UcQuotationStatusFilter;
  label: string;
}[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
];

/* ---------------- Filter chip colours ---------------- */

/** Colours for one status chip. */
export type UcQuotationChipTone = {
  /** Selected: the chip fill. Label is white on top of it. */
  solid: string;
  /** Unselected: the chip fill. */
  tint: string;
  /**
   * Unselected: the label colour. Usually the same as `solid`, but a
   * few statuses need a darker shade to stay readable on their own
   * tint — see the contrast table below. Keeping this separate means
   * the SELECTED chip still carries the exact card accent, so the
   * chips and the cards below them cannot drift apart.
   */
  text: string;
};

/**
 * One colour per chip, matching the status colours on UcQuotationCard
 * (its STATUS_STYLE accents). 'All' has no card, so it takes the
 * brand's royal purple — a fifth colour none of the statuses use, the
 * same choice the Bookings chips make.
 *
 * Every pair below passes WCAG AA for small text (>= 4.5:1), checked
 * both ways round:
 *
 *   chip        selected (white on solid)   unselected (text on tint)
 *   all         6.98                        5.92
 *   draft       4.83                        6.87
 *   sent        5.17                        5.49
 *   accepted    5.13                        4.62
 *   rejected    4.83                        5.30
 *
 * draft, sent and rejected use a darker `text` than `solid`: on their
 * own tints the accent itself measures 4.39, 4.24 and 3.95, all below
 * the 4.5 floor.
 */
export const UC_QUOTATION_CHIP_PALETTE: Readonly<
  Record<UcQuotationStatusFilter, UcQuotationChipTone>
> = Object.freeze({
  all: { solid: '#7E22CE', tint: '#F3E8FF', text: '#7E22CE' },
  draft: { solid: '#6B7280', tint: '#F3F4F6', text: '#4B5563' },
  sent: { solid: '#2563EB', tint: '#DBEAFE', text: '#1D4ED8' },
  accepted: { solid: '#2E7D32', tint: '#E7F7EC', text: '#2E7D32' },
  rejected: { solid: '#DC2626', tint: '#FEE2E2', text: '#B91C1C' },
});

/* ================================================================
 * Service / trip
 * ================================================================ */

export type UcServiceType =
  | 'car_rental'
  | 'bus_rental'
  | 'tempo_traveller'
  | 'rail_rental';

export const UC_SERVICE_TYPE_LABEL: Readonly<Record<UcServiceType, string>> = {
  car_rental: 'Car Rental',
  bus_rental: 'Car & Bus Rental',
  tempo_traveller: 'Tempo Traveller',
  rail_rental: 'Rail Rental',
};

export type UcTripType = 'one_way' | 'round_trip' | 'local';

export const UC_TRIP_TYPE_LABEL: Readonly<Record<UcTripType, string>> = {
  one_way: 'One Way',
  round_trip: 'Round Trip',
  local: 'Local',
};

/* ================================================================
 * List item
 * ================================================================ */

export type UcQuotationListItem = {
  id: QuotationId;
  /** Human-facing number, e.g. "QU-2026-482913". Rendered with a leading "#". */
  quotationNumber: string;
  status: UcQuotationStatus;

  customerId: string;
  customerName: string;
  /** Display format, e.g. "+91 98765 43210". */
  customerPhone: string;
  /**
   * Customer email, if on file. Optional — the backend may not send it
   * yet. Missing, null or blank → the actions sheet hides "Email".
   */
  customerEmail?: string | null;

  /** Used by the service-type filter and search; not shown on the card. */
  serviceType: UcServiceType;
  /** Vehicle model, e.g. "Force Traveller", "Toyota Innova Crysta". */
  vehicleName: string;
  /**
   * Seats in the vehicle, e.g. 13. null when the server doesn't know;
   * the card then shows the vehicle name only. Same contract as
   * UC bookings / trips (`seatingCapacity`).
   */
  seatingCapacity: number | null;

  tripType: UcTripType;
  /** Ordered cities. One entry for local trips. */
  stops: readonly string[];

  /** First day of travel (local calendar date at 00:00 IST, ISO). */
  travelDateStart: ISODateTime;
  /**
   * Last day of travel (local calendar date at 00:00 IST, ISO).
   * Equal to `travelDateStart` for a one-day trip; never before it.
   * Same naming as the customer quotations feature.
   */
  travelDateEnd: ISODateTime;
  /** Trip length in days, >= 1. */
  days: number;

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

/* ================================================================
 * Filters (filter sheet) — status lives on the chip strip, not here
 * ================================================================ */

export type UcQuotationSort = 'newest' | 'oldest' | 'travelSoonest';

export const UC_QUOTATION_SORT_LABEL: Readonly<
  Record<UcQuotationSort, string>
> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  travelSoonest: 'Travel date (soonest)',
};

export type UcQuotationFilters = {
  serviceType: 'all' | UcServiceType;
  tripType: 'all' | UcTripType;
  sortBy: UcQuotationSort;
};

export const DEFAULT_UC_QUOTATION_FILTERS: UcQuotationFilters = {
  serviceType: 'all',
  tripType: 'all',
  sortBy: 'newest',
};

/** Number of sheet filters that differ from the defaults (for the badge). */
export function countActiveQuotationFilters(f: UcQuotationFilters): number {
  let n = 0;
  if (f.serviceType !== DEFAULT_UC_QUOTATION_FILTERS.serviceType) n += 1;
  if (f.tripType !== DEFAULT_UC_QUOTATION_FILTERS.tripType) n += 1;
  if (f.sortBy !== DEFAULT_UC_QUOTATION_FILTERS.sortBy) n += 1;
  return n;
}

/** Per-status totals for the chip badges. */
export type UcQuotationStatusCounts = Readonly<
  Record<UcQuotationStatusFilter, number>
>;
