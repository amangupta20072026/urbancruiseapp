/**
 * ------------------------------------------------------------------
 * Staff (UC directory) — entity + filter types
 * ------------------------------------------------------------------
 * A Staff row is a member of the Urban Cruise team itself — sales,
 * ops, admin. Shown in Directory > UC Staff so any UC user can call
 * or message a teammate directly from the app instead of hunting for
 * numbers in a spreadsheet.
 *
 * Department is FREE TEXT, shown exactly as the server sends it
 * (backend column uc_staff.department). The app keeps no fixed list,
 * so a new department (e.g. 'Marketing') needs no app update.
 *
 * RBAC:
 *   Any UC user can see any other UC user's phone/email — confirmed
 *   by product. If that ever tightens, gate at the query level
 *   (server) and via src/rbac/visibility.ts (client) — do NOT filter
 *   in this hook.
 * ------------------------------------------------------------------
 */

import type { ISODateTime } from '@app-types/datetime';

export type Staff = {
  id: string;
  name: string;
  /** Department, e.g. 'Admin', 'IT', 'HR', 'Sales'. Free text from the
   * server; empty string when not set. */
  department: string;
  /** Work phone. */
  phone: string;
  /** Personal / alternate phone. Optional. */
  phoneAlt?: string;
  email: string;
  /** Branch / office. */
  city: string;
  /** Whether the account is currently active. Inactive staff still
   * show up (marked "Inactive") so old records remain reachable. */
  active: boolean;
  joinedAt: ISODateTime;
};

/* ------------------------------------------------------------------ */
/* Filters                                                            */
/* ------------------------------------------------------------------ */

export type StaffActiveFilter = 'all' | 'active' | 'inactive';

export type StaffSortBy = 'newest' | 'oldest' | 'nameAsc';

export type StaffFilters = {
  active: StaffActiveFilter;
  sortBy: StaffSortBy;
};

export const DEFAULT_STAFF_FILTERS: StaffFilters = {
  active: 'active',
  sortBy: 'nameAsc',
};

export function countActiveStaffFilters(f: StaffFilters): number {
  let n = 0;
  if (f.active !== DEFAULT_STAFF_FILTERS.active) n += 1;
  if (f.sortBy !== DEFAULT_STAFF_FILTERS.sortBy) n += 1;
  return n;
}
