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
