/**
 * ------------------------------------------------------------------
 * QuotationsScreen (Customer) — TAB ROOT
 * ------------------------------------------------------------------
 * Landing screen for the Customer "Quotations" tab.
 *
 * LAYOUT (top → bottom):
 *   [Quotations                Request a Quotation +]
 *   [All | Pending | Ready | Accepted | Rejected]  ← chip strip
 *   [🔍 Search…                                  ⚙︎]
 *   [ QuotationCard × N ]
 *
 * NAVIGATION INTENTS:
 *   - Header CTA        → RequestQuotation flow
 *   - Card tap          → QuotationDetail (ghost route until built)
 *   - View Quotation    → QuotationDetail
 *   - Filter icon in search → TODO(nav): open a filter sheet
 *
 * DATA:
 *   Reads from the local mock fixture in `../mocks.ts`. When the
 *   /customer/quotations endpoint ships, swap the useState seed
 *   for a TanStack Query hook keyed on `{ filter, search }`. The
 *   in-component filter/search reducers below can be dropped at
 *   that point since the server would return pre-filtered data.
 *
 * WHY chip strip is a local component (not the shared FilterChips):
 *   The shared FilterChips renders an outlined active state; the
 *   mockup calls for a solid-fill active pill. Reused the same
 *   solid-fill local chip pattern that NotificationCentreScreen
 *   uses so the two list screens read consistently.
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
import { Plus, Search, SlidersHorizontal } from 'lucide-react-native';

import { SafeScreen } from '@shared/components';
import { Colors, Radius, Spacing, Typography } from '@theme';
import type { CustomerStackParamList } from '@navigation/types';

import type {
  CustomerQuotationListItem,
  QuotationFilter,
  QuotationStatus,
} from '../types';
import { MOCK_CUSTOMER_QUOTATIONS } from '../mocks';
import { QuotationCard } from '../components/QuotationCard';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;

/* ================================================================
 * Filter chips
 * ================================================================ */

const FILTERS: readonly { key: QuotationFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'ready', label: 'Ready' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
];

/**
 * Bucket a raw server status into a user-facing filter chip. The
 * screen filter compares chip.key against this bucket. Kept as a
 * pure function so it's trivially unit-testable when tests land.
 */
function statusBucket(status: QuotationStatus): QuotationFilter {
  switch (status) {
    case 'under_review':
    case 'sent':
      return 'pending';
    case 'ready':
      return 'ready';
    case 'accepted':
      return 'accepted';
    case 'rejected':
      return 'rejected';
  }
}

/* ================================================================
 * Screen
 * ================================================================ */

const QuotationsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const [filter, setFilter] = useState<QuotationFilter>('all');
  const [search, setSearch] = useState('');

  /* -------- Filter + search (memoised) -------- *
   *
   * Search matches Request ID (case-insensitive), origin, and
   * destination — the three fields the placeholder hints at.
   * When the endpoint takes over, drop this and let the server
   * do the matching for us.
   */
  const visibleItems = useMemo<CustomerQuotationListItem[]>(() => {
    const byFilter =
      filter === 'all'
        ? MOCK_CUSTOMER_QUOTATIONS
        : MOCK_CUSTOMER_QUOTATIONS.filter(
            q => statusBucket(q.status) === filter,
          );
    const q = search.trim().toLowerCase();
    if (!q) return [...byFilter];
    return byFilter.filter(
      i =>
        i.requestNumber.toLowerCase().includes(q) ||
        i.from.toLowerCase().includes(q) ||
        i.to.toLowerCase().includes(q),
    );
  }, [filter, search]);

  /* -------- Handlers -------- */

  const goToRequestQuotation = useCallback(() => {
    navigation.navigate('RequestQuotation');
  }, [navigation]);

  const goToQuotationDetail = useCallback(
    (item: CustomerQuotationListItem) => {
      navigation.navigate('QuotationDetail', { quotationId: item.id });
    },
    [navigation],
  );

  const onFilterOpen = useCallback(() => {
    // TODO(nav): open a filter-refinement bottom sheet (date range,
    // vehicle type, passenger buckets). Kept as an affordance now
    // so users see the entry point next to search — real UI later.
  }, []);

  /* -------- Render -------- */

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      {/* Custom header — the shared ScreenHeader can hold a rightSlot
          but the pill CTA reads more naturally when laid out with
          `space-between` rather than an inline right slot. */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quotations</Text>
        <Pressable
          onPress={goToRequestQuotation}
          style={({ pressed }) => [styles.headerCta, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Request a quotation"
        >
          <Plus size={16} color={Colors.textOnPrimary} strokeWidth={2.5} />
          <Text style={styles.headerCtaText}>Request a Quotation</Text>
        </Pressable>
      </View>

      {/* Filter chip strip — solid-fill active, capped to content
          height (see NotificationCentreScreen for the flex quirk
          this style guards against). */}
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

      {/* Search + filter-sheet trigger */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Search size={18} color={Colors.textTertiary} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by Request ID, destination, or date..."
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
            <Text style={styles.emptyTitle}>No quotations</Text>
            <Text style={styles.emptySubtitle}>
              {search
                ? 'Try a different Request ID or destination.'
                : 'Requests you submit will show up here.'}
            </Text>
          </View>
        ) : (
          visibleItems.map(item => (
            <QuotationCard
              key={item.id}
              item={item}
              onPress={() => goToQuotationDetail(item)}
              onViewQuotation={() => goToQuotationDetail(item)}
            />
          ))
        )}
      </ScrollView>
    </SafeScreen>
  );
};

export default QuotationsScreen;

/* ================================================================
 * Local subcomponents
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '800',
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  headerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  headerCtaText: {
    ...Typography.bodySmall,
    color: Colors.textOnPrimary,
    fontWeight: '700',
  },

  /* Filter chips */
  chipStrip: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chipRow: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
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
