/**
 * ------------------------------------------------------------------
 * BookingsScreen (Customer) — TAB ROOT
 * ------------------------------------------------------------------
 * Landing screen for the Customer "Bookings" tab.
 *
 * LAYOUT (top → bottom):
 *   [My Bookings                             🔍  ⚙︎]
 *   [subtitle]
 *   [All | Upcoming | Ongoing | Completed | Cancelled]  ← chip strip
 *   [ BookingCard × N ]
 *
 * NAVIGATION INTENTS:
 *   - Card tap / View Details → BookingDetail (ghost route until built)
 *   - Modify Booking          → ModificationRequest (ghost)
 *   - Track Vehicle           → TripLive (ghost; ongoing bookings only)
 *   - Book Again              → RequestQuotation (pre-fills route later)
 *   - Search / filter icons   → TODO(nav)
 *
 * DATA:
 *   Local mock fixture in `../mocks.ts`. Swap for a TanStack Query
 *   hook when /customer/bookings ships; the filter/search reducer
 *   below can be dropped since the server would return pre-filtered
 *   data.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, SlidersHorizontal } from 'lucide-react-native';

import { SafeScreen } from '@shared/components';
import { Colors, Radius, Spacing, Typography } from '@theme';
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

  const visibleItems = useMemo<CustomerBookingListItem[]>(
    () =>
      filter === 'all'
        ? [...MOCK_CUSTOMER_BOOKINGS]
        : MOCK_CUSTOMER_BOOKINGS.filter(b => b.status === filter),
    [filter],
  );

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
    // TripId is derived from booking id in the tripIdFrom() helper
    // when the real navigation lands. For now, the destination is
    // a ghost — safe to leave as a no-op.
    // TODO(nav): navigation.navigate('TripLive', { tripId: tripIdFrom(item.id, '01') });
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

  const onSearchOpen = useCallback(() => {
    // TODO(nav): open a full-screen search overlay
  }, []);
  const onFilterOpen = useCallback(() => {
    // TODO(nav): open a filter-refinement bottom sheet
  }, []);

  /* -------- Render -------- */

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      {/* Custom header — title + subtitle on the left, two icon
          buttons on the right. Not using ScreenHeader since its
          rightSlot only comfortably holds a single element. */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <Text style={styles.headerSubtitle}>
            View and manage your travel bookings
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={onSearchOpen}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Search bookings"
          >
            <Search size={20} color={Colors.textPrimary} strokeWidth={2} />
          </Pressable>
          <Pressable
            onPress={onFilterOpen}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
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

      {/* List */}
      <ScrollView
        style={styles.listBg}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {visibleItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No bookings</Text>
            <Text style={styles.emptySubtitle}>
              Trips you confirm will show up here.
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
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
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
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
