/**
 * ------------------------------------------------------------------
 * ApiError — Typed error surface
 * ------------------------------------------------------------------
 * All HTTP failures become an ApiError.
 * Feature hooks can safely narrow:
 *   catch (err) {
 *     if (err instanceof ApiError && err.kind === 'validation') { … }
 *   }
 * ------------------------------------------------------------------
 */

import type { AxiosError } from 'axios';

export type ApiErrorKind =
  | 'network' // no response — offline, DNS, aborted
  | 'timeout'
  | 'unauthorized' // 401
  | 'forbidden' // 403
  | 'notFound' // 404
  | 'validation' // 422
  | 'conflict' // 409
  | 'rateLimited' // 429
  | 'server' // 5xx
  | 'unknown';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly data?: unknown;

  constructor(
    kind: ApiErrorKind,
    message: string,
    status?: number,
    data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.data = data;
  }

  static from(error: unknown): ApiError {
    if (error instanceof ApiError) return error;

    if (isAxiosError(error)) {
      if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message)) {
        return new ApiError('timeout', 'Request timed out. Please try again.');
      }
      if (!error.response) {
        return new ApiError('network', 'Network error. Check your connection.');
      }
      const status = error.response.status;
      const data = error.response.data;
      const kind = mapStatus(status);
      const message = readServerMessage(data) ?? defaultMessage(kind);
      return new ApiError(kind, message, status, data);
    }

    return new ApiError(
      'unknown',
      error instanceof Error ? error.message : 'Something went wrong.',
    );
  }
}

function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as AxiosError).isAxiosError === true
  );
}

function readServerMessage(data: unknown): string | undefined {
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const msg = (data as { message: unknown }).message;
    if (typeof msg === 'string') return msg;
  }
  return undefined;
}

function mapStatus(status: number): ApiErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notFound';
  if (status === 409) return 'conflict';
  if (status === 422) return 'validation';
  if (status === 429) return 'rateLimited';
  if (status >= 500) return 'server';
  return 'unknown';
}

function defaultMessage(kind: ApiErrorKind): string {
  switch (kind) {
    case 'unauthorized':
      return 'Please sign in again.';
    case 'forbidden':
      return 'You do not have permission to do that.';
    case 'notFound':
      return 'Not found.';
    case 'conflict':
      return 'That request conflicts with the current state.';
    case 'validation':
      return 'Please check your input and try again.';
    case 'rateLimited':
      return 'Too many requests. Try again in a moment.';
    case 'server':
      return 'Server error. Please try again shortly.';
    case 'timeout':
      return 'Request timed out. Please try again.';
    case 'network':
      return 'Network error. Check your connection.';
    case 'unknown':
      return 'Something went wrong.';
  }
}
