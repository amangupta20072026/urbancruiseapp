/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * useHomeData — the Customer Home screen's data-fetch orchestrator
 * ------------------------------------------------------------------
 * The home screen shows three independent feeds:
 *
 *   1. Active quotation (or null → empty state)
 *   2. Upcoming trip     (or null → hide section)
 *   3. Recent activity   (list, latest N shown)
 *
 * Each feed has its own cache lifetime, own loading state, and own
 * refetch trigger. Bundling them into a single query would mean any
 * one feed's refresh invalidates the whole page — bad for cache
 * granularity, bad for perceived responsiveness.
 *
 * So we run three parallel useQuery calls and compose the returned
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
 *     GET /customer/activity?limit=N&cursor=...
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
  getFixtureRecentActivityForUser,
  getFixtureUpcomingTripForUser,
} from '@mocks/fixtures/customerHome';
import { selectUserId } from '@store/selectors/userSelectors';

import type { ActivityItem, QuotationSummary, UpcomingTrip } from '../types';

const RECENT_ACTIVITY_HOME_LIMIT = 3;

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

async function fetchRecentActivity(userId: string): Promise<ActivityItem[]> {
  await delayLikeApi();
  /* Full history from fixture, then slice at the boundary. Backend
   * will accept a `limit` query param so it slices server-side — same
   * shape, just moved. */
  const all = getFixtureRecentActivityForUser(userId);
  return all.slice(0, RECENT_ACTIVITY_HOME_LIMIT);
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

  const recentActivityQuery = useQuery({
    queryKey: queryKeys.customer.home.recentActivity(userId),
    queryFn: () => fetchRecentActivity(userId),
    enabled: isEnabled,
    /* Activity is the freshest of the three — a new payment landing
     * should show up quickly. Shorter stale window. */
    staleTime: 10_000,
  });

  /* Top-level loading: TRUE only if at least one query is fetching
   * AND has no prior data yet. If we're revalidating warm caches,
   * `isLoading` is false and the screen renders the previous data
   * — the correct UX for pull-to-refresh. */
  const isLoading =
    (quotationQuery.isLoading && quotationQuery.fetchStatus !== 'idle') ||
    (upcomingTripQuery.isLoading && upcomingTripQuery.fetchStatus !== 'idle') ||
    (recentActivityQuery.isLoading &&
      recentActivityQuery.fetchStatus !== 'idle');

  /* Top-level refresh — fires all three refetches in parallel. Used
   * by pull-to-refresh on the ScrollView. */
  const refresh = useCallback(() => {
    void quotationQuery.refetch();
    void upcomingTripQuery.refetch();
    void recentActivityQuery.refetch();
  }, [quotationQuery, upcomingTripQuery, recentActivityQuery]);

  const isRefreshing =
    quotationQuery.isFetching ||
    upcomingTripQuery.isFetching ||
    recentActivityQuery.isFetching;

  const error =
    quotationQuery.error ??
    upcomingTripQuery.error ??
    recentActivityQuery.error ??
    null;

  return {
    quotation: quotationQuery.data ?? null,
    upcomingTrip: upcomingTripQuery.data ?? null,
    recentActivity: recentActivityQuery.data ?? [],
    isLoading,
    isRefreshing,
    error,
    refresh,
  };
}
