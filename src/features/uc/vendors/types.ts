/**
 * ------------------------------------------------------------------
 * Vendor (UC directory) — entity + filter types
 * ------------------------------------------------------------------
 * A Vendor is a fleet operator onboarded onto Urban Cruise. Unlike
 * a Customer (which is often a person with a single contact number),
 * a Vendor is a business — company name is the primary identifier,
 * the "contact person" is the owner/manager we call.
 *
 * Approval status matters here: unlike customers, vendors need
 * verification before they can accept assignments. The list shows
 * the status as a badge so UC ops can spot pending ones.
 * ------------------------------------------------------------------
 */

import type { ISODateTime } from '@app-types/datetime';

export type VendorStatus = 'active' | 'pending' | 'suspended';

export const VENDOR_STATUS_LABEL: Record<VendorStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  suspended: 'Suspended',
};

export type Vendor = {
  id: string;
  /** Contact person / owner. Displayed on the card next to the company. */
  ownerName: string;
  /** Business name — the primary identifier. */
  companyName: string;
  /** Primary business phone (with country code). */
  phone: string;
  /** Secondary line — optional. Some vendors only have one line. */
  phoneAlt?: string;
  email: string;
  city: string;
  /** GST number, when registered. Displayed on the sheet. */
  gstin?: string;
  status: VendorStatus;
  /** Number of vehicles onboarded — proxy for vendor size. */
  vehicleCount: number;
  /** Number of active drivers. Used by the Drivers tab's vendor filter. */
  driverCount: number;
  createdAt: ISODateTime;
};

/* ------------------------------------------------------------------ */
/* Filters                                                            */
/* ------------------------------------------------------------------ */

export type VendorStatusFilter = 'all' | VendorStatus;

export type VendorSortBy = 'newest' | 'oldest' | 'nameAsc' | 'largestFleet';

export type VendorFilters = {
  status: VendorStatusFilter;
  sortBy: VendorSortBy;
};

export const DEFAULT_VENDOR_FILTERS: VendorFilters = {
  status: 'all',
  sortBy: 'newest',
};

export function countActiveVendorFilters(f: VendorFilters): number {
  let n = 0;
  if (f.status !== DEFAULT_VENDOR_FILTERS.status) n += 1;
  if (f.sortBy !== DEFAULT_VENDOR_FILTERS.sortBy) n += 1;
  return n;
}
