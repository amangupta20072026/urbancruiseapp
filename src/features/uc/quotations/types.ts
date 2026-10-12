/**
 * ------------------------------------------------------------------
 * UC Quotations — domain types
 * ------------------------------------------------------------------
 * Shapes used by the UC "Quotations" tab (list, filters, actions).
 * The list item mirrors what `GET /uc/quotations` is expected to
 * return per row, so swapping the fixture for the real endpoint is a
 * one-line change in `useUcQuotationList`.
 *
 * Money is carried as `amountPaise` (integer paise) — the same unit
 * as `@app-types/currency` — so no floating-point rupees ever reach
 * a total. `null` means "not priced yet" (typical for drafts).
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
  /** Human-facing number, e.g. "Q-2025-00128". Rendered with a leading "#". */
  quotationNumber: string;
  status: UcQuotationStatus;

  customerId: string;
  customerName: string;
  /** Display format, e.g. "+91 98765 43210". */
  customerPhone: string;

  serviceType: UcServiceType;
  /** Vehicle class / variant, e.g. "Sedan", "12 Seater", "Executive". */
  vehicleLabel: string;

  tripType: UcTripType;
  /** Ordered cities. One entry for local trips. */
  stops: readonly string[];

  /** Travel start (local calendar date at 00:00 IST, ISO). */
  travelDate: ISODateTime;
  /** Trip length in days, >= 1. */
  days: number;

  /** Quoted total in paise; null until the quotation is priced. */
  amountPaise: number | null;

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

/* ================================================================
 * Filters (filter sheet) — status lives on the chip strip, not here
 * ================================================================ */

export type UcQuotationSort =
  | 'newest'
  | 'oldest'
  | 'travelSoonest'
  | 'amountHigh';

export const UC_QUOTATION_SORT_LABEL: Readonly<
  Record<UcQuotationSort, string>
> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  travelSoonest: 'Travel date (soonest)',
  amountHigh: 'Amount (high to low)',
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
