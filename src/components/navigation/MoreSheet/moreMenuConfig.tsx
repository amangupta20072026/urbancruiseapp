/**
 * ------------------------------------------------------------------
 * MoreSheet — Per-role menu config (PURE DATA)
 * ------------------------------------------------------------------
 * Single source of truth for what the "More" bottom-sheet shows in
 * each role. Consumed by MoreSheet.tsx.
 *
 * DESIGN RULE:
 *   This file holds ONLY data — labels, icons, colors, group tags,
 *   and a string `actionId`. It NEVER imports navigation, redux, or
 *   side-effects. Behavior lives in `useMoreActions.ts`, which maps
 *   actionId → real action. This keeps config editable by anyone
 *   (product, design) without pulling in behavior concerns.
 *
 * GROUPING:
 *   Each item belongs to one of three sections rendered as visually
 *   separated blocks in the sheet:
 *     - 'account'   → identity / preferences (Profile, Notifications, Settings)
 *     - 'business'  → role-specific work items (Fleet, Customers, Finance…)
 *     - 'support'   → Support, Logout — always last, Logout in red.
 *
 * To add a new item:
 *   1. Add its id to the MoreActionId union below.
 *   2. Add a row to the appropriate per-role array, with `group`.
 *   3. Handle the id in useMoreActions.ts.
 * ------------------------------------------------------------------
 */

import type { ComponentType } from 'react';
import {
  Bell,
  LifeBuoy,
  Settings,
  User,
  Gift,
  ClipboardList,
  Truck,
  UserCheck,
  Wrench,
  BadgeIndianRupee,
  Route,
  Fuel,
  ShieldAlert,
  Award,
  Users,
  Wallet,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  LogOut,
  type LucideProps,
} from 'lucide-react-native';

import { Colors } from '@theme';

/* -----------------------------------------------------------------
 * Types
 * ----------------------------------------------------------------- */

export type MoreRole = 'customer' | 'vendor' | 'driver' | 'uc';

export type MoreGroup =
  | 'account'
  | 'directory'
  | 'business'
  | 'operations'
  | 'insights'
  | 'engagement'
  | 'support';

export type MoreActionId =
  | 'profile'
  | 'notifications'
  | 'support'
  | 'feedback'
  | 'settings'
  | 'logout'
  | 'customer.referrals'
  | 'customer.feedback'
  | 'vendor.fleet'
  | 'vendor.drivers'
  | 'vendor.payouts'
  | 'vendor.maintenance'
  | 'vendor.reports'
  | 'driver.routes'
  | 'driver.fuelLog'
  | 'driver.incidents'
  | 'driver.rewards'
  | 'uc.directory'
  | 'uc.payments'
  | 'uc.issues'
  | 'uc.performance';

export type MoreItem = {
  key: string;
  label: string;
  Icon: ComponentType<LucideProps>;
  color: string;
  actionId: MoreActionId;
  group: MoreGroup;
};

/* -----------------------------------------------------------------
 * Palette
 * ----------------------------------------------------------------- */

const Palette = {
  green: Colors.primary,
  amber: Colors.warning,
  blue: Colors.info,
  orange: Colors.accent,
  red: Colors.error,
  purple: '#7C3AED',
  pink: '#EC4899',
  slate: Colors.textPrimary,
} as const;

/* -----------------------------------------------------------------
 * Section metadata — order in which sections render in the sheet.
 * ----------------------------------------------------------------- */

export const MORE_GROUP_ORDER: MoreGroup[] = [
  'account',
  'directory',
  'business',
  'operations',
  'insights',
  'engagement',
  'support',
];

export const MORE_GROUP_LABEL: Record<MoreGroup, string> = {
  account: 'Account',
  directory: 'Directory',
  business: 'Business',
  operations: 'Operations',
  insights: 'Insights',
  engagement: 'Engagement',
  support: 'Support',
};

/* -----------------------------------------------------------------
 * Per-role menus
 * ----------------------------------------------------------------- */

const customerMore: MoreItem[] = [
  {
    key: 'profile',
    label: 'Profile',
    Icon: User,
    color: Palette.pink,
    actionId: 'profile',
    group: 'account',
  },
  {
    key: 'notifications',
    label: 'Notifications',
    Icon: Bell,
    color: Palette.amber,
    actionId: 'notifications',
    group: 'account',
  },
  {
    key: 'settings',
    label: 'Settings',
    Icon: Settings,
    color: Palette.slate,
    actionId: 'settings',
    group: 'account',
  },

  {
    key: 'referrals',
    label: 'Referral & Rewards',
    Icon: Gift,
    color: Palette.purple,
    actionId: 'customer.referrals',
    group: 'engagement',
  },
  {
    key: 'feedback',
    label: 'Feedback',
    Icon: MessageSquare,
    color: Palette.orange,
    actionId: 'customer.feedback',
    group: 'engagement',
  },

  {
    key: 'support',
    label: 'Support',
    Icon: LifeBuoy,
    color: Palette.orange,
    actionId: 'support',
    group: 'support',
  },
  {
    key: 'logout',
    label: 'Logout',
    Icon: LogOut,
    color: Palette.red,
    actionId: 'logout',
    group: 'support',
  },
];

const vendorMore: MoreItem[] = [
  {
    key: 'profile',
    label: 'Profile',
    Icon: User,
    color: Palette.pink,
    actionId: 'profile',
    group: 'account',
  },
  {
    key: 'notifications',
    label: 'Notifications',
    Icon: Bell,
    color: Palette.amber,
    actionId: 'notifications',
    group: 'account',
  },
  {
    key: 'settings',
    label: 'Settings',
    Icon: Settings,
    color: Palette.slate,
    actionId: 'settings',
    group: 'account',
  },

  {
    key: 'fleet',
    label: 'Fleet',
    Icon: Truck,
    color: Palette.orange,
    actionId: 'vendor.fleet',
    group: 'business',
  },
  {
    key: 'drivers',
    label: 'Drivers',
    Icon: UserCheck,
    color: Palette.blue,
    actionId: 'vendor.drivers',
    group: 'business',
  },
  {
    key: 'payouts',
    label: 'Payouts',
    Icon: BadgeIndianRupee,
    color: Palette.green,
    actionId: 'vendor.payouts',
    group: 'business',
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    Icon: Wrench,
    color: Palette.purple,
    actionId: 'vendor.maintenance',
    group: 'business',
  },
  {
    key: 'reports',
    label: 'Reports',
    Icon: ClipboardList,
    color: Palette.slate,
    actionId: 'vendor.reports',
    group: 'business',
  },

  {
    key: 'support',
    label: 'Support',
    Icon: LifeBuoy,
    color: Palette.orange,
    actionId: 'support',
    group: 'support',
  },
  {
    key: 'logout',
    label: 'Logout',
    Icon: LogOut,
    color: Palette.red,
    actionId: 'logout',
    group: 'support',
  },
];

const driverMore: MoreItem[] = [
  {
    key: 'profile',
    label: 'Profile',
    Icon: User,
    color: Palette.pink,
    actionId: 'profile',
    group: 'account',
  },
  {
    key: 'notifications',
    label: 'Notifications',
    Icon: Bell,
    color: Palette.amber,
    actionId: 'notifications',
    group: 'account',
  },
  {
    key: 'settings',
    label: 'Settings',
    Icon: Settings,
    color: Palette.slate,
    actionId: 'settings',
    group: 'account',
  },

  {
    key: 'routes',
    label: 'My Routes',
    Icon: Route,
    color: Palette.blue,
    actionId: 'driver.routes',
    group: 'business',
  },
  {
    key: 'fuelLog',
    label: 'Fuel Log',
    Icon: Fuel,
    color: Palette.orange,
    actionId: 'driver.fuelLog',
    group: 'business',
  },
  {
    key: 'incidents',
    label: 'Incidents',
    Icon: ShieldAlert,
    color: Palette.red,
    actionId: 'driver.incidents',
    group: 'business',
  },
  {
    key: 'rewards',
    label: 'Rewards',
    Icon: Award,
    color: Palette.green,
    actionId: 'driver.rewards',
    group: 'business',
  },

  {
    key: 'support',
    label: 'Support',
    Icon: LifeBuoy,
    color: Palette.purple,
    actionId: 'support',
    group: 'support',
  },
  {
    key: 'logout',
    label: 'Logout',
    Icon: LogOut,
    color: Palette.red,
    actionId: 'logout',
    group: 'support',
  },
];

const ucMore: MoreItem[] = [
  {
    key: 'profile',
    label: 'Profile',
    Icon: User,
    color: Palette.pink,
    actionId: 'profile',
    group: 'account',
  },
  {
    key: 'notifications',
    label: 'Notifications',
    Icon: Bell,
    color: Palette.amber,
    actionId: 'notifications',
    group: 'account',
  },
  {
    key: 'settings',
    label: 'Settings',
    Icon: Settings,
    color: Palette.slate,
    actionId: 'settings',
    group: 'account',
  },

  {
    /**
     * Single "Directory" entry replaces the four scattered entries
     * (Customers / Vendors / Drivers / Staff). It opens a top-tab
     * screen that hosts all four — one place, four tabs. Grouped
     * under Business so UC's menu collapses to the documented
     * 3-group model (Account / Business / Support).
     */
    key: 'directory',
    label: 'Directory',
    Icon: Users,
    color: Palette.blue,
    actionId: 'uc.directory',
    group: 'business',
  },
  {
    key: 'payments',
    label: 'Payments',
    Icon: Wallet,
    color: Palette.green,
    actionId: 'uc.payments',
    group: 'business',
  },
  {
    key: 'performance',
    label: 'Performance',
    Icon: TrendingUp,
    color: Palette.purple,
    actionId: 'uc.performance',
    group: 'business',
  },

  {
    key: 'feedback',
    label: 'Feedback',
    Icon: MessageSquare,
    color: Palette.orange,
    actionId: 'feedback',
    group: 'support',
  },
  {
    key: 'issues',
    label: 'Issues',
    Icon: AlertTriangle,
    color: Palette.red,
    actionId: 'uc.issues',
    group: 'support',
  },
  {
    key: 'logout',
    label: 'Logout',
    Icon: LogOut,
    color: Palette.red,
    actionId: 'logout',
    group: 'support',
  },
];

const MORE_MAP: Record<MoreRole, MoreItem[]> = {
  customer: customerMore,
  vendor: vendorMore,
  driver: driverMore,
  uc: ucMore,
};

export const getMoreMenu = (role: MoreRole): MoreItem[] => MORE_MAP[role];

/** Group an ordered menu by section, preserving item order within each section. */
export function groupMoreMenu(
  items: MoreItem[],
): Record<MoreGroup, MoreItem[]> {
  const buckets: Record<MoreGroup, MoreItem[]> = {
    account: [],
    directory: [],
    business: [],
    operations: [],
    insights: [],
    engagement: [],
    support: [],
  };
  for (const item of items) buckets[item.group].push(item);
  return buckets;
}
