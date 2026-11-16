/**
 * ------------------------------------------------------------------
 * Vehicle brochures — data hooks
 * ------------------------------------------------------------------
 * One query (the whole catalog) feeds every brochure surface:
 *   useBrochures()          raw catalog + query state
 *   useBrochureFor(lookup)  one vehicle's brochure (cards, Compare)
 *   useGroupedBrochures()   type → seater → tier tree (Brochures screen)
 *
 * Caching — stale-while-revalidate:
 *   - Persisted to MMKV by the app's PersistQueryClientProvider (no
 *     `meta.persist: false`), so warm starts and offline show the last
 *     catalog instantly.
 *   - `staleTime: 0` + the default `refetchOnMount`, so every brochure
 *     surface revalidates as it opens.
 *
 *   WHY NOT A LONG staleTime
 *     This used to be `staleTime: 1 hour`, on the reasoning that the
 *     catalog only changes on a backend deploy. True, but the saved
 *     copy ALSO survives app restarts (persister maxAge 24 h), so a
 *     device that had fetched the catalog simply never asked again —
 *     a video added by ops stayed invisible for up to an hour, and
 *     closing the app did not help. The backend was never even hit:
 *     no /config/brochures line appeared in its log at all.
 *
 *   WHY THIS IS CHEAP
 *     The catalog is six entries, and GET /config/brochures sets a
 *     strong ETag with `Cache-Control: max-age=60,
 *     stale-while-revalidate=300`. The platform HTTP cache (OkHttp on
 *     Android, NSURLSession on iOS) revalidates with If-None-Match on
 *     its own, so an unchanged catalog comes back 304 with no body.
 *     A revalidation costs a few hundred bytes.
 *
 *   WHAT THE CUSTOMER SEES
 *     Nothing. The cached catalog renders immediately, `isLoading`
 *     stays false because there is already data, and the refetch runs
 *     in the background. Screens read `isLoading`, never `isFetching`,
 *     so no spinner appears.
 *
 *   NOT a job for QUERY_CACHE_BUSTER: that exists for data-SHAPE
 *   changes between builds. Using it for content would mean an app
 *   release every time ops adds a video.
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

const EMPTY: readonly BrochureEntry[] = [];

/**
 * `enabled: false` skips the network call (e.g. a screen that has no
 * brochure to show) while still reading any cached catalog.
 */
export function useBrochures(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.customer.brochures.catalog(),
    queryFn: fetchBrochureCatalog,
    // Always revalidate on mount; the persisted copy still renders
    // first, so this is invisible. See the header note.
    staleTime: 0,
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
