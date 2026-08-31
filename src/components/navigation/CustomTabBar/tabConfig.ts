/**
 * ------------------------------------------------------------------
 * Custom Tab Bar — Per-role config
 * ------------------------------------------------------------------
 * Single source of truth for what each tab in each role stack looks
 * like. Consumed by CustomTabBar to render icons + labels + the
 * per-tab active-color that fills the floating badge.
 *
 * The keys under each role config MUST match the route.name values
 * declared inside the matching Tab.Navigator in
 * src/navigation/tabs/*.tsx.
 *
 * To tweak colors, edit only this file — the rest of the tab bar
 * consumes these values.
 * ------------------------------------------------------------------
 */

import type { ComponentType } from 'react';
import {
  CalendarCheck,
  CreditCard,
  FileText,
  Home,
  LayoutDashboard,
  MoreHorizontal,
  Route,
  Siren,
  Truck,
  UserCheck,
  Wallet,
  type LucideProps,
} from 'lucide-react-native';

import { Colors } from '@theme';
import type { UserRole } from '@rbac/roles';

/* -----------------------------------------------------------------
 * Types
 * ----------------------------------------------------------------- */

/**
 * The set of roles the tab bar renders for.
 *
 * Aliased to the canonical `UserRole` from `@rbac/roles` so there's
 * exactly ONE source of truth for the app's role union. Extending
 * `UserRole` (e.g. adding a 5th role) automatically extends the
 * `CONFIG_MAP` exhaustiveness check below — TypeScript will error
 * until a tab config is provided for the new role.
 */
export type TabRoleName = UserRole;

export type TabMeta = {
  Icon: ComponentType<LucideProps>;
  label: string;
  /** The accent used to fill the floating badge when this tab is active. */
  color: string;
};

export type TabConfig = Record<string, TabMeta>;

/* -----------------------------------------------------------------
 * Palette
 * -----------------------------------------------------------------
 * A small semantic palette pulled from `@theme` where possible.
 * Purple + pink are added here since the theme doesn't currently
 * expose them.
 * ----------------------------------------------------------------- */

const TabPalette = {
  green: Colors.primary, // #4CAF50
  amber: Colors.warning, // #F59E0B
  blue: Colors.info, // #0288D1
  orange: Colors.accent, // #FF6F00
  red: Colors.error, // #DC2626
  purple: '#7C3AED',
  pink: '#EC4899',
} as const;

/* -----------------------------------------------------------------
 * Per-role configs
 * ----------------------------------------------------------------- */

const customerTabConfig: TabConfig = {
  Home: { Icon: Home, label: 'Home', color: TabPalette.green },
  Quotations: { Icon: FileText, label: 'Quotations', color: TabPalette.blue },
  Bookings: {
    Icon: CalendarCheck,
    label: 'Bookings',
    color: TabPalette.purple,
  },
  Payments: { Icon: CreditCard, label: 'Payments', color: TabPalette.amber },
  More: { Icon: MoreHorizontal, label: 'More', color: TabPalette.pink },
};

const vendorTabConfig: TabConfig = {
  Dashboard: {
    Icon: LayoutDashboard,
    label: 'Dashboard',
    color: TabPalette.green,
  },
  Bookings: {
    Icon: CalendarCheck,
    label: 'Bookings',
    color: TabPalette.purple,
  },
  Fleet: { Icon: Truck, label: 'Fleet', color: TabPalette.orange },
  Drivers: { Icon: UserCheck, label: 'Drivers', color: TabPalette.blue },
  More: { Icon: MoreHorizontal, label: 'More', color: TabPalette.pink },
};

const driverTabConfig: TabConfig = {
  Home: { Icon: Home, label: 'Home', color: TabPalette.green },
  MyTrips: { Icon: Route, label: 'My Trips', color: TabPalette.blue },
  Emergency: { Icon: Siren, label: 'Emergency', color: TabPalette.red },
  Earnings: { Icon: Wallet, label: 'Earnings', color: TabPalette.amber },
  More: { Icon: MoreHorizontal, label: 'More', color: TabPalette.pink },
};

const ucTabConfig: TabConfig = {
  Dashboard: {
    Icon: LayoutDashboard,
    label: 'Dashboard',
    color: TabPalette.green,
  },
  Quotations: { Icon: FileText, label: 'Quotations', color: TabPalette.blue },
  Bookings: {
    Icon: CalendarCheck,
    label: 'Bookings',
    color: TabPalette.purple,
  },
  Trips: { Icon: Route, label: 'Trips', color: TabPalette.orange },
  More: { Icon: MoreHorizontal, label: 'More', color: TabPalette.pink },
};

const CONFIG_MAP: Record<TabRoleName, TabConfig> = {
  customer: customerTabConfig,
  vendor: vendorTabConfig,
  driver: driverTabConfig,
  uc: ucTabConfig,
};

export const getTabConfig = (role: TabRoleName): TabConfig => CONFIG_MAP[role];
