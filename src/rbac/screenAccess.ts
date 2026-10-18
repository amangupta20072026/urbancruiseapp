// src/rbac/screenAccess.ts

/**
 * ------------------------------------------------------------------
 * Shared-screen access — the ONE place that decides who sees what
 * ------------------------------------------------------------------
 * Some screens are built once and reused by several roles (Settings,
 * Support, Help topics, Profile, …). This table says which roles get
 * each of them. Everything else is derived from it:
 *
 *   - Navigators     → `renderSharedScreens(Stack, role)` registers
 *                      exactly these screens for the role
 *                      (src/navigation/sharedScreens.tsx).
 *   - Route types    → each role's ParamList includes exactly these
 *                      screens via `SharedScreensFor<role>`
 *                      (src/navigation/types.ts), so TypeScript rejects
 *                      navigation to a screen the role doesn't have.
 *   - Menus          → Settings cards and Help-hub tiles call
 *                      `canAccess(role, screen)` before showing an
 *                      entry, so a menu can never point at a screen
 *                      that isn't registered for the role.
 *
 * TO CHANGE ACCESS: edit one line below. Navigators, types and menus
 * follow automatically.
 *
 * SECURITY NOTE:
 *   This table controls what the APP SHOWS. It is not a security
 *   boundary — anyone can modify a client. The real protection is the
 *   backend: `authenticate` + `authorize` on every route, and reading
 *   the user from the access token (never from the request body) for
 *   "own data" endpoints such as Profile and Notifications. Keep the
 *   backend permission matrix (shared/rbac/policies.ts) in step with
 *   this table when a role is enabled.
 * ------------------------------------------------------------------
 */

import type { SharedStackParamList } from '@navigation/types';
import type { UserRole } from './roles';

/** Every screen that can be shared between roles. */
export type SharedScreen = keyof SharedStackParamList;

const ALL_ROLES = ['customer', 'vendor', 'driver', 'uc'] as const;
const FIELD_ROLES = ['customer', 'vendor', 'driver'] as const;

/**
 * Who can open each shared screen.
 *
 * `satisfies` checks two things at compile time: every SharedScreen
 * has an entry, and every entry lists only real roles — while still
 * keeping the literal role lists for the type-level helpers below.
 */
export const SCREEN_ACCESS = {
  // ── Every role ─────────────────────────────────────────────────
  Settings: ALL_ROLES,
  Support: ALL_ROLES,
  AboutUrbanCruise: ALL_ROLES,
  // "Own data" screens: one component for every role. The backend
  // returns only the signed-in user's data, identified from the
  // access token.
  Profile: ALL_ROLES,
  NotificationCentre: ALL_ROLES,

  // ── Help & Support (UC staff are internal: Support only) ───────
  HelpSupport: FIELD_ROLES,
  PaymentsHelp: FIELD_ROLES,
  AccountHelp: FIELD_ROLES,
  SafetyHelp: FIELD_ROLES,
  FeedbackHelp: FIELD_ROLES,
  QuotationHelp: ['customer'],
  BookingHelp: ['customer'],

  // ── Customer only ──────────────────────────────────────────────
  NotificationPreferences: ['customer'],
} as const satisfies Record<SharedScreen, readonly UserRole[]>;

/**
 * Type-level version of the table: the shared screens role `R` has.
 * Used by navigation/types.ts to build each role's ParamList.
 */
export type SharedScreensFor<R extends UserRole> = {
  [S in SharedScreen]: R extends (typeof SCREEN_ACCESS)[S][number] ? S : never;
}[SharedScreen];

/**
 * True when `role` can open `screen`. A missing role (signed out,
 * still bootstrapping) can open nothing — fail closed.
 */
export function canAccess(
  role: UserRole | null | undefined,
  screen: SharedScreen,
): boolean {
  if (!role) return false;
  return (SCREEN_ACCESS[screen] as readonly UserRole[]).includes(role);
}

/** Every shared screen `role` can open, in table order. */
export function sharedScreensFor(role: UserRole): SharedScreen[] {
  return (Object.keys(SCREEN_ACCESS) as SharedScreen[]).filter(screen =>
    canAccess(role, screen),
  );
}
