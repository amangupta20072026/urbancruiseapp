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

export type VendorStatus = 'active' | 'pending' | 'suspended' | 'inactive';

export const VENDOR_STATUS_LABEL: Record<VendorStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  suspended: 'Suspended',
  inactive: 'Inactive',
};

/** KYC verification of the vendor's documents. Separate from `status`,
 *  which says whether the vendor may take work. */
export type VendorVerification = 'verified' | 'pending' | 'rejected';

export const VENDOR_VERIFICATION_LABEL: Record<VendorVerification, string> = {
  verified: 'Verified',
  pending: 'Pending',
  rejected: 'Rejected',
};

export type Vendor = {
  id: string;
  /** Contact person / owner. The directory card's title. */
  ownerName: string;
  /** Business name. Shown on the directory card below the owner name. */
  companyName: string;
  /** Primary business phone (with country code). */
  phone: string;
  /** Secondary line — optional. Some vendors only have one line. */
  phoneAlt?: string;
  email: string;
  city: string;
  /** Full postal address as one text (DB: single full-address column).
   * Shown on the directory card. Empty string when not set. */
  address: string;
  /** GST number, when registered. Displayed on the sheet. */
  gstin?: string;
  /** PAN (Permanent Account Number), when on file. Displayed on the sheet. */
  pan?: string;
  /** Free text from the server (e.g. 'Transport Services'), when set. */
  businessType?: string;
  status: VendorStatus;
  verification: VendorVerification;
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
