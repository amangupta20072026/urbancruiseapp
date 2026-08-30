/**
 * ------------------------------------------------------------------
 * Regex Constants
 * ------------------------------------------------------------------
 * Never inline regex in feature code — import from here.
 * ------------------------------------------------------------------
 */

export const Regex = {
  /** Indian mobile: 10 digits starting with 6-9. */
  indianMobile: /^[6-9]\d{9}$/,

  /** 6-digit OTP. */
  otp: /^\d{6}$/,

  /** Permissive email. */
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  /** Indian GSTIN — 15 characters. */
  gstin: /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]Z[A-Z\d]$/,

  /** Indian PAN — 10 characters. */
  pan: /^[A-Z]{5}\d{4}[A-Z]$/,

  /** Indian licence plate — permissive. */
  vehicleNumber: /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/i,

  /** Digits only. */
  digitsOnly: /^\d+$/,
} as const;
