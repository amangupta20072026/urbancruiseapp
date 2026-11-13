/**
 * ------------------------------------------------------------------
 * Fixture — Workplace dashboard
 * ------------------------------------------------------------------
 * Placeholder rows for the 'general' workspace home screen. There is
 * no table behind tasks or announcements in either database, so these
 * stand in until one exists.
 *
 * WHEN THE BACKEND SHIPS, DELETE THIS FILE and set USE_MOCK = false
 * in useWorkplaceDashboard.ts. Nothing else should need to change.
 *
 * Nothing here is real: no real person, no real date, no real policy.
 * ------------------------------------------------------------------
 */

import { asISODate } from '@app-types/datetime';
import type {
  WorkplaceAnnouncement,
  WorkplaceDashboardData,
  WorkplaceTask,
} from '@features/uc/workplace/types';

const fixtureTasks: WorkplaceTask[] = [
  {
    id: 'task-1',
    title: 'Update monthly report',
    dueOn: asISODate('2026-11-18'),
    priority: 'high',
    done: false,
  },
  {
    id: 'task-2',
    title: 'Prepare team presentation',
    dueOn: asISODate('2026-11-20'),
    priority: 'medium',
    done: false,
  },
  {
    id: 'task-3',
    title: 'Review vendor invoices',
    dueOn: asISODate('2026-11-21'),
    priority: 'low',
    done: false,
  },
];

const fixtureAnnouncements: WorkplaceAnnouncement[] = [
  {
    id: 'ann-1',
    title: 'Office holiday — Guru Nanak Jayanti',
    body: 'Both offices will remain closed on 24 Nov 2026.',
    postedOn: asISODate('2026-11-12'),
  },
  {
    id: 'ann-2',
    title: 'New expense claim process',
    body: 'Claims now go through the Finance team directly. Details in Company Resources.',
    postedOn: asISODate('2026-11-09'),
  },
];

export const fixtureWorkplaceDashboard: WorkplaceDashboardData = {
  tasks: fixtureTasks,
  announcements: fixtureAnnouncements,
};
