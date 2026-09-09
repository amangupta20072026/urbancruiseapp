/**
 * ------------------------------------------------------------------
 * useVerifyOtp — Auth, OTP verification & session establishment
 * ------------------------------------------------------------------
 * Wraps POST /auth/otp/verify. On success this hook is what actually
 * logs the user in:
 *
 *   1. Save tokens to Keychain            (secureStorage.saveTokens)
 *   2. Hydrate user profile in Redux      (userSlice.userReceived)
 *   3. Flip auth state in Redux           (appSlice.loginSuccess)
 *   4. Attach analytics identity          (identifyUser)
 *   5. Emit auth.otp_verified + auth.login_success
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
 *   number could legitimately be a customer AND a vendor (different
 *   sub-roles share phones). The server is source of truth — we
 *   dispatch whatever role /auth/otp/verify returns, and
 *   RootNavigator branches on that.
 *
 * Backend swap:
 *   Set USE_MOCK to false when /auth/otp/verify lands. The response
 *   shape here matches what bootstrap/steps/auth.ts expects from
 *   /auth/me, so no other code needs to change.
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
import { saveTokens } from '@services/storage/secureStorage';
import { getDeviceInfo, type DeviceInfoPayload } from '@services/device';
import { useAppDispatch } from '@store/hooks';
import { loginSuccess } from '@store/slices/appSlice';
import { userReceived, type UserProfile } from '@store/slices/userSlice';
import type { UserRole, SubRole } from '@rbac/roles';
import { isoNow } from '@app-types/datetime';
import { mockCurrentUser } from '@mocks/data/currentUser';
import { logEvent } from '@services/telemetry/logEvent';
import { identifyUser } from '@services/telemetry/identify';

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
  /** Echoed from useRequestOtp's response — pairs OTP with send.
   *  Optional so a lost-nav-state edge case can still verify by
   *  looking the pending session up server-side via phone+role. */
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
  /**
   * True on first successful login when the row was just created
   * (customer self-signup) and the profile hasn't been filled in
   * yet. Screen navigates to CompleteProfile in that case.
   * Non-customer roles never see this — they're pre-provisioned.
   */
  requiresProfileSetup: boolean;
  /** Full display profile — mirrors GET /auth/me. */
  profile: UserProfile;
};

/* ------------------------------------------------------------------ */
/* Fetcher                                                            */
/* ------------------------------------------------------------------ */

async function verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResponse> {
  // Collect device info BEFORE the network call so a slow native
  // module doesn't stretch the perceived login latency past the
  // POST itself. Runs in parallel with the mock delay too.
  const devicePromise = getDeviceInfo();

  if (USE_MOCK) {
    await new Promise<void>(resolve => setTimeout(resolve, 500));
    await devicePromise; // eat the promise so the timing is realistic

    // Mock rejection paths for QA:
    //   otp '000000' → otp_invalid   (wrong code)
    //   otp '111111' → otp_expired   (session expired)
    if (input.otp === '000000') {
      throw new ApiError(
        'unauthorized',
        "That code didn't work. Please try again.",
        401,
        { code: 'otp_invalid' },
        'otp_invalid',
      );
    }
    if (input.otp === '111111') {
      throw new ApiError(
        'unauthorized',
        'This OTP has expired. Tap Resend to get a new one.',
        401,
        { code: 'otp_expired' },
        'otp_expired',
      );
    }

    // Dev-mode identity policy (mock only). Real /auth/otp/verify
    // returns real IDs from the DB.
    const isCustomer = input.role === 'customer';
    const mockUserId = isCustomer
      ? mockCurrentUser.id
      : `mock-${input.role}-user`;
    const mockEntityId = isCustomer
      ? mockCurrentUser.id
      : `mock-${input.role}-entity`;

    return {
      accessToken: `mock-access-${input.role}-${Date.now()}`,
      refreshToken: `mock-refresh-${input.role}-${Date.now()}`,
      userId: mockUserId,
      role: input.role,
      subRole: null,
      entityId: mockEntityId,
      requiresProfileSetup: false,
      profile: isCustomer
        ? {
            id: mockCurrentUser.id,
            displayName: mockCurrentUser.displayName,
            email: mockCurrentUser.email,
            phoneIndia: mockCurrentUser.phoneIndia,
            phoneGlobal: mockCurrentUser.phoneGlobal,
            memberSince: mockCurrentUser.memberSince,
          }
        : {
            id: mockUserId,
            displayName: 'Aman Gupta',
            email: 'aman@urbancruise.dev',
            phoneIndia: `${input.countryCode}${input.phone}`,
            phoneGlobal: `${input.countryCode}${input.phone}`,
            memberSince: isoNow(),
          },
    };
  }

  const device: DeviceInfoPayload = await devicePromise;

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
      // Order matters:
      //   1. Save tokens FIRST — if the process is killed between
      //      steps, next cold start's bootstrap sees a valid token
      //      in Keychain and lands the user on their role home
      //      instead of back at Login.
      //   2. Hydrate user slice BEFORE flipping loginSuccess.
      //      loginSuccess trips RootNavigator into the role stack;
      //      the home screen's first render must already see the
      //      profile populated so the greeting shows the real name.
      //   3. Flip identity in appSlice — this is what actually swaps
      //      screens.
      await saveTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      dispatch(userReceived(data.profile));
      dispatch(
        loginSuccess({
          userId: data.userId,
          role: data.role,
          subRole: data.subRole,
          entityId: data.entityId,
        }),
      );

      // ── Analytics ─────────────────────────────────────────────
      // identify BEFORE emitting login_success so the event carries
      // the correct user_id + user properties in Firebase. Do NOT
      // include the phone number as an event param — it's PII.
      identifyUser({
        userId: data.userId,
        role: data.role,
        subRole: data.subRole,
        entityId: data.entityId,
      });
      logEvent('auth.otp_verified');
      logEvent('auth.login_success', {
        role: data.role,
        first_login: data.requiresProfileSetup,
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
