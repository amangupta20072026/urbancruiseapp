/**
 * ------------------------------------------------------------------
 * TripsScreen (UC) — TAB ROOT
 * ------------------------------------------------------------------
 * Every trip across every customer, for UC staff. One trip per
 * booking (confirmed product rule), shown trip-first.
 *
 * LAYOUT (top → bottom):
 *   [ Trips                                                    ]
 *   [ Monitor live trips and driver progress.                  ]
 *   [ 🔍 Search by trip ID, route or customer            (✕) ]
 *   [ All 124 | Upcoming 28 | Ongoing 16 | Completed 64 | … ]  ← chips
 *   [ UcTripCard × N ]                                   ← FlashList
 *
 * No filter button (confirmed product decision): search + status
 * chips cover the list.
 *
 * DATA:
 *   `useUcTripList` (TanStack infinite query, cursor-paged). Chip +
 *   debounced search are part of the query key, so each combination
 *   is cached and switching back is instant. Chip badges come from
 *   the same response (`counts`), so a badge always equals the rows
 *   its chip shows. Fixture-backed until GET /uc/trips ships — see
 *   the hook header for the contract.
 *
 * CARD LAYOUT:
 *   Wide (>= 440dp) shows the approved 3-column card; narrower phones
 *   get the compact card (amount on its own row). Picked once here so
 *   every row uses the same layout.
 *
 * NAVIGATION INTENTS:
 *   - View Details → trip detail (not built yet): shows the standard
 *     "Coming soon" toast (`uc.tripDetail`). When the screen ships,
 *     add its route to UcStackParamList and navigate.
 *
 * Tab root: no back chevron.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Search, X } from 'lucide-react-native';

import { EmptyState, ErrorView, SafeScreen } from '@shared/components';
import { Colors, FontWeight, Radius, Spacing, Typography } from '@theme';
import { notifyComingSoon } from '@services/comingSoon';
// Same five chips (All / Upcoming / Ongoing / Completed / Cancelled)
// and the same look as Bookings and Trip History.
import { HistoryFilterChips } from '@features/uc/customers/components/HistoryFilterChips';

import { useUcTripList } from '../hooks/useUcTripList';
import { UcTripCard, type UcTripCardLayout } from '../components/UcTripCard';
import { TripListSkeleton } from '../components/TripListSkeleton';
import type { UcTripListItem, UcTripStatusFilter } from '../types';

/** Wait this long after the last keystroke before querying. */
const SEARCH_DEBOUNCE_MS = 300;

/** Window width from which the 3-column (design) card fits. */
const WIDE_CARD_MIN_WINDOW_WIDTH = 440;

const FILTER_LABEL: Readonly<Record<UcTripStatusFilter, string>> = {
  all: 'All',
  upcoming: 'Upcoming',
  ongoing: 'Ongoing',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/** No trip detail screen yet — module-level so rows share one fn. */
const openTripDetails = (_trip: UcTripListItem): void => {
  notifyComingSoon('uc.tripDetail');
};

/* ================================================================
 * Screen
 * ================================================================ */

const TripsScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const layout: UcTripCardLayout =
    width >= WIDE_CARD_MIN_WINDOW_WIDTH ? 'wide' : 'compact';

  const [status, setStatus] = useState<UcTripStatusFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS);

  const {
    data,
    counts,
    isLoading,
    isRefreshing,
    isSwitching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
  } = useUcTripList({ status, search });

  const clearAll = useCallback(() => {
    setStatus('all');
    setSearchInput('');
  }, []);

  /* -------- List -------- */

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: UcTripListItem }) => (
      <UcTripCard item={item} layout={layout} onViewDetails={openTripDetails} />
    ),
    [layout],
  );

  const renderBody = () => {
    if (error && data.length === 0) {
      return (
        <ErrorView
          title="Couldn't load trips"
          message="Please check your connection and try again."
          onRetry={refetch}
        />
      );
    }
    if (isLoading) return <TripListSkeleton />;
    if (data.length === 0) {
      if (search.length > 0) {
        return (
          <EmptyState
            title="No matching trips"
            message="Try a different trip ID, city or customer name."
            ctaLabel="Clear all"
            onCtaPress={clearAll}
          />
        );
      }
      if (status !== 'all') {
        return (
          <EmptyState
            title={`No ${FILTER_LABEL[status].toLowerCase()} trips`}
            message="Trips with this status will show up here."
            ctaLabel="Show all trips"
            onCtaPress={clearAll}
          />
        );
      }
      return (
        <EmptyState
          title="No trips yet"
          message="Trips appear here once a customer confirms a booking."
        />
      );
    }
    return (
      <FlashList
        data={data}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        extraData={layout}
        style={isSwitching ? styles.listSwitching : undefined}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refetch}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        ListFooterComponent={
          <ListFooter
            isFetchingNextPage={isFetchingNextPage}
            reachedEnd={!hasNextPage}
          />
        }
      />
    );
  };

  /* -------- Render -------- */

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          Trips
        </Text>
        <Text style={styles.headerSubtitle}>
          Monitor live trips and driver progress.
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Search size={20} color={Colors.textTertiary} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search by trip ID, route or customer"
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel="Search trips"
          />
          {searchInput.length > 0 ? (
            <Pressable
              onPress={() => setSearchInput('')}
              hitSlop={10}
              style={styles.clearBtn}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <X size={12} color={Colors.textInverse} strokeWidth={3} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Status chips */}
      <HistoryFilterChips value={status} onChange={setStatus} counts={counts} />

      <View style={styles.body}>{renderBody()}</View>
    </SafeScreen>
  );
};

export default TripsScreen;

/* ================================================================
 * Footer
 * ================================================================ */

const ListFooter: React.FC<{
  isFetchingNextPage: boolean;
  reachedEnd: boolean;
}> = ({ isFetchingNextPage, reachedEnd }) => {
  if (isFetchingNextPage) {
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.footerText}>Loading more trips…</Text>
      </View>
    );
  }
  if (reachedEnd) {
    return (
      <View style={styles.footer}>
        <Text style={styles.footerEnd}>You&apos;ve reached the end</Text>
      </View>
    );
  }
  return null;
};

/* ================================================================
 * Styles
 * ================================================================ */

const CONTROL_HEIGHT = 48;

const styles = StyleSheet.create({
  /* Header */
  header: {
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: FontWeight.extraBold,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },

  /* Search */
  searchRow: {
    paddingHorizontal: Spacing.md,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: CONTROL_HEIGHT,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  searchInput: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    padding: 0,
    includeFontPadding: false,
  },
  clearBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Body */
  body: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxl,
  },
  listSwitching: {
    opacity: 0.55,
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  footerText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  footerEnd: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },
});
