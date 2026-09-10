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
 * IDEMPOTENCY:
 *   The screen mints a UUIDv4 once per tap and passes it in
 *   `idempotencyKey`. The hook forwards it as an `Idempotency-Key`
 *   header — if the network fails and TanStack retries (or the user
 *   re-taps the same button before we've cleared state), the server
 *   returns the ORIGINAL response instead of sending a second OTP.
 *   Callers MUST mint a NEW key for a "resend" tap — that's a fresh
 *   intent, not a retry of the previous send.
 *
 * Error surface (typed via ApiError.kind / .code):
 *   - kind 'rateLimited'   + code 'account_locked'          → 15-min lockout, show retryAfter
 *   - kind 'rateLimited'   + no code                        → "Too many requests, wait a moment"
 *   - kind 'forbidden'     + code 'account_not_provisioned' → "No account for this number"
 *   - kind 'forbidden'     + code 'account_suspended'       → "Contact support"
 *   - kind 'validation'    + code 'captcha_required'        → surface CAPTCHA sheet
 *   - kind 'server'        + code 'signups_disabled'        → outage banner
 *   - kind 'network'|'timeout'                              → offline / retry
 *   - anything else                                         → generic fallback
 * ------------------------------------------------------------------
 */

import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@api/axios';
import { endpoints } from '@api/endpoints';
import { ApiError } from '@api/errors';
import { queryKeys } from '@constants/queryKeys';
import type { UserRole } from '@rbac/roles';
import { logEvent } from '@services/telemetry/logEvent';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type RequestOtpInput = {
  phone: string;
  countryCode: string; // e.g. '+91'
  role: UserRole;
  /**
   * UUIDv4 minted by the CALLER (screen), one per user intent.
   * Forwarded as the `Idempotency-Key` header. Reusing the same
   * key on a re-tap returns the previous response; a genuine
   * resend needs a NEW key.
   */
  idempotencyKey: string;
  /**
   * hCaptcha / reCAPTCHA v3 token, present only when the previous
   * response set `code === 'captcha_required'`. When present, the
   * server unlocks the throttle for this one request.
   */
  captchaToken?: string;
};

export type OtpChannel = 'whatsapp' | 'sms';

export type RequestOtpResponse = {
  /**
   * Server-issued handle for this OTP session. Echoed back on
   * verify so the backend can pair the code with the right send.
   */
  requestId: string;
  /**
   * How long the client must wait before offering "Resend" again.
   * Screen should prefer this over any hard-coded constant so
   * throttling matches server truth.
   */
  resendAfterSeconds: number;
  /**
   * Actual channel used. `'sms'` here means the WhatsApp send
   * failed the deliverability check and the server auto-fell-back
   * — the OTP-verify screen should show a "Sent via SMS" banner
   * so the user doesn't sit in WhatsApp waiting.
   */
  channel: OtpChannel;
  /**
   * True when the mobile matched a QA test number and no real
   * OTP was dispatched. The verify screen shows a hint reminding
   * QA to use the fixed test OTP.
   */
  testMode: boolean;
};

/* ------------------------------------------------------------------ */
/* Fetcher                                                            */
/* ------------------------------------------------------------------ */

async function requestOtp(input: RequestOtpInput): Promise<RequestOtpResponse> {
  const { data } = await apiClient.post<RequestOtpResponse>(
    endpoints.auth.requestOtp(),
    // Body — do NOT include the idempotency key here; it goes in the
    // header where the server middleware reads it.
    {
      phone: input.phone,
      countryCode: input.countryCode,
      role: input.role,
      captchaToken: input.captchaToken,
    },
    {
      headers: {
        'Idempotency-Key': input.idempotencyKey,
      },
    },
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
    onSuccess: (data, variables) => {
      // Segment by role AND channel so we can see the WA→SMS
      // fallback rate in the funnel. NO phone number — PII, and
      // Firebase Analytics is a Google-hosted pipeline.
      logEvent('auth.otp_sent', {
        role: variables.role,
        channel: data.channel,
        test_mode: data.testMode,
      });
    },
  });

  return {
    requestOtp: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
