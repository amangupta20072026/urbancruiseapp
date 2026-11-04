/**
 * ------------------------------------------------------------------
 * Public auth endpoints — called before the user is logged in
 * ------------------------------------------------------------------
 * For these requests a 401 is a normal answer about the request
 * itself (wrong OTP, expired OTP, expired onboarding ticket, bad
 * refresh token), NOT an expired login session. So:
 *
 *   - interceptors/auth.ts never attaches an access token to them
 *     (a leftover token from an earlier session must not be sent);
 *   - interceptors/refresh.ts never refreshes or force-logs-out on
 *     their 401; the error goes straight to the screen.
 *
 * Add any new pre-login endpoint here.
 * ------------------------------------------------------------------
 */

import { endpoints } from './endpoints';

const PUBLIC_AUTH_PATHS: ReadonlySet<string> = new Set([
  endpoints.auth.requestOtp(),
  endpoints.auth.verifyOtp(),
  endpoints.auth.customerOnboard(),
  endpoints.auth.refresh(),
  // UC device security: authenticated by the refresh token in the body.
  // Their 401s (wrong MPIN, expired challenge, …) are answers for the
  // unlock screens, never a reason to refresh or force a logout.
  endpoints.auth.uc.challenge(),
  endpoints.auth.uc.securityStatus(),
  endpoints.auth.uc.registerDevice(),
  endpoints.auth.uc.enableBiometric(),
  endpoints.auth.uc.disableBiometric(),
  endpoints.auth.uc.unlockMpin(),
  endpoints.auth.uc.unlockBiometric(),
  endpoints.auth.uc.changeMpin(),
]);

/** True when `url` (an axios request url, relative to baseURL) is a public auth endpoint. */
export function isPublicAuthRequest(url: string | undefined): boolean {
  if (!url) return false;
  const path = url.split('?')[0] ?? '';
  return PUBLIC_AUTH_PATHS.has(path);
}
