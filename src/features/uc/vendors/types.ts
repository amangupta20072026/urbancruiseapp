/**
 * ------------------------------------------------------------------
 * Vendor (UC directory) — entity + filter types
 * ------------------------------------------------------------------
 * A Vendor is a fleet operator onboarded onto Urban Cruise, as
 * GET /uc/vendors returns it. Read only from the `vendors` table.
 * Empty values come as null.
 *
 * Column mapping (product decisions):
 *   ownerName    ← vendors.name          (card title)
 *   companyName  ← vendors.company_name  (below the title)
 *   phone        ← vendors.phone         (main)
 *   phoneAlt     ← vendors.owner_phone   (second)
 *   email        ← vendors.email
 *   city         ← vendors.company_city
 *   address      ← vendors.address
 *   gstin / pan  ← vendors.gst_number / company_pan_number
 *   status       ← vendors.status — empty counts as Active
 *   verification ← vendors.verification (KYC)
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
  /** vendors.name — the directory card's title. '' when not set. */
  ownerName: string;
  /** Business name, shown below the title. */
  companyName: string | null;
  /** Main phone (as stored). */
  phone: string | null;
  /** Second phone (as stored). */
  phoneAlt: string | null;
  email: string | null;
  city: string | null;
  /** Full postal address as one text. Shown on the contact sheet. */
  address: string | null;
  /** GST number, when registered. Displayed on the sheet. */
  gstin: string | null;
  /** PAN, when on file. Displayed on the sheet. */
  pan: string | null;
  /** Free text from the server (e.g. 'Transport Services'). Not shown
   *  on the contact sheet (product decision). */
  businessType: string | null;
  /** null = a status this app version doesn't know → no badge. */
  status: VendorStatus | null;
  verification: VendorVerification;
  /** null when the row has no created date. */
  createdAt: ISODateTime | null;
};

/* ------------------------------------------------------------------ */
/* Filters                                                            */
/* ------------------------------------------------------------------ */

export type VendorStatusFilter = 'all' | VendorStatus;

/** 'nameAsc' sorts by the card title (vendors.name). */
export type VendorSortBy = 'newest' | 'oldest' | 'nameAsc';

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
