/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * useHomeData — the Customer Home screen's data-fetch orchestrator
 * ------------------------------------------------------------------
 * The home screen shows two independent feeds:
 *
 *   1. Active quotation (or null → empty state)
 *   2. Upcoming trip     (or null → hide section)
 *
 * (Recent activity was removed — the Notification Centre already
 * shows those events. "Explore our fleet" reads the brochure catalog
 * through its own hook, not this one.)
 *
 * Each feed has its own cache lifetime, own loading state, and own
 * refetch trigger. Bundling them into a single query would mean any
 * one feed's refresh invalidates the whole page — bad for cache
 * granularity, bad for perceived responsiveness.
 *
 * So we run parallel useQuery calls and compose the returned
 * state at the hook boundary. The screen gets ONE return object
 * with per-feed data plus one top-level `isLoading` + `refetch`.
 *
 * Backend swap:
 *   Each queryFn today reads from a fixture getter. When the real
 *   endpoints ship, replace the fixture call with `apiClient.get(...)`
 *   inside each queryFn — nothing else changes. The endpoints will
 *   likely be:
 *     GET /customer/home/quotation
 *     GET /customer/home/trip/upcoming
 * ------------------------------------------------------------------ */

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';

// Uncomment when backend is ready:
// import { apiClient } from '@api/axios';
// import { endpoints } from '@api/endpoints';
import { queryKeys } from '@constants/queryKeys';
import { delayLikeApi } from '@mocks/helpers/delay';
import {
  getFixtureQuotationForUser,
  getFixtureUpcomingTripForUser,
} from '@mocks/fixtures/customerHome';
import { selectUserId } from '@store/selectors/userSelectors';

import type { QuotationSummary, UpcomingTrip } from '../types';

/* ------------------------------------------------------------------ */
/* Individual fetchers                                                */
/* ------------------------------------------------------------------ */

async function fetchQuotation(
  userId: string,
): Promise<QuotationSummary | null> {
  // TODO(backend): replace with:
  // const { data } = await apiClient.get<QuotationSummary | null>(
  //   endpoints.customer.home.quotation(),
  // );
  // return data;
  await delayLikeApi();
  return getFixtureQuotationForUser(userId);
}

async function fetchUpcomingTrip(userId: string): Promise<UpcomingTrip | null> {
  await delayLikeApi();
  return getFixtureUpcomingTripForUser(userId);
}

/* ------------------------------------------------------------------ */
/* Hook                                                               */
/* ------------------------------------------------------------------ */

export function useHomeData() {
  const userId = useSelector(selectUserId);

  /* Guard: an unauthenticated / unhydrated userId means the whole
   * home page has no meaningful state. Each query gates on
   * `enabled: userId.length > 0` so we don't fire mock delays for
   * nothing during transient logout / re-auth flows. */
  const isEnabled = userId.length > 0;

  const quotationQuery = useQuery({
    queryKey: queryKeys.customer.home.quotation(userId),
    queryFn: () => fetchQuotation(userId),
    enabled: isEnabled,
    /* Home is warm-first — users come back to it multiple times per
     * session, and a stale-but-quick render beats a spinner. 30s
     * matches how CRMs treat "dashboard" data. */
    staleTime: 30_000,
  });

  const upcomingTripQuery = useQuery({
    queryKey: queryKeys.customer.home.upcomingTrip(userId),
    queryFn: () => fetchUpcomingTrip(userId),
    enabled: isEnabled,
    staleTime: 30_000,
  });

  /* Top-level loading: TRUE only if at least one query is fetching
   * AND has no prior data yet. If we're revalidating warm caches,
   * `isLoading` is false and the screen renders the previous data
   * — the correct UX for pull-to-refresh. */
  const isLoading =
    (quotationQuery.isLoading && quotationQuery.fetchStatus !== 'idle') ||
    (upcomingTripQuery.isLoading && upcomingTripQuery.fetchStatus !== 'idle');

  /* Top-level refresh — fires both refetches in parallel. Used
   * by pull-to-refresh on the ScrollView. */
  const refresh = useCallback(() => {
    void quotationQuery.refetch();
    void upcomingTripQuery.refetch();
  }, [quotationQuery, upcomingTripQuery]);

  const isRefreshing =
    quotationQuery.isFetching || upcomingTripQuery.isFetching;

  const error = quotationQuery.error ?? upcomingTripQuery.error ?? null;

  return {
    quotation: quotationQuery.data ?? null,
    upcomingTrip: upcomingTripQuery.data ?? null,
    isLoading,
    isRefreshing,
    error,
    refresh,
  };
}
