/**
 * ------------------------------------------------------------------
 * TripsScreen (UC) — TAB ROOT
 * ------------------------------------------------------------------
 * Every trip across every customer, for UC staff. One trip per
 * booking (confirmed product rule), shown trip-first.
 *
 * LAYOUT (top → bottom):
 *   [ Trips                                             [ 🔍 ] ]
 *   [ Monitor live trips and driver progress.                  ]
 *   [ 🔍 Search by trip ID, route or customer            (✕) ]  ← on tap
 *   [ All 124 | Upcoming 28 | Ongoing 16 | Completed 64 | … ]  ← chips
 *   [ UcTripCard × N ]                                   ← FlashList
 *
 * No filter button (confirmed product decision): search + status
 * chips cover the list.
 *
 * SEARCH (same as BookingsScreen):
 *   The header search icon opens the search row (input auto-focused).
 *   The ✕ closes it AND clears the text, so no hidden filter stays
 *   active while the row is closed.
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
 *   `layout` is still computed and passed, but UcTripCard now uses one
 *   layout for every width and ignores it.
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
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import type { UcTabParamList } from '@navigation/types';
import { Search, X } from 'lucide-react-native';

import { EmptyState, ErrorView, SafeScreen } from '@shared/components';
import { Colors, FontWeight, Radius, Spacing, Typography } from '@theme';
import { notifyComingSoon } from '@services/comingSoon';
// Same five chips (All / Upcoming / Ongoing / Completed / Cancelled)
// and layout as Bookings and Trip History; colours match this tab's
// own cards (UC_TRIP_CHIP_PALETTE).
import { HistoryFilterChips } from '@features/uc/customers/components/HistoryFilterChips';

import { useUcTripList } from '../hooks/useUcTripList';
import {
  UC_TRIP_CHIP_PALETTE,
  UcTripCard,
  type UcTripCardLayout,
} from '../components/UcTripCard';
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

  const route = useRoute<RouteProp<UcTabParamList, 'Trips'>>();
  const navigation = useNavigation<NavigationProp<UcTabParamList, 'Trips'>>();
  const requestedStatus = route.params?.status;

  const [status, setStatus] = useState<UcTripStatusFilter>(
    requestedStatus ?? 'all',
  );

  /* A screen that opens this tab with a status (dashboard › Upcoming
   * Trips › View All) selects that chip. The param is cleared right
   * away so the same request works again next time, and so it never
   * overrides a chip the user picks afterwards. */
  useEffect(() => {
    if (!requestedStatus) return;
    setStatus(requestedStatus);
    navigation.setParams({ status: undefined });
  }, [requestedStatus, navigation]);
  const [searchOpen, setSearchOpen] = useState(false);
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

  /* -------- Search -------- */

  const openSearch = useCallback(() => setSearchOpen(true), []);

  /** Closing search also clears it, so no hidden filter stays active. */
  const closeSearch = useCallback(() => {
    setSearchInput('');
    setSearchOpen(false);
  }, []);

  const clearAll = useCallback(() => {
    setStatus('all');
    closeSearch();
  }, [closeSearch]);

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
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} accessibilityRole="header">
            Trips
          </Text>
          <Text style={styles.headerSubtitle}>
            Monitor live trips and driver progress.
          </Text>
        </View>
        {searchOpen ? null : (
          <Pressable
            onPress={openSearch}
            hitSlop={6}
            style={({ pressed }) => [
              styles.searchIconBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Search trips"
          >
            <Search size={22} color={Colors.textPrimary} strokeWidth={2} />
          </Pressable>
        )}
      </View>

      {/* Search (revealed by the header icon) */}
      {searchOpen ? (
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
              autoFocus
              autoCorrect={false}
              autoCapitalize="none"
              accessibilityLabel="Search trips"
            />
          </View>
          <Pressable
            onPress={closeSearch}
            hitSlop={10}
            style={({ pressed }) => [
              styles.searchCloseBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Close search"
          >
            <X size={20} color={Colors.textPrimary} strokeWidth={2.2} />
          </Pressable>
        </View>
      ) : null}

      {/* Status chips */}
      <View style={styles.chipStrip}>
        <HistoryFilterChips
          value={status}
          onChange={setStatus}
          counts={counts}
          palette={UC_TRIP_CHIP_PALETTE}
        />
      </View>

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
  /* Header — same as BookingsScreen */
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: Spacing.xs,
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
  searchIconBtn: {
    width: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Search — same as BookingsScreen */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
  },
  searchWrap: {
    flex: 1,
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
  searchCloseBtn: {
    width: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Chips */
  chipStrip: {
    paddingTop: Spacing.xs,
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

  pressed: { opacity: 0.7 },
});
