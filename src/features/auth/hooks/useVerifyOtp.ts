/**
 * ------------------------------------------------------------------
 * useVerifyOtp — Auth, OTP verification & session establishment
 * ------------------------------------------------------------------
 * Wraps POST /auth/otp/verify. On success this hook is what actually
 * logs the user in:
 *
 *   1. Save tokens to Keychain            (secureStorage.saveTokens)
 *   2. Dispatch loginSuccess to Redux     (appSlice.loginSuccess)
 *
 * As soon as (2) commits, RootNavigator's conditional groups swap
 * from AuthFlow to the role's navigator — the screen doesn't need
 * to `navigation.navigate(...)` anywhere. That's why the hook doesn't
 * take a navigation param.
 *
 * Trusting the server's role, not the selected one:
 *   The user picked a role on the role sheet, but the same phone
 *   number could legitimately be a customer AND a vendor (different
 *   sub-roles share phones). The server is the source of truth —
 *   we dispatch whatever role /auth/otp/verify returns, and
 *   RootNavigator branches on that.
 *
 * Backend swap:
 *   Set USE_MOCK to false when the endpoint ships. The response
 *   shape here matches what bootstrap/steps/auth.ts expects from
 *   /auth/me, so no other code needs to change.
 *
 * Error surface:
 *   - 'unauthorized' → wrong OTP → screen shows "That code didn't
 *     work. Please try again."
 *   - 'rateLimited'  → too many attempts → suggest waiting / resend
 *   - 'network'      → connection issue → screen retains the code
 *     the user typed
 *   - anything else  → generic fallback
 * ------------------------------------------------------------------
 */

import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@api/axios';
import { endpoints } from '@api/endpoints';
import { ApiError } from '@api/errors';
import { queryKeys } from '@constants/queryKeys';
import { saveTokens } from '@services/storage/secureStorage';
import { useAppDispatch } from '@store/hooks';
import { loginSuccess } from '@store/slices/appSlice';
import { userReceived, type UserProfile } from '@store/slices/userSlice';
import type { UserRole, SubRole } from '@rbac/roles';
import { isoNow } from '@app-types/datetime';

/* ------------------------------------------------------------------ */
/* Toggle                                                             */
/* ------------------------------------------------------------------ */

const USE_MOCK = true;

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type VerifyOtpInput = {
  phone: string;
  countryCode: string; // e.g. '+91'
  otp: string;
  /**
   * The role the user selected on the role sheet. Sent so the
   * backend can disambiguate if this phone is registered against
   * multiple roles. Server's response `role` is authoritative.
   */
  role: UserRole;
  /** Echoed from useRequestOtp's response, if the backend uses one. */
  requestId?: string;
};

/**
 * Shape the backend must return on success. Identity fields mirror
 * bootstrap/steps/auth.ts's MeResponse so the two code paths
 * (cold-start /me vs. interactive verify) stay symmetric.
 */
export type VerifyOtpResponse = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: UserRole;
  subRole: SubRole;
  entityId: string;
  /** Full display profile — mirrors GET /auth/me. */
  profile: UserProfile;
};

/* ------------------------------------------------------------------ */
/* Fetcher                                                            */
/* ------------------------------------------------------------------ */

async function verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResponse> {
  if (USE_MOCK) {
    await new Promise<void>(resolve => setTimeout(resolve, 500));

    // Mock rejection path for a specific test OTP so QA can exercise
    // the error branch without needing a real backend. Any 6-digit
    // code EXCEPT '000000' is accepted.
    if (input.otp === '000000') {
      throw new ApiError('unauthorized', 'That code didn’t work.', 401);
    }

    return {
      accessToken: `mock-access-${input.role}-${Date.now()}`,
      refreshToken: `mock-refresh-${input.role}-${Date.now()}`,
      userId: `mock-${input.role}-user`,
      role: input.role,
      subRole: null,
      entityId: `mock-${input.role}-entity`,
      profile: {
        id: `mock-${input.role}-user`,
        displayName: 'Aman Gupta',
        email: 'aman@urbancruise.dev',
        phoneIndia: `${input.countryCode}${input.phone}`,
        phoneGlobal: `${input.countryCode}${input.phone}`,
        memberSince: isoNow(),
      },
    };
  }

  const { data } = await apiClient.post<VerifyOtpResponse>(
    endpoints.auth.verifyOtp(),
    input,
  );
  return data;
}

/* ------------------------------------------------------------------ */
/* Hook                                                               */
/* ------------------------------------------------------------------ */

export function useVerifyOtp() {
  const dispatch = useAppDispatch();

  const mutation = useMutation<VerifyOtpResponse, ApiError, VerifyOtpInput>({
    mutationKey: queryKeys.auth.verifyOtp(),
    mutationFn: verifyOtp,
    onSuccess: async data => {
      // Order matters:
      //   1. Save tokens FIRST — if the app process is killed
      //      between steps, next cold start's bootstrap sees a
      //      valid token in Keychain and lands the user on their
      //      role home instead of back at Login.
      //   2. Dispatch identity to Redux — this is what flips
      //      RootNavigator into the role navigator.
      await saveTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      // Order matters: hydrate the user slice BEFORE loginSuccess.
      // loginSuccess flips isAuthenticated, which triggers RootNavigator
      // to swap into the role stack; the home screen's first render
      // must already see state.user.profile populated so the greeting
      // shows the real name, never the "there" fallback.
      dispatch(userReceived(data.profile));
      dispatch(
        loginSuccess({
          userId: data.userId,
          role: data.role,
          subRole: data.subRole,
          entityId: data.entityId,
        }),
      );
    },
  });

  return {
    verifyOtp: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
