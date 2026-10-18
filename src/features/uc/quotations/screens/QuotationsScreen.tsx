/**
 * ------------------------------------------------------------------
 * QuotationsScreen (UC) — TAB ROOT
 * ------------------------------------------------------------------
 * Landing screen for the UC "Quotations" tab.
 *
 * LAYOUT (top → bottom):
 *   [ Quotations                              [ + New Quotation ] ]
 *   [ Draft, revise, and share customer quotations.              ]
 *   [ All | Draft | Sent | Accepted | Rejected ]   ← status chips
 *   [ 🔍 Search by customer name, number or quote ID ] [ Filter ]
 *   [ UcQuotationCard × N ]                          ← FlashList
 *
 * DATA:
 *   `useUcQuotationList` (TanStack infinite query, cursor-paged).
 *   Status chip, debounced search and sheet filters are all part of
 *   the query key, so each combination is cached independently and
 *   switching back is instant. Fixture-backed until
 *   GET /uc/quotations ships — see the hook header.
 *
 * NAVIGATION INTENTS:
 *   - "+ New Quotation"        → quotation builder (not built yet)
 *   - Card tap / "Open"        → quotation detail (not built yet)
 *   Both show the standard "Coming soon" toast via
 *   `@services/comingSoon` until their screens ship.
 *
 * Tab root: no back chevron.
 * ------------------------------------------------------------------
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Plus, Search, SlidersHorizontal, X } from 'lucide-react-native';

import { EmptyState, ErrorView, SafeScreen } from '@shared/components';
import { Colors, Radius, Spacing, Typography } from '@theme';
import { notifyComingSoon } from '@services/comingSoon';

import { useUcQuotationList } from '../hooks/useUcQuotationList';
import { UcQuotationCard } from '../components/UcQuotationCard';
import { QuotationActionsSheet } from '../components/QuotationActionsSheet';
import { QuotationFilterSheet } from '../components/QuotationFilterSheet';
import { QuotationListSkeleton } from '../components/QuotationListSkeleton';
import {
  DEFAULT_UC_QUOTATION_FILTERS,
  UC_QUOTATION_STATUS_FILTERS,
  countActiveQuotationFilters,
  type UcQuotationFilters,
  type UcQuotationListItem,
  type UcQuotationStatusFilter,
} from '../types';

/** Wait this long after the last keystroke before querying. */
const SEARCH_DEBOUNCE_MS = 300;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/* ================================================================
 * Screen
 * ================================================================ */

const QuotationsScreen: React.FC = () => {
  const [status, setStatus] = useState<UcQuotationStatusFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS);
  const [filters, setFilters] = useState<UcQuotationFilters>(
    DEFAULT_UC_QUOTATION_FILTERS,
  );

  const [selected, setSelected] = useState<UcQuotationListItem | null>(null);
  const actionsSheetRef = useRef<BottomSheetModal>(null);
  const filterSheetRef = useRef<BottomSheetModal>(null);

  const {
    data,
    counts,
    isLoading,
    isRefreshing,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
  } = useUcQuotationList({ status, search, filters });

  const activeFilterCount = useMemo(
    () => countActiveQuotationFilters(filters),
    [filters],
  );
  const isRefined =
    status !== 'all' || search.length > 0 || activeFilterCount > 0;

  /* -------- Navigation -------- */

  // Neither destination is built yet; both show the standard
  // "Coming soon" toast. When they ship, add the routes to
  // UcStackParamList and navigate here instead.
  const goToNewQuotation = useCallback(() => {
    notifyComingSoon('uc.createQuotation');
  }, []);

  const openQuotation = useCallback((_q: UcQuotationListItem) => {
    notifyComingSoon('uc.quotationDetail');
  }, []);

  /* -------- Sheets -------- */

  const openActions = useCallback((q: UcQuotationListItem) => {
    setSelected(q);
    actionsSheetRef.current?.present();
  }, []);

  const onActionsDismiss = useCallback(() => {
    // Keep content during the close animation, then clear.
    setTimeout(() => setSelected(null), 200);
  }, []);

  const openFilters = useCallback(() => {
    filterSheetRef.current?.present();
  }, []);

  const clearAll = useCallback(() => {
    setStatus('all');
    setSearchInput('');
    setFilters(DEFAULT_UC_QUOTATION_FILTERS);
  }, []);

  /* -------- List -------- */

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: UcQuotationListItem }) => (
      <UcQuotationCard
        item={item}
        onPress={openQuotation}
        onMore={openActions}
      />
    ),
    [openQuotation, openActions],
  );

  const renderBody = () => {
    if (error && data.length === 0) {
      return (
        <ErrorView
          title="Couldn't load quotations"
          message="Please check your connection and try again."
          onRetry={refetch}
        />
      );
    }
    if (isLoading) return <QuotationListSkeleton />;
    if (data.length === 0) {
      return isRefined ? (
        <EmptyState
          title="No matching quotations"
          message="Try a different search, status or filter."
          ctaLabel="Clear all"
          onCtaPress={clearAll}
        />
      ) : (
        <EmptyState
          title="No quotations yet"
          message="Create your first quotation for a customer enquiry."
          ctaLabel="New Quotation"
          onCtaPress={goToNewQuotation}
        />
      );
    }
    return (
      <FlashList
        data={data}
        keyExtractor={item => item.id}
        renderItem={renderItem}
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
            Quotations
          </Text>
          <Text style={styles.headerSubtitle}>
            Draft, revise, and share customer quotations.
          </Text>
        </View>
        <Pressable
          onPress={goToNewQuotation}
          style={({ pressed }) => [styles.headerCta, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="New quotation"
        >
          <Plus size={18} color={Colors.textOnPrimary} strokeWidth={2.5} />
          <Text style={styles.headerCtaText}>New Quotation</Text>
        </Pressable>
      </View>

      {/* Status chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipStrip}
        contentContainerStyle={styles.chipRow}
      >
        {UC_QUOTATION_STATUS_FILTERS.map(chip => {
          const active = status === chip.key;
          return (
            <Pressable
              key={chip.key}
              onPress={() => setStatus(chip.key)}
              style={({ pressed }) => [
                styles.chip,
                active && styles.chipActive,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${chip.label}, ${
                counts[chip.key]
              } quotations`}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Search + filter */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Search size={20} color={Colors.textTertiary} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search by customer name, number or quote ID"
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel="Search quotations"
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

        <Pressable
          onPress={openFilters}
          style={({ pressed }) => [
            styles.filterBtn,
            activeFilterCount > 0 && styles.filterBtnActive,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            activeFilterCount > 0
              ? `Filter, ${activeFilterCount} active`
              : 'Filter'
          }
        >
          <SlidersHorizontal
            size={18}
            color={
              activeFilterCount > 0 ? Colors.primaryDark : Colors.textPrimary
            }
            strokeWidth={2}
          />
          <Text
            style={[
              styles.filterText,
              activeFilterCount > 0 && styles.filterTextActive,
            ]}
          >
            Filter
          </Text>
          {activeFilterCount > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={styles.body}>{renderBody()}</View>

      <QuotationActionsSheet
        ref={actionsSheetRef}
        quotation={selected}
        onOpenQuotation={openQuotation}
        onDismiss={onActionsDismiss}
      />
      <QuotationFilterSheet
        ref={filterSheetRef}
        initialFilters={filters}
        onApply={setFilters}
      />
    </SafeScreen>
  );
};

export default QuotationsScreen;

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
        <Text style={styles.footerText}>Loading more quotations…</Text>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  headerText: {
    flex: 1,
    gap: Spacing.xs,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  headerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Colors.buttonPrimary,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  headerCtaText: {
    ...Typography.body,
    color: Colors.buttonPrimaryText,
    fontWeight: '700',
  },

  /* Chips */
  chipStrip: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chipRow: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  chip: {
    height: 40,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: Colors.primary,
  },
  chipText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: Colors.textOnPrimary,
    fontWeight: '700',
  },

  /* Search + filter */
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
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: CONTROL_HEIGHT,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  filterBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryTint,
  },
  filterText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: Colors.primaryDark,
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    ...Typography.caption,
    color: Colors.textOnPrimary,
    fontWeight: '700',
  },

  /* Body */
  body: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxl,
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

  pressed: { opacity: 0.85 },
});
