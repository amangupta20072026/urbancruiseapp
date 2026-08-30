/**
 * ------------------------------------------------------------------
 * Axios Instance — Single Source
 * ------------------------------------------------------------------
 * The ONE axios instance the whole app uses.
 * Feature code imports { apiClient } from '@api/axios'.
 * Never create additional instances anywhere.
 * ------------------------------------------------------------------
 */

import axios, { type AxiosInstance } from 'axios';
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

// Order matters:
//   1. auth adds Authorization header
//   2. error normalizes response failures to ApiError
//   3. refresh handles 401 → refresh dance (runs after error normalization)
attachAuthInterceptor(apiClient);
attachErrorInterceptor(apiClient);
attachRefreshInterceptor(apiClient);
