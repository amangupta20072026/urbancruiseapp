/**
 * ------------------------------------------------------------------
 * QuotationsScreen (Customer) — TAB ROOT
 * ------------------------------------------------------------------
 * Landing screen for the Customer "Quotations" tab.
 *
 * LAYOUT (top → bottom):
 *   [Quotations                        [ + Request a Quotation ] ]
 *   [ View and manage your travel quotations                     ]
 *   [ All 6 | Pending 2 | Accepted 3 | Expired 1 ]  ← chip strip
 *   [ 🔍 Search…                                    ⚙︎ ]  ← search
 *   [ QuotationCard × N ]
 *
 * NAVIGATION INTENTS:
 *   - Header CTA (+ Request a Quotation) → RequestQuotation flow
 *   - Card tap / View button             → QuotationDetail
 *   - Sliders button                     → TODO(nav): filter sheet
 *
 * WHAT CHANGED FROM THE PRIOR REQUEST-CENTRIC SCREEN:
 *   - Chip strip switched from 5 states (all/pending/ready/accepted
 *     /rejected) to 4 (all/pending/accepted/expired) and every
 *     chip now shows a live COUNT badge derived from the data.
 *   - Search + filter-sheet row sits BELOW the chip strip, matching
 *     the pattern users returning from the older build expect.
 *     Search matches Quotation ID and any stop city; the sliders
 *     button is a placeholder for a future filter sheet.
 *   - The header keeps its original "+ Request a Quotation" CTA
 *     (green pill) as the primary action — the tab title reads as
 *     a section header, the subtitle explains it, and the CTA
 *     lets a customer create a new quotation without leaving the
 *     tab. A brief interim design placed a lone Filter icon there;
 *     that was reverted because "manage existing" + "create new"
 *     both belong at the top of the tab.
 *
 * DATA:
 *   Reads from the local mock fixture in `../mocks.ts`. Chip counts
 *   and the filtered visible list are BOTH derived from the same
 *   source so they can never diverge. When the /customer/quotations
 *   endpoint ships, swap the fixture import for a TanStack Query
 *   hook keyed on `filter`; keep the count computation client-side
 *   OR (preferably) accept counts alongside the list from the API.
 *
 * WHY chip strip is a local component (not the shared FilterChips):
 *   The shared FilterChips renders an outlined active state with no
 *   count slot; this mockup calls for a solid-fill active pill with
 *   an inline count badge on every chip. Reused the same solid-fill
 *   local chip pattern that NotificationCentreScreen uses so the
 *   two list screens read consistently.
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
 * Filter chips — static config
 * ================================================================ */

const FILTERS: readonly { key: QuotationFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'expired', label: 'Expired' },
];

/**
 * Bucket a raw server status into a chip. `all` is not returned by
 * this function — it's a virtual filter that matches everything.
 * Kept as a pure function so it's trivially unit-testable when
 * tests land.
 */
function statusBucket(status: QuotationStatus): QuotationFilter {
  return status;
}

/* ================================================================
 * Screen
 * ================================================================ */

const QuotationsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const [filter, setFilter] = useState<QuotationFilter>('all');
  const [search, setSearch] = useState('');

  /* -------- Counts (memoised) --------
   *
   * Computed once per data change (mocks are static, so effectively
   * once on mount). The `all` count is the array length; every other
   * chip counts hits of its bucketed status. Kept as a plain object
   * rather than a `Map` so TS enforces exhaustive keys against the
   * `QuotationFilter` union — a new filter can't be added without
   * updating this table. */
  const counts = useMemo<Record<QuotationFilter, number>>(() => {
    const acc: Record<QuotationFilter, number> = {
      all: MOCK_CUSTOMER_QUOTATIONS.length,
      pending: 0,
      accepted: 0,
      expired: 0,
    };
    for (const q of MOCK_CUSTOMER_QUOTATIONS) {
      acc[statusBucket(q.status)] += 1;
    }
    return acc;
  }, []);

  /* -------- Filter + search (memoised) --------
   *
   * Two-stage filter: chip first (cheap, likely to reduce the set
   * to a handful), then the case-insensitive search over Quotation
   * ID and stop cities. Empty search short-circuits the second
   * stage so typing has zero perceived latency. When the endpoint
   * takes over, drop this and let the server do the matching. */
  const visibleItems = useMemo<CustomerQuotationListItem[]>(() => {
    const byFilter =
      filter === 'all'
        ? MOCK_CUSTOMER_QUOTATIONS
        : MOCK_CUSTOMER_QUOTATIONS.filter(
            q => statusBucket(q.status) === filter,
          );
    const needle = search.trim().toLowerCase();
    if (!needle) return [...byFilter];
    return byFilter.filter(
      q =>
        q.quotationNumber.toLowerCase().includes(needle) ||
        q.stops.some(stop => stop.toLowerCase().includes(needle)),
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

  const onFilterSheetOpen = useCallback(() => {
    // TODO(nav): open a filter-refinement bottom sheet (date range,
    // amount range, passenger buckets). Kept as an affordance next
    // to search so users see the entry point — real UI later.
  }, []);

  /* -------- Render -------- */

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      {/* Header — title + subtitle on the left, "+ Request a
          Quotation" CTA on the trailing edge. The title column
          uses `flex: 1` inside a row so the CTA is pinned right
          regardless of title/subtitle length; the CTA never
          shrinks (its label is copy-critical). */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Quotations</Text>
          <Text style={styles.headerSubtitle}>
            View and manage your travel quotations
          </Text>
        </View>
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

      {/* Filter chip strip — solid-fill active, count badge on
          every chip. Horizontal scroll so future filters can be
          added without a layout rethink; today's four fit on a
          typical phone screen. */}
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
            count={counts[chip.key]}
            active={filter === chip.key}
            onPress={() => setFilter(chip.key)}
            badgeColor={chip.key === 'expired' ? Colors.error : undefined}
          />
        ))}
      </ScrollView>

      {/* Search + filter-sheet trigger — mirrors the pattern from
          the prior screen so users returning from the older build
          find refinement in the same spot. Search matches Quotation
          ID and any stop city; the sliders button is a placeholder
          entry for a future filter sheet. */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Search size={18} color={Colors.textTertiary} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by Quotation ID or destination..."
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        <Pressable
          onPress={onFilterSheetOpen}
          style={({ pressed }) => [styles.filterBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
          hitSlop={6}
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
          empty area above the content. */}
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
                ? 'Try a different Quotation ID or destination.'
                : 'Try another filter — your quotations will show up here.'}
            </Text>
          </View>
        ) : (
          visibleItems.map(item => (
            <QuotationCard
              key={item.id}
              item={item}
              onPress={() => goToQuotationDetail(item)}
              onView={() => goToQuotationDetail(item)}
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
  count: number;
  active: boolean;
  onPress: () => void;
  /** Overrides the badge fill for chips that need a fixed semantic
   * color (e.g. "Expired" is always red) regardless of active state. */
  badgeColor?: string;
}> = ({ label, count, active, onPress, badgeColor }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.chip,
      active && styles.chipActive,
      pressed && styles.pressed,
    ]}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    accessibilityLabel={`${label}, ${count}`}
  >
    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
      {label}
    </Text>
    <View
      style={[
        styles.countBadge,
        active && styles.countBadgeActive,
        badgeColor ? { backgroundColor: badgeColor } : null,
      ]}
    >
      <Text style={[styles.countText, active && styles.countTextActive]}>
        {count}
      </Text>
    </View>
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
  headerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    /* Stay pinned to the trailing edge without stretching vertically
       even though the header row is `alignItems: flex-start`. */
    alignSelf: 'flex-start',
  },
  headerCtaText: {
    ...Typography.bodySmall,
    color: Colors.textOnPrimary,
    fontWeight: '700',
  },

  /* Search + filter row (below chips) */
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
    backgroundColor: Colors.surfaceVariant,
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
    backgroundColor: Colors.surfaceVariant,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primaryTint,
    borderColor: Colors.primaryTint,
  },
  chipLabel: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  chipLabelActive: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeActive: {
    backgroundColor: Colors.primaryDark,
  },
  countText: {
    ...Typography.caption,
    color: Colors.textOnPrimary,
    fontWeight: '700',
    includeFontPadding: false,
    lineHeight: 14,
  },
  countTextActive: {
    color: Colors.textOnPrimary,
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
