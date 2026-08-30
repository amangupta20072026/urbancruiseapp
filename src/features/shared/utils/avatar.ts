/* eslint-disable no-bitwise */
/**
 * ------------------------------------------------------------------
 * Avatar helpers — shared across role features
 * ------------------------------------------------------------------
 * Deterministic initial + colour derivation for a stable "avatar
 * fallback" when we don't have (or don't want to load) a real photo.
 *
 * Both functions are pure — same input, same output — so they're
 * safe to call in render without memoisation.
 * ------------------------------------------------------------------ */

/**
 * Extract up to two uppercase initials from a display name.
 * "Aman Gupta"    → "AG"
 * "Aman"          → "A"
 * "Dr. A. K. Rao" → "AK"
 * ""              → "?"
 */
export function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .map(w => w.replace(/[^A-Za-z]/g, ''))
    .filter(Boolean);
  const two = letters
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
  return two || '?';
}

/**
 * Six-colour palette. Extend only by APPENDING — existing hash-mod
 * indices must stay stable so a given id always maps to the same
 * colour across sessions (a subtle "identity signal" for users).
 */
const AVATAR_PALETTE = [
  { bg: '#DCFCE7', fg: '#16A34A' }, // green
  { bg: '#FFEDD5', fg: '#EA580C' }, // orange
  { bg: '#DBEAFE', fg: '#2563EB' }, // blue
  { bg: '#F3E8FF', fg: '#7C3AED' }, // purple
  { bg: '#FEF3C7', fg: '#D97706' }, // amber
  { bg: '#FCE7F3', fg: '#DB2777' }, // pink
] as const;

/**
 * Deterministic colour pick keyed by a stable id (customer id, user
 * id, whatever). Same id → same colour, forever.
 */
export function avatarColorFor(id: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
