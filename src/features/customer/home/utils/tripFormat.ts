/**
 * ------------------------------------------------------------------
 * tripFormat — display formatters for the Upcoming Trip card
 * ------------------------------------------------------------------
 * Pure functions (no React Native imports) so they are unit-tested
 * in isolation. They only format numbers the backend sent; nothing
 * is computed or estimated here.
 * ------------------------------------------------------------------ */

/**
 * "≈ 4 hr 30 min" · "≈ 4 hr" · "≈ 45 min".
 * Returns null for a missing or non-positive value so the caller
 * hides the item instead of printing "≈ 0 min".
 */
export const fmtEstimatedDuration = (
  minutes: number | undefined,
): string | null => {
  if (minutes === undefined || !Number.isFinite(minutes) || minutes <= 0) {
    return null;
  }
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `≈ ${m} min`;
  if (m === 0) return `≈ ${h} hr`;
  return `≈ ${h} hr ${m} min`;
};

/**
 * "≈ 233 km" — Indian digit grouping above 999. Returns null for a
 * missing or non-positive value.
 */
export const fmtDistanceKm = (km: number | undefined): string | null => {
  if (km === undefined || !Number.isFinite(km) || km <= 0) return null;
  return `≈ ${Math.round(km).toLocaleString('en-IN')} km`;
};
