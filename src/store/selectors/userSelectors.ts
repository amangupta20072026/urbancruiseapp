/**
 * ------------------------------------------------------------------
 * User selectors
 * ------------------------------------------------------------------
 * Read-side accessors for `userSlice`. Screens import from HERE, never
 * from the slice directly.
 *
 * Two reasons for the split:
 *   1. Testability — components can be tested with a shallow selector
 *      mock instead of a fully-configured Redux store.
 *   2. Refactor safety — if the slice shape ever changes (e.g. profile
 *      moves under `session.profile`), only this file updates. No
 *      screen has to change.
 *
 * Naming convention: `select<Thing>` for value-returning selectors,
 * `selectIs<Thing>` for booleans. Follows Redux Toolkit convention.
 *
 * When selectors get computationally expensive (joins across slices,
 * derived list transforms), promote them to `createSelector` from
 * @reduxjs/toolkit — they auto-memoise. For now everything here is
 * an O(1) field pluck, so plain functions are fine.
 * ------------------------------------------------------------------
 */

import type { RootState } from '../index';
import type { UserProfile } from '../slices/userSlice';

/* ------------------------------------------------------------------ */
/* Core                                                               */
/* ------------------------------------------------------------------ */

/** The full profile, or null if not yet hydrated. */
export const selectUserProfile = (state: RootState): UserProfile | null =>
  state.user.profile;

/** True once the profile has been hydrated (mock or real). */
export const selectIsUserHydrated = (state: RootState): boolean =>
  state.user.profile !== null;

/* ------------------------------------------------------------------ */
/* Display shorthands                                                 */
/* ------------------------------------------------------------------ */

/**
 * User's full display name, or an empty string when not hydrated.
 * Prefer `selectFirstName` for greetings ("Good morning, Aman") —
 * this one is for headers, contact sheets, and forms where the full
 * name is expected.
 */
export const selectDisplayName = (state: RootState): string =>
  state.user.profile?.displayName ?? '';

/**
 * First name (or first word) of the display name. Falls back to an
 * empty string when not hydrated so callers can render "Good morning,"
 * without a stray comma.
 *
 * Handles the common shapes:
 *   "Aman Gupta"       → "Aman"
 *   "Aman"             → "Aman"
 *   "Dr. Aman Gupta"   → "Dr."     (edge case; acceptable)
 *   ""                 → ""
 */
export const selectFirstName = (state: RootState): string => {
  const name = state.user.profile?.displayName ?? '';
  const first = name.trim().split(/\s+/)[0];
  return first ?? '';
};

/** Stable user id — doubles as the avatar-colour seed. */
export const selectUserId = (state: RootState): string =>
  state.user.profile?.id ?? '';

/** Contact email — used by profile screens and mailto: flows. */
export const selectUserEmail = (state: RootState): string =>
  state.user.profile?.email ?? '';

/**
 * Primary phone (India). Used by the contact sheet's Call action
 * when the user contacts support / their own agent.
 */
export const selectUserPhoneIndia = (state: RootState): string =>
  state.user.profile?.phoneIndia ?? '';

/** Secondary international phone. */
export const selectUserPhoneGlobal = (state: RootState): string =>
  state.user.profile?.phoneGlobal ?? '';
