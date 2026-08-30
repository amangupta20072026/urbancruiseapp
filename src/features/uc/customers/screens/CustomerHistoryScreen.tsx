/**
 * ------------------------------------------------------------------
 * CustomerHistoryScreen
 * ------------------------------------------------------------------
 * Full-screen trip history for one customer.
 *
 * Route:
 *   name:   'CustomerDetail'
 *   params: { customerId: string }
 *
 * Layout (top → bottom):
 *   [nav header]                  back arrow + "Trip History"
 *   [fixed]   CustomerSummaryCard    always visible, never scrolls off
 *   [fixed]   HistoryFilterChips     always visible, never scrolls off
 *   [scroll]  FlashList of HistoryTripCard   pull-to-refresh here
 *
 * Design decision — FIXED header, not sticky-inside-list:
 *   An earlier version made the summary+chip group row 0 of the FlashList
 *   with stickyHeaderIndices=[0]. Two problems:
 *     1. Pull-to-refresh only fires when the scroll view's own contentY
 *        is 0. With a sticky header eating downward drags at the top,
 *        RefreshControl fired inconsistently.
 *     2. The customer's identity is critical context throughout the
 *        interaction; "scrolls into view then pins" is the wrong UX
 *        for something that should NEVER leave the screen.
 *   Keeping the group outside the list solves both cleanly.
 *
 * Back-arrow behaviour:
 *   Instead of a bare `goBack()`, we navigate back to CustomersList
 *   with `reopenCustomerId` in the route params. The list screen picks
 *   that up on focus and reopens the contact sheet — so the user's
 *   mental thread ("I was looking at THIS customer") is preserved.
 *
 * Customer lookup:
 *   Cheap synchronous read from the mock fixture. Swaps to
 *   `useCustomer(customerId)` when backend lands — trivially
 *   swappable, no structural change to this file.
 *
 * States handled:
 *   - unknown customerId → error card, back button still works
 *   - loading first page → screen-level spinner
 *   - loaded, empty      → EmptyState in list area
 *   - loaded, error      → ErrorView with retry
 *   - loaded, populated  → the happy path
 *   - fetching more      → ListFooterLoader
 *   - refreshing         → RefreshControl on the list
 * ------------------------------------------------------------------ */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';

import { SafeScreen, EmptyState, ErrorView } from '@shared/components';
import { Colors, Spacing, Typography } from '@theme';

import type { UcStackParamList } from '@navigation/types';

import { fixtureUcCustomersAll } from '@mocks/fixtures/ucCustomers';

import {
  useCustomerHistory,
  useCustomerHistoryCounts,
} from '../hooks/useCustomerHistory';
import { CustomerSummaryCard } from '../components/CustomerSummaryCard';
import { HistoryFilterChips } from '../components/HistoryFilterChips';
import { HistoryTripCard } from '../components/HistoryTripCard';
import { ListFooterLoader } from '../components/ListFooterLoader';
import type { HistoryStatusFilter } from '../types';

/* ------------------------------------------------------------------ */
/* Screen                                                             */
/* ------------------------------------------------------------------ */

type CustomerDetailRouteProp = RouteProp<UcStackParamList, 'CustomerDetail'>;
type UcNavigationProp = NativeStackNavigationProp<UcStackParamList>;

const CustomerHistoryScreen: React.FC = () => {
  const navigation = useNavigation<UcNavigationProp>();
  const { params } = useRoute<CustomerDetailRouteProp>();
  const customerId = params?.customerId ?? '';

  const [filter, setFilter] = useState<HistoryStatusFilter>('all');

  /* Customer lookup — cheap synchronous read from the mock fixture.
   * Swaps to `useCustomer(customerId)` when backend lands. */
  const customer = useMemo(
    () => fixtureUcCustomersAll.find(c => c.id === customerId) ?? null,
    [customerId],
  );

  const {
    data,
    isLoading,
    isRefreshing,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refresh,
    refetch,
  } = useCustomerHistory({ customerId, status: filter });

  const counts = useCustomerHistoryCounts(customerId);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  /* -----------------------------------------------------------------
   * Back handler — return to CustomersList AND reopen the contact
   * sheet for the same customer. Uses a route param instead of a
   * ref/global state:
   *   - Survives React Navigation serialization (deep-links / restore).
   *   - Cooperates with Android hardware back — that fires
   *     navigation.goBack() which won't carry the param, so hardware
   *     back returns to a bare list. That's fine — screen-level back
   *     preserves context; system-level back doesn't need to.
   * ----------------------------------------------------------------- */
  const handleBack = useCallback(() => {
    if (customer) {
      navigation.navigate('CustomersList', { reopenCustomerId: customer.id });
      return;
    }
    navigation.goBack();
  }, [customer, navigation]);

  /* ------------------------ Render ------------------------ */

  /* Unknown customer — screen shell + error card, no list. */
  if (!customer) {
    return (
      <SafeScreen edges={['top']}>
        <NavBar onBack={handleBack} title="Trip History" />
        <ErrorView onRetry={handleBack} />
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={['top']}>
      <NavBar onBack={handleBack} title="Trip History" />

      {/* Always-visible header — outside the FlashList so:
          (1) pull-to-refresh has a clean scroll surface, and
          (2) the customer's identity + filter stay pinned
              regardless of scroll position. */}
      <View style={styles.stickyWrap}>
        <CustomerSummaryCard customer={customer} />
        <HistoryFilterChips
          value={filter}
          onChange={setFilter}
          counts={counts}
        />
      </View>

      {error ? (
        <ErrorView onRetry={refetch} />
      ) : isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      ) : (
        <FlashList
          data={data}
          keyExtractor={trip => trip.id}
          renderItem={({ item }) => (
            <View style={styles.rowWrap}>
              <HistoryTripCard trip={item} />
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              tintColor={Colors.primary}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.rowWrap}>
              <EmptyState
                title="No trips yet"
                message={
                  filter === 'all'
                    ? 'This customer has no trips on record.'
                    : `No ${filter} trips.`
                }
              />
            </View>
          }
          ListFooterComponent={
            <ListFooterLoader
              isFetchingNextPage={isFetchingNextPage}
              hasNextPage={!!hasNextPage}
              hasItems={data.length > 0}
            />
          }
        />
      )}
    </SafeScreen>
  );
};

export default CustomerHistoryScreen;

/* ------------------------------------------------------------------ */
/* Nav bar — matches CustomerListHeader spacing                        */
/* ------------------------------------------------------------------ */

const NavBar: React.FC<{ onBack: () => void; title: string }> = ({
  onBack,
  title,
}) => (
  <View style={styles.navBar}>
    <Pressable
      onPress={onBack}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <ChevronLeft size={22} color={Colors.textPrimary} strokeWidth={2.2} />
    </Pressable>
    <Text style={styles.navTitle}>{title}</Text>
    <View style={styles.navSpacer} />
  </View>
);

/* ------------------------------------------------------------------ */
/* Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  navTitle: {
    ...Typography.h5,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  navSpacer: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },

  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xxl,
  },

  stickyWrap: {
    backgroundColor: Colors.background,
  },

  listContent: {
    paddingBottom: Spacing.xxl,
  },
  rowWrap: {
    paddingHorizontal: Spacing.md,
  },
});
