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

/**
 * Fine-grained server code, when present. The backend adds these
 * to auth-related failure bodies (see the OTP failure matrix) so
 * screens can render the right copy without parsing English out of
 * `.message`. Kept as `string` (not a union) so a new server code
 * doesn't force a client release — screens fall through to
 * `.kind`'s default message when they don't know the code.
 *
 *   'account_not_provisioned' — vendor/driver/uc mobile not in DB
 *   'account_locked'          — brute-force lock, retryAfter set
 *   'account_suspended'       — admin-blocked
 *   'signups_disabled'        — MSG91 wallet empty (customer path)
 *   'captcha_required'        — resend/verify threshold hit
 *   'session_revoked'         — refresh-token reuse detected
 *   …plus anything the backend adds later.
 */
export type ApiErrorCode = string;

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly code?: ApiErrorCode;
  readonly status?: number;
  readonly data?: unknown;
  /** Seconds to wait before retrying, if the server said so.
   *  Populated from `Retry-After` header OR `data.retryAfter`. */
  readonly retryAfter?: number;

  constructor(
    kind: ApiErrorKind,
    message: string,
    status?: number,
    data?: unknown,
    code?: ApiErrorCode,
    retryAfter?: number,
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.code = code;
    this.status = status;
    this.data = data;
    this.retryAfter = retryAfter;
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
      const code = readServerCode(data);
      const message = readServerMessage(data) ?? defaultMessage(kind);
      const retryAfter = readRetryAfter(error.response.headers, data);
      return new ApiError(kind, message, status, data, code, retryAfter);
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
  // Backend envelope: { error: { code, message, requestId } }
  if (typeof data === 'object' && data !== null && 'error' in data) {
    const err = (data as { error: unknown }).error;
    if (typeof err === 'object' && err !== null && 'message' in err) {
      const msg = (err as { message: unknown }).message;
      if (typeof msg === 'string') return msg;
    }
  }
  // Legacy / non-enveloped fallback: `{ message: '...' }`
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const msg = (data as { message: unknown }).message;
    if (typeof msg === 'string') return msg;
  }
  return undefined;
}

/**
 * Reads the machine-readable code from the error body. Backend envelope:
 *   { error: { code: 'account_not_provisioned', message: '…', requestId } }
 * Falls back to a top-level `code` for any non-enveloped source.
 */
function readServerCode(data: unknown): string | undefined {
  if (typeof data === 'object' && data !== null && 'error' in data) {
    const err = (data as { error: unknown }).error;
    if (typeof err === 'object' && err !== null && 'code' in err) {
      const code = (err as { code: unknown }).code;
      if (typeof code === 'string') return code;
    }
  }
  if (typeof data === 'object' && data !== null && 'code' in data) {
    const code = (data as { code: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

/**
 * Retry-After header wins over body field. Header can be either a
 * delta-seconds int or an HTTP-date; we only handle the int form
 * because that's what our backend sends. If header is missing,
 * fall back to `data.retryAfter` (an int, seconds).
 */
function readRetryAfter(headers: unknown, data: unknown): number | undefined {
  if (typeof headers === 'object' && headers !== null) {
    const raw =
      (headers as Record<string, unknown>)['retry-after'] ??
      (headers as Record<string, unknown>)['Retry-After'];
    if (typeof raw === 'string' || typeof raw === 'number') {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0) return n;
    }
  }
  if (typeof data === 'object' && data !== null && 'retryAfter' in data) {
    const raw = (data as { retryAfter: unknown }).retryAfter;
    if (typeof raw === 'number' && raw >= 0) return raw;
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
