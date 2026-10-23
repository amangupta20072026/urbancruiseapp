/**
 * ------------------------------------------------------------------
 * useCustomerOnboard — create a new customer account
 * ------------------------------------------------------------------
 * Wraps POST /auth/customer/onboard. Called once from
 * CustomerProfileSetupScreen with the single-use onboardingToken
 * that /auth/otp/verify returned for a number with no account.
 *
 * On success the backend returns a full session (the same shape as
 * verify) plus `isNewAccount`. The session is established exactly
 * like a normal login (establishSession); the first-time welcome is
 * queued only when `isNewAccount` is true, so a customer who already
 * existed for this number never sees "Welcome to Urban Cruise".
 *
 * NO RETRY: the token is consumed by the first request that reaches
 * the server. Mutations default to retry: 0 (app/queryClient.ts) and
 * this hook relies on that. The screen also blocks double taps.
 *
 * Errors the screen handles (ApiError.code):
 *   - 'onboarding_expired' / 'onboarding_invalid' → verify the
 *     number again
 *   - 'mobile_blocked'                            → contact support
 *   - 'CUSTOMER_CREATE_BUSY' (503)                → try again
 *   - kind 'validation'                           → server message
 *   - kind 'network' | 'timeout'                  → try again; form
 *     keeps its values
 * ------------------------------------------------------------------
 */

import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@api/axios';
import { endpoints } from '@api/endpoints';
import { ApiError } from '@api/errors';
import { queryKeys } from '@constants/queryKeys';
import { getDeviceInfo } from '@services/device';
import { useAppDispatch } from '@store/hooks';
import { welcomeQueued } from '@store/slices/appSlice';
import { logEvent } from '@services/telemetry/logEvent';
import {
  establishSession,
  type AuthenticatedSession,
} from '../session/establishSession';

/** API values; the backend maps them to the CRM's spellings. */
export type CustomerSignupType = 'personal' | 'corporate' | 'agent';

export type CustomerOnboardInput = {
  onboardingToken: string;
  firstName: string;
  /** null when left empty. */
  lastName: string | null;
  /** null when left empty. */
  email: string | null;
  customerType: CustomerSignupType;
  city: string;
  /** Analytics only: whether the city came from "Use my location". */
  citySource: 'detected' | 'typed';
};

type CustomerOnboardResponse = AuthenticatedSession & {
  isNewAccount: boolean;
};

async function onboard(
  input: CustomerOnboardInput,
): Promise<CustomerOnboardResponse> {
  // Must be the same device id that was sent with /otp/verify: the
  // server rejects a ticket used from another device.
  const device = await getDeviceInfo();
  const { data } = await apiClient.post<CustomerOnboardResponse>(
    endpoints.auth.customerOnboard(),
    {
      onboardingToken: input.onboardingToken,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      customerType: input.customerType,
      city: input.city,
      device,
    },
  );
  return data;
}

export function useCustomerOnboard() {
  const dispatch = useAppDispatch();

  const mutation = useMutation<
    CustomerOnboardResponse,
    ApiError,
    CustomerOnboardInput
  >({
    mutationKey: queryKeys.auth.customerOnboard(),
    mutationFn: onboard,
    onSuccess: async (data, input) => {
      await establishSession(dispatch, data, {
        firstLogin: data.isNewAccount,
        // Before loginSuccess, so Customer Home sees the flag on its
        // very first render.
        beforeLogin: () => {
          if (data.isNewAccount) dispatch(welcomeQueued());
        },
      });
      logEvent('auth.onboarding_completed', {
        customer_type: input.customerType,
        is_new_account: data.isNewAccount,
        city_source: input.citySource,
      });
    },
    onError: err => {
      logEvent('auth.onboarding_failed', {
        reason: err instanceof ApiError ? err.code ?? err.kind : 'unknown',
      });
    },
  });

  return {
    onboard: mutation.mutateAsync,
    isPending: mutation.isPending,
    reset: mutation.reset,
  };
}
