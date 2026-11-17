/**
 * ------------------------------------------------------------------
 * Spiritual Tours — data hooks
 * ------------------------------------------------------------------
 * One query (the whole catalog) feeds both surfaces:
 *   useSpiritualTours()     raw catalog + query state
 *   useTourSections()       region sections (the list screen)
 *   useSpiritualTour(id)    one tour (the detail screen)
 *
 * Caching — stale-while-revalidate, deliberately the same shape as
 * useBrochures:
 *   - Persisted to MMKV by the app's PersistQueryClientProvider (no
 *     `meta.persist: false`), so a warm start and an offline open
 *     show the last catalog instantly.
 *   - `staleTime: 0` + the default `refetchOnMount`, so the screen
 *     revalidates every time it opens.
 *
 *   WHY NOT A LONG staleTime
 *     Brochures learned this the hard way — see the note in
 *     useBrochures.ts. A long staleTime plus a persisted copy means
 *     the device simply stops asking, and a tour ops added stays
 *     invisible until the persister's own maxAge expires. The
 *     backend was never even hit. The same trap applies here.
 *
 *   WHY THIS IS CHEAP
 *     The catalog is six entries and GET /config/spiritual-tours
 *     sets a strong ETag with `Cache-Control: max-age=60,
 *     stale-while-revalidate=300`. The platform HTTP cache (OkHttp
 *     on Android, NSURLSession on iOS) revalidates with
 *     If-None-Match by itself, so an unchanged catalog comes back
 *     304 with no body — a few hundred bytes.
 *
 *   WHAT THE CUSTOMER SEES
 *     Nothing. The cached catalog renders immediately, `isLoading`
 *     stays false because there is already data, and the refetch
 *     runs in the background. Screens read `isLoading`, never
 *     `isFetching`, so no spinner appears over real content.
 *
 * Errors:
 *   - `meta.silent` — no global toast. The list screen shows its own
 *     ErrorView with Try again, which is the better place for it.
 * ------------------------------------------------------------------ */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@constants/queryKeys';
import { fetchSpiritualTours } from '../api';
import { findTourById, groupToursByRegion } from '../utils/grouping';
import type { SpiritualTour, SpiritualTourSection } from '../types';

const EMPTY: readonly SpiritualTour[] = [];

export function useSpiritualTours() {
  return useQuery({
    queryKey: queryKeys.customer.spiritualTours.catalog(),
    queryFn: fetchSpiritualTours,
    // Always revalidate on mount; the persisted copy still renders
    // first, so this is invisible. See the header note.
    staleTime: 0,
    meta: { silent: true },
  });
}

export type TourSectionsResult = {
  sections: SpiritualTourSection[];
  isLoading: boolean;
  isError: boolean;
  /** True when the catalog loaded successfully but holds no tours. */
  isEmpty: boolean;
  refetch: () => void;
};

/** The list screen's view of the catalog. */
export function useTourSections(): TourSectionsResult {
  const query = useSpiritualTours();
  const tours = query.data ?? EMPTY;

  const sections = useMemo(() => groupToursByRegion(tours), [tours]);

  return {
    sections,
    isLoading: query.isLoading,
    isError: query.isError,
    isEmpty: !query.isLoading && !query.isError && sections.length === 0,
    refetch: query.refetch,
  };
}

export type SpiritualTourResult = {
  tour: SpiritualTour | null;
  isLoading: boolean;
  isError: boolean;
  /**
   * True when the catalog loaded but holds no tour with this id —
   * e.g. a deep link to a tour ops has since removed. The detail
   * screen shows a "no longer available" state, not an error.
   */
  isMissing: boolean;
  refetch: () => void;
};

/** The detail screen's view: one tour out of the same cached catalog. */
export function useSpiritualTour(id: string): SpiritualTourResult {
  const query = useSpiritualTours();
  const tours = query.data ?? EMPTY;

  const tour = useMemo(() => findTourById(tours, id), [tours, id]);

  return {
    tour,
    isLoading: query.isLoading,
    isError: query.isError,
    isMissing: !query.isLoading && !query.isError && tour === null,
    refetch: query.refetch,
  };
}
