/**
 * ------------------------------------------------------------------
 * User Slice — display-facing user info
 * ------------------------------------------------------------------
 * Separated from appSlice on purpose:
 *
 *   appSlice   → session identity: isAuthenticated, userRole, userId,
 *                bootstrap flags. Data the ROUTER cares about.
 *   userSlice  → display fields: name, email, phones. Data the UI
 *                cares about (headers, greetings, contact sheets).
 *
 * Splitting means:
 *   - A screen that only needs "what's the user's name" doesn't
 *     re-render when bootstrap or role changes.
 *   - Profile edits (name change, avatar change) mutate one slice
 *     without touching the auth state machine.
 *   - When /me lands, we dispatch userReceived; nothing in appSlice
 *     needs to know.
 *
 * State shape mirrors the eventual /me response so the transition
 * from mock to backend is a straight `dispatch(userReceived(payload))`
 * — no reshape.
 * ------------------------------------------------------------------
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { ISODateTime } from '@app-types/datetime';
import { logout } from './appSlice';

/* ------------------------------------------------------------------ */
/* State shape                                                        */
/* ------------------------------------------------------------------ */

export type UserProfile = {
  /** Stable server-side user id. Doubles as the avatar-colour seed. */
  id: string;
  /** Full display name, e.g. "Aman Gupta". */
  displayName: string;
  email: string;
  /** Primary Indian phone (with country code). */
  phoneIndia: string;
  /** Secondary international phone (with country code). */
  phoneGlobal: string;
  /** When the user first signed up — for "member since" chips. */
  memberSince: ISODateTime;
};

export type UserState = {
  /**
   * The current user, or null if the slice hasn't been hydrated
   * yet. In v1 we seed with the mock so screens can render
   * immediately on cold start; when /me lands, initial state
   * becomes `null` and RootBoundary shows a spinner until the
   * response arrives.
   */
  profile: UserProfile | null;
};

/* ------------------------------------------------------------------ */
/* Initial state                                                      */
/* ------------------------------------------------------------------ */

/* Profile is null until /me (bootstrap) or /auth/otp/verify (login) lands
 * and dispatches userReceived(...). Screens that read the profile MUST
 * handle the null case — see GreetingBlock which renders a skeleton. */
const initialState: UserState = {
  profile: null,
};

/* ------------------------------------------------------------------ */
/* Slice                                                              */
/* ------------------------------------------------------------------ */

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    userReceived(state, action: PayloadAction<UserProfile>) {
      state.profile = action.payload;
    },
    userPatched(state, action: PayloadAction<Partial<UserProfile>>) {
      if (!state.profile) return;
      state.profile = { ...state.profile, ...action.payload };
    },
    userCleared(state) {
      state.profile = null;
    },
  },
  /* Cross-slice listener: when the app logs out, drop this profile
   * automatically. Keeping this in userSlice (not in appSlice) means
   * the two slices stay decoupled — appSlice.logout has no idea
   * userSlice exists. Follows Redux Toolkit's "let each slice
   * subscribe to actions it cares about" pattern. */
  extraReducers: builder => {
    builder.addCase(logout, state => {
      state.profile = null;
    });
  },
});

export const { userReceived, userPatched, userCleared } = userSlice.actions;

export default userSlice.reducer;
