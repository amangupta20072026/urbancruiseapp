/**
 * ------------------------------------------------------------------
 * useRequestOtp — Auth, OTP send / resend
 * ------------------------------------------------------------------
 * Wraps POST /auth/otp/request. Used by:
 *   - LoginScreen         (initial "Send OTP" tap)
 *   - OtpVerifyScreen     ("Resend OTP" tap after the cooldown)
 *
 * Why one hook for both:
 *   Request and resend are the SAME endpoint from the backend's
 *   perspective — the server decides whether to allocate a new
 *   requestId or throttle the caller. Splitting them at the client
 *   would just duplicate error handling and drift over time.
 *
 * Backend swap:
 *   The live axios call is already written below. Flip USE_MOCK to
 *   false (or delete the mock branch entirely) once the endpoint
 *   ships. The mutation's input/output types are the source of
 *   truth for what the backend must return.
 *
 * Error surface:
 *   The axios error interceptor normalises everything into ApiError,
 *   so the screen can pattern-match on `err.kind`:
 *     - 'rateLimited' → "Too many requests, wait a moment"
 *     - 'network'     → "Check your connection"
 *     - 'validation'  → err.message (server copy is usually specific)
 *     - anything else → generic fallback
 * ------------------------------------------------------------------
 */

import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@api/axios';
import { endpoints } from '@api/endpoints';
import { ApiError } from '@api/errors';
import { queryKeys } from '@constants/queryKeys';
import type { UserRole } from '@rbac/roles';

/* ------------------------------------------------------------------ */
/* Toggle                                                             */
/* ------------------------------------------------------------------ */

/**
 * Flip to `false` when the backend endpoint is live.
 * Keeping the toggle at module scope (not env-driven) so the swap
 * is explicit and shows up in a code review diff.
 */
const USE_MOCK = true;

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type RequestOtpInput = {
  phone: string;
  countryCode: string; // e.g. '+91'
  role: UserRole;
};

export type RequestOtpResponse = {
  /**
   * Server-issued handle for this OTP session. Echoed back on
   * verify so the backend can pair the code with the right send.
   * Optional — some backends key off (phone, role) alone.
   */
  requestId?: string;
  /**
   * How long the client must wait before offering "Resend" again.
   * When present, the screen should prefer this over the local
   * RESEND_SECONDS constant so throttling matches the server.
   */
  resendAfterSeconds?: number;
};

/* ------------------------------------------------------------------ */
/* Fetcher                                                            */
/* ------------------------------------------------------------------ */

async function requestOtp(input: RequestOtpInput): Promise<RequestOtpResponse> {
  if (USE_MOCK) {
    // Simulate network latency so loading spinners get exercised.
    await new Promise<void>(resolve => setTimeout(resolve, 400));
    // Mock response — matches the shape the real backend will return.
    return {
      requestId: `mock-req-${Date.now()}`,
      resendAfterSeconds: 30,
    };
  }

  const { data } = await apiClient.post<RequestOtpResponse>(
    endpoints.auth.requestOtp(),
    input,
  );
  return data;
}

/* ------------------------------------------------------------------ */
/* Hook                                                               */
/* ------------------------------------------------------------------ */

export function useRequestOtp() {
  const mutation = useMutation<RequestOtpResponse, ApiError, RequestOtpInput>({
    mutationKey: queryKeys.auth.requestOtp(),
    mutationFn: requestOtp,
  });

  return {
    requestOtp: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
