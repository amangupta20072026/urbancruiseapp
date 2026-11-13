/**
 * ------------------------------------------------------------------
 * UC workspace — which dashboard this staff member gets
 * ------------------------------------------------------------------
 * Resolved by the SERVER from the Saarthi department, sub-department
 * and access role (GET /api/v1/uc/workspace). The app uses the value
 * only to choose which screen to draw.
 *
 * IT IS NOT A PERMISSION. It is never sent back to the server, and no
 * endpoint authorises anything from it — the backend resolves the
 * workspace again for itself on every request. Anyone can modify a
 * mobile app, so a value that arrived here can never be trusted as
 * proof of anything.
 * ------------------------------------------------------------------
 */

export type UcWorkspace =
  /** SUPER_ADMIN / HOD. The business dashboard. */
  | 'admin'
  /** Sub-department Tele-Sales. */
  | 'telesales'
  /** Department Sales, any other sub-department. */
  | 'sales'
  /** Department VEH OPS. */
  | 'ops'
  /** Everyone else — Finance, IT, HR, Digital Marketing, unset. */
  | 'general';

/** GET /api/v1/uc/workspace response body (inside the { data } envelope). */
export type UcWorkspaceInfo = {
  workspace: UcWorkspace;
  departmentId: number | null;
  subDepartmentId: number | null;
  /**
   * Advisory only — lets the UI hide the personal-number row before a
   * list loads. The server decides again on every /uc/staff request.
   */
  canSeePersonalNumbers: boolean;
};

/**
 * Workspaces that get the business dashboard (quotations, bookings,
 * trips, margins) and the full four-tab Directory. Everything else
 * gets the Workplace dashboard and the UC-staff-only Directory.
 *
 * Telesales is listed here deliberately: it is 40 of 74 active staff
 * and shares the business dashboard until a dedicated Tele-Sales
 * screen is built. The backend still reports 'telesales' separately,
 * so splitting it later is a one-line change here.
 */
const BUSINESS_WORKSPACES: ReadonlySet<UcWorkspace> = new Set<UcWorkspace>([
  'admin',
  'sales',
  'telesales',
  'ops',
]);

export function isBusinessWorkspace(workspace: UcWorkspace): boolean {
  return BUSINESS_WORKSPACES.has(workspace);
}
