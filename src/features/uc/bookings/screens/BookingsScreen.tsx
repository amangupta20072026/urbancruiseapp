/**
 * ------------------------------------------------------------------
 * BookingsScreen (UC) — TAB ROOT
 * ------------------------------------------------------------------
 * Every booking across every customer, for UC staff.
 *
 * LAYOUT (top → bottom):
 *   [ Bookings                                          [ 🔍 ] ]
 *   [ View and manage all bookings across all customers.        ]
 *   [ 🔍 Search name, booking ID, city or phone           (✕) ]  ← on tap
 *   [ All 124 | Upcoming 28 | Ongoing 16 | Completed 64 | … ]  ← chips
 *   [ UcBookingCard × N ]                                ← FlashList
 *
 * DATA:
 *   `useUcBookingList` (TanStack infinite query, cursor-paged).
 *   Chip + debounced search are part of the query key, so each
 *   combination is cached and switching back is instant. Chip badges
 *   come from the same response (`counts`), so a badge always equals
 *   the rows its chip shows. Fixture-backed until GET /uc/bookings
 *   ships — see the hook header for the contract.
 *
 * CARD LAYOUT:
 *   Wide (>= 440dp) shows the approved 3-column card; narrower
 *   phones get the compact card (amount + View Details on their own
 *   row) so routes and names are not truncated. Picked once here so
 *   every row in the list uses the same layout.
 *
 * NAVIGATION INTENTS:
 *   - View Details → booking detail (not built yet): shows the
 *     standard "Coming soon" toast (`uc.bookingDetail`). When the
 *     screen ships, add its route to UcStackParamList and navigate.
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
// and the same look as Trip History, so one component serves both.
import { HistoryFilterChips } from '@features/uc/customers/components/HistoryFilterChips';

import { useUcBookingList } from '../hooks/useUcBookingList';
import {
  UcBookingCard,
  type UcBookingCardLayout,
} from '../components/UcBookingCard';
import { BookingListSkeleton } from '../components/BookingListSkeleton';
import { UC_BOOKING_FILTER_LABEL } from '../utils/format';
import type { UcBookingListItem, UcBookingStatusFilter } from '../types';

/** Wait this long after the last keystroke before querying. */
const SEARCH_DEBOUNCE_MS = 300;

/** Window width from which the 3-column (design) card fits. */
const WIDE_CARD_MIN_WINDOW_WIDTH = 440;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/** No booking detail screen yet — module-level so rows share one fn. */
const openBookingDetails = (_booking: UcBookingListItem): void => {
  notifyComingSoon('uc.bookingDetail');
};

/* ================================================================
 * Screen
 * ================================================================ */

const BookingsScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const layout: UcBookingCardLayout =
    width >= WIDE_CARD_MIN_WINDOW_WIDTH ? 'wide' : 'compact';

  const [status, setStatus] = useState<UcBookingStatusFilter>('all');
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
  } = useUcBookingList({ status, search });

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
    ({ item }: { item: UcBookingListItem }) => (
      <UcBookingCard
        item={item}
        layout={layout}
        onViewDetails={openBookingDetails}
      />
    ),
    [layout],
  );

  const renderBody = () => {
    if (error && data.length === 0) {
      return (
        <ErrorView
          title="Couldn't load bookings"
          message="Please check your connection and try again."
          onRetry={refetch}
        />
      );
    }
    if (isLoading) return <BookingListSkeleton />;
    if (data.length === 0) {
      if (search.length > 0) {
        return (
          <EmptyState
            title="No matching bookings"
            message="Try a different name, booking ID or city, or enter the full phone number."
            ctaLabel="Clear all"
            onCtaPress={clearAll}
          />
        );
      }
      if (status !== 'all') {
        return (
          <EmptyState
            title={`No ${UC_BOOKING_FILTER_LABEL[
              status
            ].toLowerCase()} bookings`}
            message="Bookings with this status will show up here."
            ctaLabel="Show all bookings"
            onCtaPress={clearAll}
          />
        );
      }
      return (
        <EmptyState
          title="No bookings yet"
          message="Bookings appear here once a customer confirms a quotation."
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
    <SafeScreen edges={['top']} backgroundColor={Colors.backgroundSecondary}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} accessibilityRole="header">
            Bookings
          </Text>
          <Text style={styles.headerSubtitle}>
            View and manage all bookings across all customers.
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
            accessibilityLabel="Search bookings"
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
              placeholder="Search name, booking ID, city or phone"
              placeholderTextColor={Colors.textTertiary}
              returnKeyType="search"
              autoFocus
              autoCorrect={false}
              autoCapitalize="none"
              accessibilityLabel="Search bookings"
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
        />
      </View>

      <View style={styles.body}>{renderBody()}</View>
    </SafeScreen>
  );
};

export default BookingsScreen;

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
        <Text style={styles.footerText}>Loading more bookings…</Text>
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

  /* Search */
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
