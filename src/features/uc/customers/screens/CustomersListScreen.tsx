import React, { useCallback, useMemo, useRef, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  SafeScreen,
  SearchBar,
  EmptyState,
  ErrorView,
} from '@shared/components';
import { Colors, Spacing } from '@theme';

import type { UcStackParamList } from '@navigation/types';

import { useCustomerList } from '../hooks/useCustomerList';
import { CustomerCard } from '../components/CustomerCard';
import { CustomerListHeader } from '../components/CustomerListHeader';
import { ListMeta } from '../components/ListMeta';
import { ListFooterLoader } from '../components/ListFooterLoader';
import { CustomerContactSheet } from '../components/CustomerContactSheet';
import { CustomerFilterSheet } from '../components/CustomerFilterSheet';
import { fixtureUcCustomersAll } from '@mocks/fixtures/ucCustomers';
import {
  DEFAULT_CUSTOMER_FILTERS,
  countActiveFilters,
  type Customer,
  type CustomerFilters,
} from '../types';

type CustomersListRouteProp = RouteProp<UcStackParamList, 'CustomersList'>;
type UcNavigationProp = NativeStackNavigationProp<UcStackParamList>;

const CustomersListScreen: React.FC = () => {
  const navigation = useNavigation<UcNavigationProp>();
  const route = useRoute<CustomersListRouteProp>();
  const reopenCustomerId = route.params?.reopenCustomerId;

  const [search, setSearch] = useState('');

  const [filters, setFilters] = useState<CustomerFilters>(
    DEFAULT_CUSTOMER_FILTERS,
  );

  const [selected, setSelected] = useState<Customer | null>(null);
  const contactSheetRef = useRef<BottomSheetModal>(null);
  const filterSheetRef = useRef<BottomSheetModal>(null);

  const {
    data,
    total,
    isLoading,
    isRefreshing,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refresh,
    refetch,
  } = useCustomerList({ search, filters });

  const onRowPress = useCallback((c: Customer) => {
    setSelected(c);
    contactSheetRef.current?.present();
  }, []);

  const onContactDismiss = useCallback(() => {
    // small delay so content doesn't flash empty during close animation
    setTimeout(() => setSelected(null), 200);
  }, []);

  const openFilterSheet = useCallback(() => {
    filterSheetRef.current?.present();
  }, []);

  const onApplyFilters = useCallback((next: CustomerFilters) => {
    setFilters(next);
    // no page to reset anymore — useInfiniteQuery keys off
    // (search, filters) and starts a fresh cursor chain automatically
  }, []);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const badgeCount = useMemo(() => countActiveFilters(filters), [filters]);

  /* -----------------------------------------------------------------
   * Reopen contact sheet on return from CustomerHistoryScreen.
   *
   * When the history screen's back button navigates here with
   * `reopenCustomerId`, we:
   *   1. Look up the customer in the current in-memory list first
   *      (fast path — usually there).
   *   2. Fall back to the raw fixture (backend-agnostic lookup) if
   *      the visible list is filtered/searched such that the target
   *      isn't in `data`. Keeps the reopen resilient to filter state.
   *   3. Present the sheet and clear the param — critical, otherwise
   *      tab-switching away and back would reopen the sheet endlessly.
   *
   * useFocusEffect fires on every focus event (mount, tab return,
   * screen pop return), so this correctly triggers when returning
   * from history WITHOUT re-firing on a plain tab switch (which
   * doesn't carry the param).
   * ----------------------------------------------------------------- */
  useFocusEffect(
    useCallback(() => {
      if (!reopenCustomerId) return;

      const target =
        data.find(c => c.id === reopenCustomerId) ??
        fixtureUcCustomersAll.find(c => c.id === reopenCustomerId) ??
        null;

      if (target) {
        setSelected(target);
        contactSheetRef.current?.present();
      }

      // Clear the param regardless — even if the customer isn't
      // found, we don't want to loop.
      navigation.setParams({ reopenCustomerId: undefined });
    }, [reopenCustomerId, data, navigation]),
  );

  return (
    <SafeScreen edges={['top']}>
      <View style={styles.headerWrap}>
        <CustomerListHeader
          onBack={() => navigation.goBack()}
          onFilter={openFilterSheet}
          filterBadgeCount={badgeCount}
        />
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, phone, email, or company"
        />
        {!isLoading && data.length > 0 && (
          <ListMeta loadedCount={data.length} total={total} />
        )}
      </View>

      {error ? (
        <ErrorView onRetry={refetch} />
      ) : !isLoading && data.length === 0 ? (
        <EmptyState title="No customers" message="Try changing filters." />
      ) : (
        <FlashList
          data={data}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <CustomerCard customer={item} onPress={onRowPress} />
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
          ListFooterComponent={
            <ListFooterLoader
              isFetchingNextPage={isFetchingNextPage}
              hasNextPage={!!hasNextPage}
              hasItems={data.length > 0}
            />
          }
        />
      )}

      <CustomerContactSheet
        ref={contactSheetRef}
        customer={selected}
        onDismiss={onContactDismiss}
      />

      <CustomerFilterSheet
        ref={filterSheetRef}
        initialFilters={filters}
        onApply={onApplyFilters}
      />
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
});

export default CustomersListScreen;
