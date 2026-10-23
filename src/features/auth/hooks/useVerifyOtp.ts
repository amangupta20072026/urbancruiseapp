/**
 * ------------------------------------------------------------------
 * useVerifyOtp — Auth, OTP verification & session establishment
 * ------------------------------------------------------------------
 * Wraps POST /auth/otp/verify. For an existing account this hook is
 * what actually logs the user in (steps run in establishSession):
 *
 *   1. Save tokens to Keychain            (secureStorage.saveTokens)
 *   2. Hydrate user profile in Redux      (userSlice.userReceived)
 *   3. Flip auth state in Redux           (appSlice.loginSuccess)
 *   4. Attach analytics identity          (identifyUser)
 *   5. Emit auth.otp_verified + auth.login_success
 *
 * For a new customer the server returns 'onboarding_required'
 * instead; nothing is stored and OtpVerifyScreen navigates to
 * CustomerProfileSetup.
 *
 * As soon as (3) commits, RootNavigator's conditional groups swap
 * from AuthFlow to the role's navigator — the screen does not need
 * to `navigation.navigate(...)` anywhere. That's why the hook has
 * no navigation param.
 *
 * DEVICE METADATA:
 *   Every verify call includes a `device` block collected via
 *   getDeviceInfo(). The server writes this into `auth_sessions`,
 *   which powers a future "Signed-in devices" screen and force-
 *   logout-all. Best-effort — failures inside getDeviceInfo() fall
 *   back to placeholder strings so login is never blocked by a
 *   flaky native module.
 *
 * TRUSTING THE SERVER'S ROLE (not the selected one):
 *   The user picked a role on the role sheet, but the same phone
 *   number could legitimately be a customer AND a vendor. The server
 *   is source of truth — we
 *   dispatch whatever role /auth/otp/verify returns, and
 *   RootNavigator branches on that.
 *
 * Error surface (typed via ApiError.kind / .code):
 *   - kind 'unauthorized' + code 'otp_invalid'         → "That code didn't work"
 *   - kind 'unauthorized' + code 'otp_expired'         → "OTP expired, resend"
 *   - kind 'rateLimited'  + code 'account_locked'      → 15-min lockout, show retryAfter
 *   - kind 'forbidden'    + code 'account_suspended'   → "Contact support"
 *   - kind 'network'|'timeout'                         → screen retains typed digits
 *   - anything else                                    → generic fallback
 * ------------------------------------------------------------------
 */

import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@api/axios';
import { endpoints } from '@api/endpoints';
import { ApiError } from '@api/errors';
import { queryKeys } from '@constants/queryKeys';
import { getDeviceInfo, type DeviceInfoPayload } from '@services/device';
import { useAppDispatch } from '@store/hooks';
import type { UserRole } from '@rbac/roles';
import { logEvent } from '@services/telemetry/logEvent';
import {
  establishSession,
  type AuthenticatedSession,
} from '../session/establishSession';

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
  /** Echoed from useRequestOtp's response — pairs OTP with send.
   *  Optional so a lost-nav-state edge case can still verify by
   *  looking the pending session up server-side via phone+role. */
  requestId?: string;
};

/**
 * POST /auth/otp/verify returns one of two shapes (backend
 * VerifyOtpResponseDto):
 *
 *   - 'authenticated': an existing account. Tokens + profile; the
 *     hook logs the user in (see establishSession).
 *   - 'onboarding_required': the number has no customer account yet.
 *     No tokens and nothing written to the database. The screen must
 *     send the user to CustomerProfileSetup with this single-use
 *     token, which expires after `expiresInSeconds` and works only
 *     from this device.
 */
export type VerifyOtpOnboardingRequired = {
  status: 'onboarding_required';
  onboardingToken: string;
  expiresInSeconds: number;
  role: 'customer';
};

export type VerifyOtpResponse =
  | AuthenticatedSession
  | VerifyOtpOnboardingRequired;

/* ------------------------------------------------------------------ */
/* Fetcher                                                            */
/* ------------------------------------------------------------------ */

async function verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResponse> {
  // Collect device info BEFORE the network call so a slow native
  // module doesn't stretch the perceived login latency past the
  // POST itself.
  const device: DeviceInfoPayload = await getDeviceInfo();

  const { data } = await apiClient.post<VerifyOtpResponse>(
    endpoints.auth.verifyOtp(),
    {
      phone: input.phone,
      countryCode: input.countryCode,
      role: input.role,
      otp: input.otp,
      requestId: input.requestId,
      device, // { id, name, platform, appVersion }
    },
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
      logEvent('auth.otp_verified');
      // New customer: no session yet. The screen navigates to the
      // profile form; nothing to store here.
      if (data.status === 'onboarding_required') return;

      await establishSession(dispatch, data, {
        firstLogin: data.requiresProfileSetup,
      });
    },
    onError: err => {
      logEvent('auth.otp_failed', {
        reason: err instanceof ApiError ? err.code ?? err.kind : 'unknown',
      });
    },
  });

  return {
    verifyOtp: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
