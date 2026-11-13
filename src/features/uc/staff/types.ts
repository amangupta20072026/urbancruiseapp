/**
 * ------------------------------------------------------------------
 * Staff (UC directory) — entity + filter types
 * ------------------------------------------------------------------
 * A Staff row is a member of the Urban Cruise team itself — sales,
 * ops, admin. Shown in Directory > UC Staff so any UC user can call
 * or message a teammate directly from the app instead of hunting for
 * numbers in a spreadsheet.
 *
 * Served by GET /api/v1/uc/staff, which reads the pinaak view
 * uc_staff_directory over the saarthi HR database. Saarthi is the only
 * source of truth: nothing here is editable from the app.
 *
 * Department is FREE TEXT, shown exactly as the server sends it. The
 * app keeps no fixed list, so a new department needs no app update: it
 * gets the neutral badge colour until it is added to DEPARTMENT_COLOR.
 *
 * NULLS ARE NORMAL. Saarthi records are incomplete for many staff, so
 * every field below that can be missing is typed `| null` rather than
 * being faked client-side. As of 13 Nov 2026, of 74 active staff only
 * 52 have an office number and only 13 have an office email.
 *
 * RBAC:
 *   Any UC user can see any other UC user's OFFICE phone and email.
 *   `phoneAlt` (the personal mobile) is different: the server sends
 *   that key only to callers in the HR department, by querying a view
 *   that has no personal-number column for everyone else. Never filter
 *   it in this hook — by the time a row reaches here, the decision has
 *   already been made.
 * ------------------------------------------------------------------
 */

import type { ISODateTime } from '@app-types/datetime';

export type Staff = {
  id: string;
  name: string;
  /** Department name, trimmed. One of Sales, Finance, IT, HR, VEH OPS,
   * Digital Marketing. null when not set — no badge is drawn. */
  department: string | null;
  /** Sub-department within `department` (e.g. 'Recruitment' in HR).
   * null when not set — the contact sheet hides the row. */
  subDepartment: string | null;
  /**
   * The staff member's reporting manager — another UC staff member.
   * null for people with no manager (e.g. department heads); the
   * contact sheet then hides the row.
   */
  reportingManagerId: string | null;
  /** Denormalised, like Driver.vendorName: the manager's name, joined by
   *  the server so the sheet needn't load all staff. Shown when set. */
  reportingManagerName: string | null;
  /** Office phone — the number UC staff sign in with. null when Saarthi
   * has none; the card then shows one line fewer. Never replaced with a
   * personal number. */
  phone: string | null;
  /**
   * Personal mobile. The key is ABSENT unless the signed-in user is in
   * the HR department — not null, absent — so no caller can tell a
   * withheld number from a missing one.
   */
  phoneAlt?: string;
  /** Office email. null for most staff. */
  email: string | null;
  /** Branch / office, e.g. 'Mumbai Office'. Labelled "Branch" in the UI.
   * An office, not a city: the Delhi Office is in Ghaziabad. */
  city: string | null;
  /** Whether the account is currently active. Inactive staff still
   * show up (marked "Inactive") so old records remain reachable. */
  active: boolean;
  /** Joining date from Saarthi. null when not on record — the sheet
   * then shows "—". Never filled in from the HR record's creation
   * date: an invented joining date is worse than none. */
  joinedAt: ISODateTime | null;
};

/* ------------------------------------------------------------------ */
/* Department badge colours                                           */
/* ------------------------------------------------------------------ */

export type DepartmentColor = { bg: string; fg: string };

/**
 * One colour per department, keyed in lowercase. These are the six live
 * values in saarthi.departments (verified 13 Nov 2026). Every fg is
 * >= 4.5:1 on its bg (WCAG AA, small text):
 *   veh ops 7.07 · it 5.17 · hr 5.14 · sales 4.84
 *   finance 6.37 · digital marketing 5.98 · neutral 6.92
 *
 * 'VEH OPS' is stored in Saarthi with a trailing space. The database
 * view trims it and departmentColor() trims again, so either form
 * resolves. To colour a new department, add one line here.
 */
const DEPARTMENT_COLOR: Readonly<Record<string, DepartmentColor>> = {
  sales: { bg: '#D1FAE5', fg: '#047857' }, // emerald
  hr: { bg: '#FCE7F3', fg: '#BE185D' }, // pink
  it: { bg: '#E0F2FE', fg: '#0369A1' }, // sky blue
  finance: { bg: '#FEF3C7', fg: '#92400E' }, // amber (darker text)
  'veh ops': { bg: '#EEF2FF', fg: '#4338CA' }, // indigo
  'digital marketing': { bg: '#EDE9FE', fg: '#6D28D9' }, // violet
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