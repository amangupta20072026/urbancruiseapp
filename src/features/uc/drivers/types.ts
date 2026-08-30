/**
 * ------------------------------------------------------------------
 * Driver (UC directory) — entity + filter types
 * ------------------------------------------------------------------
 * A Driver belongs to exactly one Vendor. The Drivers directory tab
 * is flat (not grouped by vendor), but supports a "Vendor" filter
 * chip so UC ops can narrow the list to a specific fleet.
 *
 * The vendor relation is stored as a `vendorId` foreign key. The
 * `vendorName` is denormalised into the row for rendering — the
 * backend will send it joined so the card doesn't need a second
 * lookup. If the backend sends only IDs, we join it client-side
 * via useVendorList's cache; not needed today.
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
  name: string;
  phone: string;
  phoneAlt?: string;
  /** Optional — many drivers don't have email. */
  email?: string;
  city: string;
  /** Foreign key into vendors. */
  vendorId: string;
  /** Denormalised — server sends the joined name for rendering. */
  vendorName: string;
  /** License number (partial redaction later — full for UC role). */
  licenseNo: string;
  verification: DriverVerification;
  /** Total completed trips — proxy for driver seniority. */
  completedTrips: number;
  createdAt: ISODateTime;
};

/* ------------------------------------------------------------------ */
/* Filters                                                            */
/* ------------------------------------------------------------------ */

export type DriverVerificationFilter = 'all' | DriverVerification;

export type DriverSortBy = 'newest' | 'oldest' | 'nameAsc' | 'mostTrips';

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
