/**
 * ------------------------------------------------------------------
 * Auth Interceptor
 * ------------------------------------------------------------------
 * Attaches `Authorization: Bearer <jwt>` from Keychain to every request.
 * ------------------------------------------------------------------
 */

import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken } from '@services/storage/secureStorage';

export function attachAuthInterceptor(client: AxiosInstance): void {
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const token = await getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
  );
}
