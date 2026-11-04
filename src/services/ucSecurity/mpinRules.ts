/**
 * ------------------------------------------------------------------
 * UC MPIN rules — client mirror of the backend's mpinWeakness()
 * ------------------------------------------------------------------
 * Same rules as urbancruisebackend/src/modules/auth/service/uc-crypto.ts
 * so the user gets the error before a request is made. The SERVER is
 * still the authority: it re-checks and answers `uc_mpin_weak`.
 * Keep the two in sync if either side changes.
 * ------------------------------------------------------------------
 */

export const MPIN_LENGTH = 4;

export type MpinWeakness =
  | 'format'
  | 'repeated'
  | 'sequence'
  | 'pattern'
  | 'common';

/** Same list as the backend's COMMON_MPINS. */
const COMMON_MPINS: ReadonlySet<string> = new Set([
  '2580',
  '0852',
  '1004',
  '6969',
]);

/** Why `mpin` is refused, or null when it is acceptable. */
export function mpinWeakness(mpin: string): MpinWeakness | null {
  if (!/^\d{4}$/.test(mpin)) return 'format';
  const [a, b, c, d] = mpin;
  if (a === b && b === c && c === d) return 'repeated';
  // Digits as a cycle (…8, 9, 0, 1…), so 8901 and 9012 count too.
  if ('0123456789012'.includes(mpin) || '2109876543210'.includes(mpin)) {
    return 'sequence';
  }
  if ((a === c && b === d) || (a === b && c === d)) return 'pattern';
  if (COMMON_MPINS.has(mpin)) return 'common';
  return null;
}

/** Same text the server sends with `uc_mpin_weak`. */
export const WEAK_MPIN_MESSAGE =
  'This MPIN is too easy to guess. Choose another.';
