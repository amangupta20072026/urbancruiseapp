/**
 * ------------------------------------------------------------------
 * Driver (UC directory) — entity + filter types
 * ------------------------------------------------------------------
 * One driver as GET /uc/drivers returns it: the `drivers` table, joined
 * to `vendors` for the vendor name. Empty values come as null.
 *
 * Column mapping:
 *   name         ← drivers.first_name + last_name
 *   city         ← drivers.current_city
 *   vendorId     ← drivers.vendor_id (null = not linked to a vendor)
 *   vendorName   ← the linked vendor's company_name (or name)
 *   licenseNo    ← drivers.license_number
 *   verification ← drivers.status
 *
 * The Drivers tab is flat (not grouped by vendor), but supports a
 * vendor filter (vendorId) so UC ops can narrow the list to one fleet.
 * ------------------------------------------------------------------
 */

import type { ISODateTime } from '@app-types/datetime';

export type DriverVerification = 'verified' | 'pending' | 'rejected';

export const DRIVER_VERIFICATION_LABEL: Record<DriverVerification, string> = {
  verified: 'Verified',
  pending: 'Pending',
  rejected: 'Rejected',
};

export type Driver = {
  id: string;
  /** '' when not set. */
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  vendorId: string | null;
  vendorName: string | null;
  licenseNo: string | null;
  verification: DriverVerification;
  /** null when the row has no created date. */
  createdAt: ISODateTime | null;
};

/* ------------------------------------------------------------------ */
/* Filters                                                            */
/* ------------------------------------------------------------------ */

export type DriverVerificationFilter = 'all' | DriverVerification;

export type DriverSortBy = 'newest' | 'oldest' | 'nameAsc';

export type DriverFilters = {
  verification: DriverVerificationFilter;
  /** null = all vendors. Vendor id when narrowed to a single fleet. */
  vendorId: string | null;
  sortBy: DriverSortBy;
};

export const DEFAULT_DRIVER_FILTERS: DriverFilters = {
  verification: 'all',
  vendorId: null,
  sortBy: 'newest',
};

export function countActiveDriverFilters(f: DriverFilters): number {
  let n = 0;
  if (f.verification !== DEFAULT_DRIVER_FILTERS.verification) n += 1;
  if (f.vendorId) n += 1;
  if (f.sortBy !== DEFAULT_DRIVER_FILTERS.sortBy) n += 1;
  return n;
}
