/**
 * ------------------------------------------------------------------
 * Refresh-Token Interceptor
 * ------------------------------------------------------------------
 * On 401:
 *   1. Try to refresh access token using the refresh token from Keychain.
 *   2. If refresh succeeds, retry the original request once.
 *   3. If refresh fails, clear tokens and reset navigation to AuthFlow.
 *
 * Concurrent 401s share a single refresh promise to avoid multiple
 * refresh calls fighting each other.
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
import { reset } from '@navigation/NavigationService';
import { toast } from '@services/toast';

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// Shared promise so concurrent 401s trigger only one refresh.
let refreshPromise: Promise<string | null> | null = null;

export function attachRefreshInterceptor(client: AxiosInstance): void {
  client.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
      const original = error.config as RetryConfig | undefined;
      const status = error.response?.status;

      if (status !== 401 || !original || original._retry) {
        return Promise.reject(error);
      }

      original._retry = true;

      const newToken = await getOrRunRefresh();
      if (!newToken) {
        await forceLogout();
        return Promise.reject(error);
      }

      if (original.headers) {
        original.headers.Authorization = `Bearer ${newToken}`;
      }
      return client(original);
    },
  );
}

async function getOrRunRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = runRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function runRefresh(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    // Use bare axios (NOT the intercepted client) to avoid recursion.
    const response = await axios.post(
      `${ENV.apiUrl}${endpoints.auth.refresh()}`,
      { refreshToken },
      { timeout: ENV.apiTimeout || 30000 },
    );

    const { accessToken, refreshToken: newRefreshToken } = response.data;
    if (!accessToken || !newRefreshToken) return null;

    await saveTokens({ accessToken, refreshToken: newRefreshToken });
    return accessToken;
  } catch {
    return null;
  }
}

async function forceLogout(): Promise<void> {
  await clearTokens();
  reset('AuthFlow');
  // Wait one frame so the toast overlays the fresh Login screen,
  // not the outgoing screen mid-transition.
  setTimeout(() => {
    toast.info('Your session expired. Please sign in again.');
  }, 0);
}
