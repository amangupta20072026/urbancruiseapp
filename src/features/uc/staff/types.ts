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
 * so a new department (e.g. 'Marketing') needs no app update: it gets
 * the neutral badge colour until it is added to DEPARTMENT_COLOR.
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
  /** Sub-department within `department` (e.g. 'Recruitment' in HR).
   * Free text from the server; optional — the contact sheet hides the
   * row when it is not set. */
  subDepartment?: string;
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
/* Department badge colours                                           */
/* ------------------------------------------------------------------ */

export type DepartmentColor = { bg: string; fg: string };

/**
 * One colour per known department, keyed in lowercase. Every fg is
 * >= 4.5:1 on its bg (WCAG AA, small text):
 *   admin 7.07 · it 5.17 · hr 5.14 · sales 4.84
 *   accounts 6.37 · graphics 5.98 · seo 4.86 · neutral 6.92
 * To colour a new department, add one line here.
 */
const DEPARTMENT_COLOR: Readonly<Record<string, DepartmentColor>> = {
  admin: { bg: '#EEF2FF', fg: '#4338CA' }, // indigo
  it: { bg: '#E0F2FE', fg: '#0369A1' }, // sky blue
  hr: { bg: '#FCE7F3', fg: '#BE185D' }, // pink
  sales: { bg: '#D1FAE5', fg: '#047857' }, // emerald
  accounts: { bg: '#FEF3C7', fg: '#92400E' }, // amber (darker text)
  graphics: { bg: '#EDE9FE', fg: '#6D28D9' }, // violet
  seo: { bg: '#CCFBF1', fg: '#0F766E' }, // teal
};

/** Departments not in DEPARTMENT_COLOR (slate). */
export const DEPARTMENT_COLOR_NEUTRAL: DepartmentColor = {
  bg: '#F1F5F9',
  fg: '#475569',
};

/**
 * Badge colour for a department. Case and surrounding spaces are
 * ignored ('SEO', 'seo', ' Seo '); unknown or empty → neutral.
 */
export function departmentColor(
  department: string | null | undefined,
): DepartmentColor {
  const key = (department ?? '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(DEPARTMENT_COLOR, key)
    ? DEPARTMENT_COLOR[key]
    : DEPARTMENT_COLOR_NEUTRAL;
}

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
