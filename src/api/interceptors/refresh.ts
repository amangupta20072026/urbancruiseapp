/**
 * ------------------------------------------------------------------
 * Refresh-Token Interceptor
 * ------------------------------------------------------------------
 * On 401:
 *   1. Try to refresh access token using the refresh token from Keychain.
 *   2. If refresh succeeds, retry the original request once.
 *   3. If refresh fails, clear tokens and end the session (the app's
 *      session-event listener runs the full local logout, which also
 *      flips Redux so RootNavigator shows the login flow).
 *
 * UC staff (role 'uc') — backend service/uc-refresh-gate.ts:
 *   A UC refresh must also carry `ucProof`: a fresh 'refresh' challenge
 *   signed by this phone's hardware device key. If the server answers
 *   `uc_unlock_required` (last MPIN / fingerprint unlock older than
 *   24 h), the session is NOT ended: the app shows the unlock sheet.
 *
 * Concurrent 401s share a single refresh promise to avoid multiple
 * refresh calls fighting each other.
 *
 * Uses bare axios (NOT apiClient) for the refresh and the challenge,
 * so this file never imports apiClient (no recursion, no import cycle).
 * ------------------------------------------------------------------
 */

import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { ENV } from '@config/env';
import { endpoints } from '../endpoints';
import {
  getRefreshToken,
  saveTokens,
  clearTokens,
} from '@services/storage/secureStorage';
import { toast } from '@services/toast';
import { getDeviceInfo } from '@services/device';
import {
  currentSessionRole,
  emitSessionEvent,
} from '@services/auth/sessionEvents';
import { ucChallengeMessage } from '@services/ucSecurity/challenge';
import { signWithDeviceKey } from '@services/ucSecurity/keys';
import { isPublicAuthRequest } from '../publicEndpoints';

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

type RefreshOutcome =
  | { kind: 'ok'; accessToken: string }
  /** UC only: the phone must be unlocked again (MPIN / fingerprint). */
  | { kind: 'unlock_required' }
  | { kind: 'failed' };

/** Backend AUTH_ERROR.UC_UNLOCK_REQUIRED. */
const UC_UNLOCK_REQUIRED = 'uc_unlock_required';

// Shared promise so concurrent 401s trigger only one refresh.
let refreshPromise: Promise<RefreshOutcome> | null = null;

export function attachRefreshInterceptor(client: AxiosInstance): void {
  client.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
      const original = error.config as RetryConfig | undefined;
      const status = error.response?.status;

      if (status !== 401 || !original || original._retry) {
        return Promise.reject(error);
      }

      // Only a request sent WITH a login token can mean "session
      // expired". A 401 from a pre-login endpoint (wrong OTP, expired
      // onboarding ticket, wrong MPIN, ...) or from a request sent
      // without a token is an answer for the screen to show: never
      // refresh or force a logout for it.
      if (
        isPublicAuthRequest(original.url) ||
        !original.headers?.Authorization
      ) {
        return Promise.reject(error);
      }

      original._retry = true;

      const outcome = await getOrRunRefresh();
      if (outcome.kind === 'unlock_required') {
        emitSessionEvent('ucUnlockRequired');
        return Promise.reject(error);
      }
      if (outcome.kind === 'failed') {
        await forceLogout();
        return Promise.reject(error);
      }

      if (original.headers) {
        original.headers.Authorization = `Bearer ${outcome.accessToken}`;
      }
      return client(original);
    },
  );
}

async function getOrRunRefresh(): Promise<RefreshOutcome> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = runRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

/** Signed 'refresh' challenge for a UC refresh (uc-refresh-gate.ts). */
async function buildUcProof(
  refreshToken: string,
): Promise<{ challengeId: string; deviceSignature: string }> {
  const response = await axios.post(
    `${ENV.apiUrl}${endpoints.auth.uc.challenge()}`,
    { refreshToken, purpose: 'refresh' },
    { timeout: ENV.apiTimeout || 30000 },
  );
  const payload = response.data?.data ?? response.data;
  const challengeId: unknown = payload?.challengeId;
  const nonce: unknown = payload?.nonce;
  if (typeof challengeId !== 'string' || typeof nonce !== 'string') {
    throw new Error('Invalid challenge response');
  }
  const deviceSignature = await signWithDeviceKey(
    ucChallengeMessage('refresh', challengeId, nonce),
  );
  return { challengeId, deviceSignature };
}

function serverCode(err: unknown): string | undefined {
  if (!axios.isAxiosError(err)) return undefined;
  const code = (
    err.response?.data as { error?: { code?: unknown } } | undefined
  )?.error?.code;
  return typeof code === 'string' ? code : undefined;
}

async function runRefresh(): Promise<RefreshOutcome> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return { kind: 'failed' };

  const isUc = currentSessionRole() === 'uc';

  try {
    const body: Record<string, unknown> = { refreshToken };
    if (isUc) {
      const [ucProof, device] = await Promise.all([
        buildUcProof(refreshToken),
        getDeviceInfo(),
      ]);
      body.ucProof = ucProof;
      body.device = device;
    }

    // Bare axios: the envelope-unwrap interceptor on apiClient does
    // NOT run here — unwrap `response.data.data` manually below.
    const response = await axios.post(
      `${ENV.apiUrl}${endpoints.auth.refresh()}`,
      body,
      { timeout: ENV.apiTimeout || 30000 },
    );

    // Backend envelope: { data: { accessToken, refreshToken }, requestId }
    const payload = response.data?.data ?? response.data;
    const accessToken = payload?.accessToken;
    const newRefreshToken = payload?.refreshToken;
    if (!accessToken || !newRefreshToken) return { kind: 'failed' };

    await saveTokens({ accessToken, refreshToken: newRefreshToken });
    return { kind: 'ok', accessToken };
  } catch (err) {
    if (isUc && serverCode(err) === UC_UNLOCK_REQUIRED) {
      return { kind: 'unlock_required' };
    }
    return { kind: 'failed' };
  }
}

async function forceLogout(): Promise<void> {
  await clearTokens();
  // The app-level listener (App.tsx) runs the full local logout:
  // Redux → unauthenticated (RootNavigator shows the login flow),
  // cached queries cleared, UC phone keys removed.
  emitSessionEvent('sessionEnded');
  // Wait one frame so the toast overlays the fresh Login screen,
  // not the outgoing screen mid-transition.
  setTimeout(() => {
    toast.info('Your session expired. Please sign in again.');
  }, 0);
}
