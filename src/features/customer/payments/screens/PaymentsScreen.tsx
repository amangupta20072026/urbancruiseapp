/**
 * ------------------------------------------------------------------
 * PaymentsScreen (Customer) — TAB ROOT
 * ------------------------------------------------------------------
 * Landing screen for the Customer "Payments" tab.
 *
 * LAYOUT (top → bottom):
 *   [Payments]
 *   [subtitle]
 *   [All | Paid | Pending | Failed]  ← chip strip
 *   [🔍 Search…                                  ⚙︎]
 *   [ PaymentCard × N ]
 *
 * NAVIGATION INTENTS:
 *   - Card tap        → BookingDetail (payments live per booking;
 *                       the detail screen shows the ledger)
 *   - Download button → TODO(fs): fetch the invoice PDF from
 *                       /customer/bookings/:id/payments/invoice and
 *                       hand off to react-native-file-viewer.
 *   - Filter icon in search → TODO(nav): open a filter sheet
 *
 * WHY the search+filter row matches Bookings/QuotationsScreen:
 *   Same rounded search field + square filter trigger pattern used
 *   on the other two list tabs, so all three read as one consistent
 *   list-screen language.
 *
 * DATA:
 *   Local mock fixture in `../mocks.ts`. Swap for a TanStack Query
 *   hook when /customer/payments ships; the filter/search reducer
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
import type { CustomerStackParamList } from '@navigation/types';

import type { CustomerPaymentListItem, PaymentFilter } from '../types';
import { MOCK_CUSTOMER_PAYMENTS } from '../mocks';
import { PaymentCard } from '../components/PaymentCard';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;

/* ================================================================
 * Filter chips
 * ================================================================ */

const FILTERS: readonly { key: PaymentFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed', label: 'Failed' },
];

/* ================================================================
 * Screen
 * ================================================================ */

const PaymentsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [filter, setFilter] = useState<PaymentFilter>('all');
  const [search, setSearch] = useState('');

  /* -------- Filter + search (memoised) -------- *
   *
   * Search matches booking number (case-insensitive), origin, and
   * destination — mirrors Bookings/QuotationsScreen's matching
   * rule. When the endpoint takes over, drop this and let the
   * server do the matching for us.
   */
  const visibleItems = useMemo<CustomerPaymentListItem[]>(() => {
    const byFilter =
      filter === 'all'
        ? MOCK_CUSTOMER_PAYMENTS
        : MOCK_CUSTOMER_PAYMENTS.filter(p => p.status === filter);
    const q = search.trim().toLowerCase();
    if (!q) return [...byFilter];
    return byFilter.filter(
      p =>
        p.bookingNumber.toLowerCase().includes(q) ||
        p.from.toLowerCase().includes(q) ||
        p.to.toLowerCase().includes(q),
    );
  }, [filter, search]);

  /* -------- Handlers -------- */

  const goToBookingDetail = useCallback(
    (item: CustomerPaymentListItem) => {
      navigation.navigate('BookingDetail', { bookingId: item.bookingId });
    },
    [navigation],
  );

  const onDownloadInvoice = useCallback((_item: CustomerPaymentListItem) => {
    // TODO(fs): call the invoice endpoint + hand off to
    // react-native-file-viewer once the PDF flow is wired.
  }, []);

  const onFilterOpen = useCallback(() => {
    // TODO(nav): open a filter-refinement bottom sheet (date range,
    // amount, status). Kept as an affordance now so users see the
    // entry point next to search — real UI later.
  }, []);

  /* -------- Render -------- */

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payments</Text>
        <Text style={styles.headerSubtitle}>View your payment history</Text>
      </View>

      {/* Filter chip row — evenly-spaced, full-width segmented style.
          Unlike the notification centre's scrollable strip (5 longer
          labels), Payments only has 4 short labels, so instead of
          letting them pack to the left we stretch them to share the
          row equally with space between. */}
      <View style={styles.chipRow}>
        {FILTERS.map(chip => (
          <FilterChip
            key={chip.key}
            label={chip.label}
            active={filter === chip.key}
            onPress={() => setFilter(chip.key)}
          />
        ))}
      </View>

      {/* Search + filter-sheet trigger — same pattern as
          Bookings/QuotationsScreen so all three list tabs read
          consistently. */}
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

      <ScrollView
        style={styles.listBg}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {visibleItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No payments</Text>
            <Text style={styles.emptySubtitle}>
              {search
                ? 'Try a different Booking ID or destination.'
                : 'Payment activity will show up here.'}
            </Text>
          </View>
        ) : (
          visibleItems.map(item => (
            <PaymentCard
              key={item.id}
              item={item}
              onPress={() => goToBookingDetail(item)}
              onDownloadInvoice={() => onDownloadInvoice(item)}
            />
          ))
        )}
      </ScrollView>
    </SafeScreen>
  );
};

export default PaymentsScreen;

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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
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

  /* Filter chips — full-width row, chips share the space equally
     (flex: 1 each) with a fixed gap between them, so the row always
     reaches both edges regardless of how many chips there are. */
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  chip: {
    flex: 1,
    height: 36,
    paddingHorizontal: Spacing.sm,
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
