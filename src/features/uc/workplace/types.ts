/**
 * ------------------------------------------------------------------
 * Workplace dashboard — entity types
 * ------------------------------------------------------------------
 * The home screen for the 'general' workspace: Finance, IT, HR,
 * Digital Marketing and anyone with no department set. They do not
 * run quotations or bookings, so they get an internal-workplace home
 * instead of the business dashboard.
 *
 * EVERYTHING ON THIS SCREEN IS MOCK DATA TODAY.
 * There is no backend for tasks, meetings, approvals, helpdesk,
 * announcements or company resources — no table exists in `pinaak` or
 * `saarthi` for any of them. The shapes below are what the screen
 * needs; swapping the fixture for a real endpoint should not change
 * them. See src/mocks/fixtures/ucWorkplace.ts.
 * ------------------------------------------------------------------
 */

import type { ISODate } from '@app-types/datetime';

export type TaskPriority = 'high' | 'medium' | 'low';

export type WorkplaceTask = {
  id: string;
  title: string;
  /** Due date, 'YYYY-MM-DD'. */
  dueOn: ISODate;
  priority: TaskPriority;
  done: boolean;
};

export type WorkplaceAnnouncement = {
  id: string;
  title: string;
  body: string;
  /** Published date, 'YYYY-MM-DD'. */
  postedOn: ISODate;
};

export type WorkplaceDashboardData = {
  tasks: WorkplaceTask[];
  announcements: WorkplaceAnnouncement[];
};

/** Badge colours per priority. fg is >= 4.5:1 on bg (WCAG AA). */
export const PRIORITY_STYLE: Readonly<
  Record<TaskPriority, { label: string; bg: string; fg: string }>
> = {
  high: { label: 'High', bg: '#FEE2E2', fg: '#B91C1C' },
  medium: { label: 'Medium', bg: '#FEF3C7', fg: '#92400E' },
  low: { label: 'Low', bg: '#D1FAE5', fg: '#047857' },
};
