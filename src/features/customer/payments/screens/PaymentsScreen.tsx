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
 *   [ PaymentCard × N ]
 *
 * NAVIGATION INTENTS:
 *   - Card tap        → BookingDetail (payments live per booking;
 *                       the detail screen shows the ledger)
 *   - Download button → TODO(fs): fetch the invoice PDF from
 *                       /customer/bookings/:id/payments/invoice and
 *                       hand off to react-native-file-viewer.
 *
 * DATA:
 *   Local mock fixture in `../mocks.ts`. Swap for a TanStack Query
 *   hook when /customer/payments ships.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

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

  const visibleItems = useMemo<CustomerPaymentListItem[]>(
    () =>
      filter === 'all'
        ? [...MOCK_CUSTOMER_PAYMENTS]
        : MOCK_CUSTOMER_PAYMENTS.filter(p => p.status === filter),
    [filter],
  );

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

  /* -------- Render -------- */

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payments</Text>
        <Text style={styles.headerSubtitle}>View your payment history</Text>
      </View>

      {/* Filter chip strip — same solid-fill pattern as bookings /
          notifications; height-capped to avoid the vertical-stretch
          bug we fixed elsewhere. */}
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

      <ScrollView
        style={styles.listBg}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {visibleItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No payments</Text>
            <Text style={styles.emptySubtitle}>
              Payment activity will show up here.
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
