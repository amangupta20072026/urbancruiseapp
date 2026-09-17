/**
 * ------------------------------------------------------------------
 * BookingsScreen (Customer) — TAB ROOT
 * ------------------------------------------------------------------
 * Landing screen for the Customer "Bookings" tab.
 *
 * LAYOUT (top → bottom):
 *   [My Bookings]
 *   [subtitle]
 *   [All | Upcoming | Ongoing | Completed | Cancelled]  ← chip strip
 *   [🔍 Search…                                  ⚙︎]
 *   [ BookingCard × N ]
 *
 * NAVIGATION INTENTS:
 *   - Card tap / View Details → BookingDetail (ghost route until built)
 *   - Modify Booking          → ModificationRequest (ghost)
 *   - Track Vehicle           → TripLive (ghost; ongoing bookings only)
 *   - Book Again              → RequestQuotation (pre-fills route later)
 *   - Filter icon in search   → TODO(nav): open a filter sheet
 *
 * WHY the search+filter row matches QuotationsScreen:
 *   Both list screens share the same search-bar-plus-filter-button
 *   pattern (rounded search field + square filter trigger) so the
 *   two tabs read as one consistent list-screen language instead of
 *   Bookings using header icon buttons and Quotations using an
 *   inline bar. See QuotationsScreen for the sibling copy.
 *
 * DATA:
 *   Local mock fixture in `../mocks.ts`. Swap for a TanStack Query
 *   hook when /customer/bookings ships; the filter/search reducer
 *   below can be dropped since the server would return pre-filtered
 *   data.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, SlidersHorizontal } from 'lucide-react-native';

import { SafeScreen } from '@shared/components';
import { Colors, Radius, Spacing, Typography } from '@theme';
import { toast } from '@services/toast';
import type { CustomerStackParamList } from '@navigation/types';

import type { BookingFilter, CustomerBookingListItem } from '../types';
import { MOCK_CUSTOMER_BOOKINGS } from '../mocks';
import { BookingCard } from '../components/BookingCard';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;

/* ================================================================
 * Filter chips
 * ================================================================ */

const FILTERS: readonly { key: BookingFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

/* ================================================================
 * Screen
 * ================================================================ */

const BookingsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [filter, setFilter] = useState<BookingFilter>('all');
  const [search, setSearch] = useState('');

  /* -------- Filter + search (memoised) -------- *
   *
   * Search matches booking number (case-insensitive), origin, and
   * destination — mirrors QuotationsScreen's matching rule. When
   * the endpoint takes over, drop this and let the server do the
   * matching for us.
   */
  const visibleItems = useMemo<CustomerBookingListItem[]>(() => {
    const byFilter =
      filter === 'all'
        ? MOCK_CUSTOMER_BOOKINGS
        : MOCK_CUSTOMER_BOOKINGS.filter(b => b.status === filter);
    const q = search.trim().toLowerCase();
    if (!q) return [...byFilter];
    return byFilter.filter(
      b =>
        b.bookingNumber.toLowerCase().includes(q) ||
        b.from.toLowerCase().includes(q) ||
        b.to.toLowerCase().includes(q),
    );
  }, [filter, search]);

  /* -------- Handlers -------- */

  const goToBookingDetail = useCallback(
    (item: CustomerBookingListItem) => {
      navigation.navigate('BookingDetail', { bookingId: item.id });
    },
    [navigation],
  );

  const onModifyBooking = useCallback(
    (item: CustomerBookingListItem) => {
      navigation.navigate('ModificationRequest', { bookingId: item.id });
    },
    [navigation],
  );

  const onTrackVehicle = useCallback((_item: CustomerBookingListItem) => {
    // Live tracking screen is a ghost destination today. Same
    // "coming soon" toast the detail screen fires from its sticky
    // Track Vehicle button — keeps the two entry points behaving
    // identically until the real TripLive route lands.
    // TODO(nav): navigation.navigate('TripLive', { tripId: tripIdFrom(item.id, '01') });
    toast.info('Live tracking coming soon', {
      description: "We're rolling this out shortly.",
    });
  }, []);

  const onBookAgain = useCallback(
    (_item: CustomerBookingListItem) => {
      // Pre-filling the RequestQuotation form with the previous
      // trip's route needs a params expansion on that route; today
      // just launches the empty form.
      navigation.navigate('RequestQuotation');
    },
    [navigation],
  );

  const onFilterOpen = useCallback(() => {
    // TODO(nav): open a filter-refinement bottom sheet (date range,
    // vehicle type, status). Kept as an affordance now so users see
    // the entry point next to search — real UI later.
  }, []);

  /* -------- Render -------- */

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      {/* Header — title + subtitle only. Search/filter moved into
          the inline bar below, matching QuotationsScreen. */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <Text style={styles.headerSubtitle}>
          View and manage your travel bookings
        </Text>
      </View>

      {/* Filter chip strip — solid-fill active, height-capped (see
          NotificationCentreScreen for the flex quirk this guards
          against). */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipStrip}
        contentContainerStyle={styles.chipRow}
      >
        {FILTERS.map(chip => (
          <FilterChip
            key={chip.key}
            label={chip.label}
            active={filter === chip.key}
            onPress={() => setFilter(chip.key)}
          />
        ))}
      </ScrollView>

      {/* Search + filter-sheet trigger — same pattern as
          QuotationsScreen so the two list tabs read consistently. */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Search size={18} color={Colors.textTertiary} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by Booking ID or destination..."
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="search"
          />
        </View>
        <Pressable
          onPress={onFilterOpen}
          style={({ pressed }) => [styles.filterBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
        >
          <SlidersHorizontal
            size={20}
            color={Colors.textPrimary}
            strokeWidth={2}
          />
        </Pressable>
      </View>

      {/* List — `flex: 1` on the ScrollView container so filtered
          short lists stack from the top; without it, RN leaves the
          empty area above the content (see notifications history). */}
      <ScrollView
        style={styles.listBg}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {visibleItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No bookings</Text>
            <Text style={styles.emptySubtitle}>
              {search
                ? 'Try a different Booking ID or destination.'
                : 'Trips you confirm will show up here.'}
            </Text>
          </View>
        ) : (
          visibleItems.map(item => (
            <BookingCard
              key={item.id}
              item={item}
              onPress={() => goToBookingDetail(item)}
              onViewDetails={() => goToBookingDetail(item)}
              onModifyBooking={() => onModifyBooking(item)}
              onTrackVehicle={() => onTrackVehicle(item)}
              onBookAgain={() => onBookAgain(item)}
            />
          ))
        )}
      </ScrollView>
    </SafeScreen>
  );
};

export default BookingsScreen;

/* ================================================================
 * Local FilterChip — solid-fill variant matching the mockup
 * ================================================================ */

const FilterChip: React.FC<{
  label: string;
  active: boolean;
  onPress: () => void;
}> = ({ label, active, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.chip,
      active && styles.chipActive,
      pressed && styles.pressed,
    ]}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
  >
    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
      {label}
    </Text>
  </Pressable>
);

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  /* Header */
  header: {
    gap: 2,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },

  /* Filter chips */
  chipStrip: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chipRow: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  chip: {
    height: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: Colors.primary,
  },
  chipLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  chipLabelActive: {
    color: Colors.textOnPrimary,
    fontWeight: '700',
  },

  /* Search */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
  },
  searchInput: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    padding: 0,
    includeFontPadding: false,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* List */
  listBg: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxxl,
    gap: Spacing.md,
  },

  /* Empty */
  emptyState: {
    marginTop: Spacing.xxxxl,
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  emptySubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.85,
  },
});
