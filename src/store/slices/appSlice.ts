/**
 * ------------------------------------------------------------------
 * App Slice
 * ------------------------------------------------------------------
 * Owns three concerns:
 *
 *   Bootstrap     — `bootstrapped` flips true exactly once, when the
 *                    cold-start orchestrator completes. Gates
 *                    RootNavigator from rendering any real screens
 *                    until Firebase / Keychain / /me / config are
 *                    resolved (or safely fallen back to).
 *
 *   Onboarding    — `hasSeenOnboardingThisSession` is SESSION-ONLY.
 *                    Starts `false` on every cold start (never
 *                    persisted). Onboarding shows on every launch —
 *                    tapping Skip / Get Started flips this to true
 *                    for the current session only.
 *
 *   Identity      — `isAuthenticated`, `userRole`, `userId`, etc.
 *                    Populated by bootstrap OR by loginSuccess after
 *                    an interactive login. Tokens live in Keychain,
 *                    not here (see secureStorage.ts).
 * ------------------------------------------------------------------
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { UserRole } from '@rbac/roles';

// Re-export so existing consumers (roles/config.tsx, RoleCard, RoleSelectionSheet,
// LoginScreen) that import `UserRole` from '@store/slices/appSlice'
// keep working. New code should prefer importing from '@rbac/roles' directly.
export type { UserRole } from '@rbac/roles';
import type { AppConfig } from '@app/bootstrap/steps/appConfig';
import type { AuthResolution } from '@app/bootstrap/steps/auth';

/**
 * UC staff device-security gate. SESSION-ONLY (never persisted):
 *   'none'     — not a UC session.
 *   'setup'    — just logged in with OTP: must set an MPIN (and
 *                fingerprint if the phone has one) before the app opens.
 *   'locked'   — fresh app open (or 24 h since the last unlock): must
 *                unlock with fingerprint or MPIN.
 *   'unlocked' — UC screens may show.
 */
export type UcGate = 'none' | 'setup' | 'locked' | 'unlocked';

export type AuthStatus =
  | 'unauthenticated'
  | 'provisional' // has token, /me not yet confirmed
  | 'authenticated';

export type AppState = {
  // Bootstrap
  bootstrapped: boolean;

  // Onboarding (session-only — resets every cold start)
  hasSeenOnboardingThisSession: boolean;

  // Role picker (before login)
  selectedRole: UserRole | null;

  // Identity
  authStatus: AuthStatus;
  isAuthenticated: boolean;
  userId: string | null;
  userRole: UserRole | null;
  entityId: string | null;

  // Remote config
  appConfig: AppConfig | null;

  /**
   * First-time welcome on Customer Home. SESSION-ONLY (never
   * persisted): set by onboarding only when the server reports a new
   * account, cleared when the welcome closes. If the app is killed
   * before Home shows it, it is not shown later, so it can never
   * appear twice or to an existing customer.
   */
  pendingWelcome: boolean;
  /** UC device-security gate. Session-only. See UcGate. */
  ucGate: UcGate;
};

const initialState: AppState = {
  bootstrapped: false,
  hasSeenOnboardingThisSession: false,
  selectedRole: null,
  authStatus: 'unauthenticated',
  isAuthenticated: false,
  userId: null,
  userRole: null,
  entityId: null,
  appConfig: null,
  pendingWelcome: false,
  ucGate: 'none',
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    /**
     * Called exactly once by the bootstrap orchestrator. Writes all
     * resolved identity + config state in a single reducer so
     * RootNavigator sees a consistent snapshot on its next render.
     *
     * NOTE: `hasSeenOnboardingThisSession` is NOT touched here — it
     * always starts `false` per session and is only flipped by the
     * user tapping Skip / Get Started on the Onboarding screen.
     */
    bootstrapCompleted: (
      state,
      action: PayloadAction<{
        appConfig: AppConfig;
        auth: AuthResolution;
      }>,
    ) => {
      const { appConfig, auth } = action.payload;

      state.appConfig = appConfig;

      if (auth.status === 'authenticated') {
        state.authStatus = 'authenticated';
        state.isAuthenticated = true;
        state.userId = auth.userId;
        state.userRole = auth.role;
        state.entityId = auth.entityId;
      } else if (auth.status === 'uc_locked') {
        // UC staff with a saved session: no /me yet (its refresh needs
        // an unlock). The MPIN / fingerprint unlock gives fresh tokens.
        state.authStatus = 'provisional';
        state.isAuthenticated = true;
        state.userRole = 'uc';
        state.ucGate = 'locked';
      } else if (auth.status === 'provisional') {
        // We trust the local token for now. A background /me refetch
        // will confirm or reject later.
        state.authStatus = 'provisional';
        state.isAuthenticated = true;
        // userRole was persisted from last session — keep it.
      } else {
        state.authStatus = 'unauthenticated';
        state.isAuthenticated = false;
        state.userId = null;
        state.userRole = null;
        state.entityId = null;
      }

      state.bootstrapped = true;
    },

    /** Onboarding "Skip" / "Get Started" tap. Session-only flip. */
    completeOnboarding: state => {
      state.hasSeenOnboardingThisSession = true;
    },

    /** Role picked in the role-picker sheet. */
    selectRole: (state, action: PayloadAction<UserRole>) => {
      state.selectedRole = action.payload;
    },

    /** "Change role" affordance on Login. */
    changeRole: state => {
      state.selectedRole = null;
    },

    /**
     * Called after successful interactive login (OTP verify).
     * Tokens MUST also be saved to Keychain by the caller — this
     * reducer only updates in-memory identity.
     */
    loginSuccess: (
      state,
      action: PayloadAction<{
        userId: string;
        role: UserRole;
        entityId: string;
      }>,
    ) => {
      state.authStatus = 'authenticated';
      state.isAuthenticated = true;
      state.userId = action.payload.userId;
      state.userRole = action.payload.role;
      state.entityId = action.payload.entityId;
      // Every UC OTP login sets a new MPIN: the backend removes a
      // phone's registration on logout / lockout (session.ts).
      state.ucGate = action.payload.role === 'uc' ? 'setup' : 'none';
    },
    /** UC: this phone must set up its MPIN (after OTP login). */
    ucSetupRequired: state => {
      if (state.userRole === 'uc') state.ucGate = 'setup';
    },
    /** UC: unlock needed (fresh open, or the server said unlock_required). */
    ucLocked: state => {
      if (state.userRole === 'uc' && state.isAuthenticated) {
        state.ucGate = 'locked';
      }
    },
    /** UC: MPIN set up, or unlocked with MPIN / fingerprint. */
    ucUnlocked: state => {
      if (state.userRole === 'uc') state.ucGate = 'unlocked';
    },

    /**
     * Called by a background /me refetch (post-bootstrap) that
     * upgrades a provisional session to fully authenticated,
     * or downgrades it to unauthenticated if the server rejected.
     */
    welcomeQueued: state => {
      state.pendingWelcome = true;
    },

    welcomeDismissed: state => {
      state.pendingWelcome = false;
    },

    reconcileAuth: (state, action: PayloadAction<AuthResolution>) => {
      const auth = action.payload;
      if (auth.status === 'authenticated') {
        state.authStatus = 'authenticated';
        state.isAuthenticated = true;
        state.userId = auth.userId;
        state.userRole = auth.role;
        state.entityId = auth.entityId;
      } else if (auth.status === 'unauthenticated') {
        state.authStatus = 'unauthenticated';
        state.isAuthenticated = false;
        state.userId = null;
        state.userRole = null;
        state.entityId = null;
      }
    },

    /** Full logout. Caller must ALSO clear tokens from Keychain. */
    logout: state => {
      state.authStatus = 'unauthenticated';
      state.isAuthenticated = false;
      state.userId = null;
      state.userRole = null;
      state.entityId = null;
      state.selectedRole = null;
      state.pendingWelcome = false;
      state.ucGate = 'none';
    },
  },
});

export const {
  bootstrapCompleted,
  completeOnboarding,
  selectRole,
  changeRole,
  loginSuccess,
  reconcileAuth,
  welcomeQueued,
  welcomeDismissed,
  logout,
  ucSetupRequired,
  ucLocked,
  ucUnlocked,
} = appSlice.actions;

export default appSlice.reducer;
