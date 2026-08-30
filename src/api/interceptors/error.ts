/**
 * ------------------------------------------------------------------
 * Error Interceptor
 * ------------------------------------------------------------------
 * Turns every non-2xx response into a typed ApiError.
 * Runs BEFORE the refresh interceptor (order matters).
 * ------------------------------------------------------------------
 */

import type { AxiosError, AxiosInstance } from 'axios';
import { ApiError } from '../errors';

export function attachErrorInterceptor(client: AxiosInstance): void {
  client.interceptors.response.use(
    response => response,
    (error: AxiosError) => Promise.reject(ApiError.from(error)),
  );
}
