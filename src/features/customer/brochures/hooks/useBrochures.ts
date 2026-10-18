/**
 * ------------------------------------------------------------------
 * Vehicle brochures — data hooks
 * ------------------------------------------------------------------
 * One query (the whole catalog) feeds every brochure surface:
 *   useBrochures()          raw catalog + query state
 *   useBrochureFor(lookup)  one vehicle's brochure (cards, Compare)
 *   useGroupedBrochures()   type → seater → tier tree (Brochures screen)
 *
 * Caching:
 *   - Persisted to MMKV by the app's PersistQueryClientProvider (no
 *     `meta.persist: false`), so warm starts and offline show the last
 *     catalog instantly.
 *   - staleTime 1 hour: the catalog changes only on a backend deploy.
 *
 * Errors:
 *   - `meta.silent` — no global toast. The quotation screen hides its
 *     brochure UI on failure (it must never block the quotation); the
 *     Brochures screen shows its own error view with Try again.
 * ------------------------------------------------------------------
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@constants/queryKeys';
import { fetchBrochureCatalog } from '../api';
import { groupBrochures } from '../utils/grouping';
import { findBrochure } from '../utils/match';
import type {
  BrochureEntry,
  BrochureLookup,
  BrochureVehicleTypeGroup,
} from '../types';

export const BROCHURE_STALE_TIME_MS = 60 * 60 * 1000;

const EMPTY: readonly BrochureEntry[] = [];

/**
 * `enabled: false` skips the network call (e.g. a screen that has no
 * brochure to show) while still reading any cached catalog.
 */
export function useBrochures(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.customer.brochures.catalog(),
    queryFn: fetchBrochureCatalog,
    staleTime: BROCHURE_STALE_TIME_MS,
    meta: { silent: true },
    enabled: options.enabled ?? true,
  });
}

export type BrochureForResult = {
  /** null while loading, on error, or when no brochure matches. */
  entry: BrochureEntry | null;
  isLoading: boolean;
  isError: boolean;
};

/**
 * Pass `null` when the screen has no vehicle to look up; the query
 * still shares the one cached catalog.
 */
export function useBrochureFor(
  lookup: BrochureLookup | null,
): BrochureForResult {
  const { data, isLoading, isError } = useBrochures();
  const entries = data ?? EMPTY;

  const vehicleType = lookup?.vehicleType;
  const seater = lookup?.seater;
  const tier = lookup?.tier;

  const entry = useMemo(() => {
    if (
      vehicleType === undefined ||
      seater === undefined ||
      tier === undefined
    ) {
      return null;
    }
    return findBrochure(entries, { vehicleType, seater, tier });
  }, [entries, vehicleType, seater, tier]);

  return { entry, isLoading, isError };
}

export type GroupedBrochuresResult = {
  groups: BrochureVehicleTypeGroup[];
  isLoading: boolean;
  isError: boolean;
  isRefetching: boolean;
  refetch: () => void;
};

export function useGroupedBrochures(): GroupedBrochuresResult {
  const { data, isLoading, isError, isRefetching, refetch } = useBrochures();
  const entries = data ?? EMPTY;
  const groups = useMemo(() => groupBrochures(entries), [entries]);

  return {
    groups,
    isLoading,
    // Cached data stays usable when a background refetch fails.
    isError: isError && entries.length === 0,
    isRefetching,
    refetch: () => {
      refetch().catch(() => {
        // Errors surface through the query state; nothing to do here.
      });
    },
  };
}
