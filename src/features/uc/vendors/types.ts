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
  /** Free text from the server (e.g. 'Transport Services'), when set.
   *  Not shown on the contact sheet (product decision). */
  businessType?: string;
  /**
   * The contact person's role in the vendor company, as a key from the
   * server (e.g. 'operations_manager'). Optional: vendors without one
   * show no Designation row. Label via vendorDesignationLabel().
   */
  designation?: string;
  status: VendorStatus;
  verification: VendorVerification;
  /** Number of vehicles onboarded — proxy for vendor size. */
  vehicleCount: number;
  /** Number of active drivers. Used by the Drivers tab's vendor filter. */
  driverCount: number;
  createdAt: ISODateTime;
};

/* ------------------------------------------------------------------ */
/* Designation                                                        */
/* ------------------------------------------------------------------ */

/**
 * Designations known to the app today. The full list will come from
 * the backend; until then these three keys get fixed labels.
 */
export type VendorDesignation =
  | 'admin'
  | 'operations_manager'
  | 'booking_manager';

export const VENDOR_DESIGNATION_LABEL: Record<VendorDesignation, string> = {
  admin: 'Admin',
  operations_manager: 'Operations Manager',
  booking_manager: 'Booking Manager',
};

const isKnownDesignation = (key: string): key is VendorDesignation =>
  Object.prototype.hasOwnProperty.call(VENDOR_DESIGNATION_LABEL, key);

/**
 * Display label for a designation key, or null when there is none.
 * A key the app doesn't know yet (added on the backend first) is
 * shown readable instead of hidden: 'fleet_manager' → 'Fleet Manager'.
 */
export function vendorDesignationLabel(
  raw: string | null | undefined,
): string | null {
  const key = (raw ?? '').trim();
  if (!key) return null;
  if (isKnownDesignation(key)) return VENDOR_DESIGNATION_LABEL[key];
  return key
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

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
