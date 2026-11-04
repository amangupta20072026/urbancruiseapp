/**
 * Maps backend errors from the UC security endpoints to what the
 * screens need: a code, the attempts left, whether the session is
 * over, and a short message in plain words.
 */
import { ApiError } from '@api/errors';
import { UcKeyError } from './keys';
import { UC_ERROR } from './types';

export function ucErrorCode(err: unknown): string | undefined {
  return err instanceof ApiError ? err.code : undefined;
}

/** `details.attemptsLeft` from uc_mpin_invalid / uc_mpin_locked. */
export function attemptsLeft(err: unknown): number | null {
  if (!(err instanceof ApiError)) return null;
  const body = err.data as
    | { error?: { details?: { attemptsLeft?: unknown } } }
    | undefined;
  const n = body?.error?.details?.attemptsLeft;
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 ? n : null;
}

/**
 * Codes after which this phone can only continue through a new OTP
 * login: the session or the phone's registration is gone, or the
 * phone's key no longer matches the server.
 */
const SESSION_ENDING: ReadonlySet<string> = new Set([
  UC_ERROR.DEVICE_NOT_REGISTERED,
  UC_ERROR.DEVICE_UNKNOWN,
  UC_ERROR.SETUP_EXPIRED,
  UC_ERROR.MPIN_LOCKED,
  UC_ERROR.SIGNATURE_INVALID,
  UC_ERROR.ROLE_MISMATCH,
  UC_ERROR.SESSION_REVOKED,
  UC_ERROR.REFRESH_INVALID,
  UC_ERROR.ACCOUNT_SUSPENDED,
]);

export function isSessionEndingError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  if (err.code && SESSION_ENDING.has(err.code)) return true;
  // A 401 with an unknown code on these endpoints means the refresh
  // token itself was refused (expired or malformed).
  return (
    err.kind === 'unauthorized' &&
    err.code !== UC_ERROR.MPIN_INVALID &&
    err.code !== UC_ERROR.CHALLENGE_INVALID &&
    err.code !== UC_ERROR.UNLOCK_REQUIRED
  );
}

/** Short, plain message for a failed UC security request. */
export function ucErrorMessage(err: unknown): string {
  if (err instanceof UcKeyError) {
    return 'This phone could not be verified. Please try again.';
  }
  if (!(err instanceof ApiError))
    return 'Something went wrong. Please try again.';
  switch (err.code) {
    case UC_ERROR.MPIN_INVALID: {
      const left = attemptsLeft(err);
      return left === null
        ? 'Wrong MPIN.'
        : `Wrong MPIN. ${left} ${left === 1 ? 'attempt' : 'attempts'} left.`;
    }
    case UC_ERROR.MPIN_LOCKED:
      return 'Too many wrong attempts. Log in again with OTP and set a new MPIN.';
    case UC_ERROR.MPIN_WEAK:
      return 'This MPIN is too easy to guess. Choose another.';
    case UC_ERROR.MPIN_SAME:
      return 'New MPIN must be different from the current one.';
    case UC_ERROR.CHALLENGE_INVALID:
      return 'This request has expired. Please try again.';
    case UC_ERROR.SETUP_EXPIRED:
      return 'For your safety, log in again with OTP to set your MPIN.';
    case UC_ERROR.SIGNATURE_INVALID:
    case UC_ERROR.DEVICE_UNKNOWN:
      return 'This phone could not be verified. Please log in again with OTP.';
    case UC_ERROR.DEVICE_NOT_REGISTERED:
      return 'Your MPIN is not set up on this phone. Please log in again with OTP.';
    case UC_ERROR.ACCOUNT_SUSPENDED:
      return 'This account is not active. Please contact your Urban Cruise administrator.';
    case UC_ERROR.SESSION_REVOKED:
    case UC_ERROR.REFRESH_INVALID:
      return 'Your session has ended. Please log in again.';
    default:
      break;
  }
  if (err.kind === 'network')
    return 'No internet connection. Please try again.';
  if (err.kind === 'timeout') return 'The request timed out. Please try again.';
  if (err.kind === 'rateLimited')
    return 'Too many tries. Please wait a few minutes and try again.';
  if (err.kind === 'unauthorized')
    return 'Your session has ended. Please log in again.';
  return err.message || 'Something went wrong. Please try again.';
}
