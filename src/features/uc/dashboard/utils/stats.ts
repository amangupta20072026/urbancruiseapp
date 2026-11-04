/**
 * ------------------------------------------------------------------
 * UC dashboard — stat helpers (pure, unit-tested)
 * ------------------------------------------------------------------
 */
import {
  isStatKey,
  STAT_KEYS,
  type OutstandingCollection,
  type QuotationConversion,
  type StatMetric,
} from '../types';

/**
 * Known stats only, in STAT_KEYS order, one per key (first wins).
 * Unknown keys (from a newer backend or old saved data) are dropped.
 */
export function orderStats(
  stats: readonly StatMetric[] | undefined,
): StatMetric[] {
  const byKey = new Map<string, StatMetric>();
  for (const m of stats ?? []) {
    if (isStatKey(m.key) && !byKey.has(m.key)) byKey.set(m.key, m);
  }
  return STAT_KEYS.flatMap(k => {
    const m = byKey.get(k);
    return m ? [m] : [];
  });
}

/**
 * Conversion rate as a whole-ish percentage, 0–100, one decimal:
 * 89 of 214 → 41.6. Returns null when the data can't be trusted
 * (missing, negative, total 0, converted > total) — the card is then
 * hidden rather than showing a wrong number.
 */
export function conversionRate(
  c: QuotationConversion | null | undefined,
): number | null {
  if (!c) return null;
  const { converted, total } = c;
  if (
    !Number.isFinite(converted) ||
    !Number.isFinite(total) ||
    converted < 0 ||
    total <= 0 ||
    converted > total
  ) {
    return null;
  }
  return Math.round((converted / total) * 1000) / 10;
}

/** "1,245" — Indian grouping for the conversion counts. */
export function formatCount(n: number): string {
  return Math.round(n).toLocaleString('en-IN');
}

/**
 * Collected as % of this month's target, one decimal: ₹2,08,900 of
 * ₹3,42,500 → 61. Can go above 100 (target beaten) — the bar is capped,
 * the text is not. Returns null when the data can't be trusted
 * (missing, target ≤ 0, collected < 0, not finite).
 */
export function collectionRate(
  c: OutstandingCollection | null | undefined,
): number | null {
  if (!c) return null;
  const target = c.target?.amount;
  const collected = c.collected?.amount;
  if (
    !Number.isFinite(target) ||
    !Number.isFinite(collected) ||
    target <= 0 ||
    collected < 0
  ) {
    return null;
  }
  return Math.round((collected / target) * 1000) / 10;
}
