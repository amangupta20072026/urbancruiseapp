/**
 * ------------------------------------------------------------------
 * Axios Instance — Single Source
 * ------------------------------------------------------------------
 * The ONE axios instance the whole app uses.
 * Feature code imports { apiClient } from '@api/axios'.
 * Never create additional instances anywhere.
 * ------------------------------------------------------------------
 */

import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { ENV } from '@config/env';
import { attachAuthInterceptor } from './interceptors/auth';
import { attachErrorInterceptor } from './interceptors/error';
import { attachRefreshInterceptor } from './interceptors/refresh';

export const apiClient: AxiosInstance = axios.create({
  baseURL: ENV.apiUrl,
  timeout: ENV.apiTimeout || 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Envelope unwrap — the backend wraps every success in
 *   { data: <payload>, requestId: '...' }
 * and this interceptor rewrites `response.data` to be just the payload,
 * so feature hooks can read fields directly (e.g. `data.accessToken`)
 * instead of `data.data.accessToken`. The `requestId` is stashed on the
 * response for anyone who needs it for logging.
 *
 * If the body doesn't match the envelope shape (e.g. 204 no-content),
 * we leave it alone.
 */
apiClient.interceptors.response.use((response: AxiosResponse) => {
  const body = response.data;
  if (
    body &&
    typeof body === 'object' &&
    'data' in body &&
    'requestId' in body
  ) {
    (response as AxiosResponse & { requestId?: string }).requestId = (
      body as { requestId: string }
    ).requestId;
    response.data = (body as { data: unknown }).data;
  }
  return response;
});

// Order matters:
//   1. auth adds Authorization header
//   2. error normalizes response failures to ApiError
//   3. refresh handles 401 → refresh dance (runs after error normalization)
attachAuthInterceptor(apiClient);
attachErrorInterceptor(apiClient);
attachRefreshInterceptor(apiClient);
