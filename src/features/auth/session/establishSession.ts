/**
 * ------------------------------------------------------------------
 * establishSession — the one place the app logs a user in
 * ------------------------------------------------------------------
 * Used by OTP verify (existing account) and by customer onboarding
 * (new account). Both receive the same AuthenticatedResponseDto from
 * the backend, so both must log in identically.
 *
 * Order matters:
 *   1. Save tokens FIRST — if the process is killed between steps,
 *      next cold start's bootstrap finds a valid token in Keychain
 *      and lands the user on their role home instead of Login.
 *   2. Hydrate the user slice BEFORE loginSuccess, so the home
 *      screen's first render already shows the real name.
 *   3. `beforeLogin` runs here — anything Home must see on its first
 *      render (e.g. the welcome flag) is dispatched before the swap.
 *   4. loginSuccess — RootNavigator swaps to the role's navigator.
 * ------------------------------------------------------------------
 */

import { saveTokens } from '@services/storage/secureStorage';
import { userReceived, type UserProfile } from '@store/slices/userSlice';
import { loginSuccess } from '@store/slices/appSlice';
import type { AppDispatch } from '@store';
import type { UserRole } from '@rbac/roles';
import { identifyUser } from '@services/telemetry/identify';
import { logEvent } from '@services/telemetry/logEvent';
import { registerFcmToken } from '@services/notifications/fcmToken';

/** Mirrors the backend's AuthenticatedResponseDto. */
export type AuthenticatedSession = {
  status: 'authenticated';
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: UserRole;
  entityId: string;
  requiresProfileSetup: boolean;
  profile: UserProfile;
};

export async function establishSession(
  dispatch: AppDispatch,
  session: AuthenticatedSession,
  options: { firstLogin: boolean; beforeLogin?: () => void },
): Promise<void> {
  await saveTokens({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  });
  dispatch(userReceived(session.profile));
  options.beforeLogin?.();
  dispatch(
    loginSuccess({
      userId: session.userId,
      role: session.role,
      entityId: session.entityId,
    }),
  );

  // identify BEFORE login_success so the event carries the right
  // user_id. Never send the phone number as an event param (PII).
  identifyUser({
    userId: session.userId,
    role: session.role,
    entityId: session.entityId,
  });
  logEvent('auth.login_success', {
    role: session.role,
    first_login: options.firstLogin,
  });

  // Fire-and-forget: best-effort, never throws; login latency must
  // not depend on the notifications endpoint.
  // eslint-disable-next-line no-void
  void registerFcmToken();
}
