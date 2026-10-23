import React, { useCallback, useMemo, useRef, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  SafeScreen,
  SearchBar,
  EmptyState,
  ErrorView,
} from '@shared/components';
import { Colors, Spacing } from '@theme';
import {
  DirectoryCard,
  DirectoryContactSheet,
  type DirectoryContact,
} from '@features/uc/_directory';

import type { UcStackParamList } from '@navigation/types';

import { useCustomerList } from '../hooks/useCustomerList';
import { CustomerListHeader } from '../components/CustomerListHeader';
import { ListMeta } from '../components/ListMeta';
import { ListFooterLoader } from '../components/ListFooterLoader';
import { CustomerFilterSheet } from '../components/CustomerFilterSheet';
import {
  DEFAULT_CUSTOMER_FILTERS,
  countActiveFilters,
  type Customer,
  type CustomerFilters,
} from '../types';

type UcNavigationProp = NativeStackNavigationProp<UcStackParamList>;

const CustomersListScreen: React.FC = () => {
  const navigation = useNavigation<UcNavigationProp>();

  const [search, setSearch] = useState('');

  const [filters, setFilters] = useState<CustomerFilters>(
    DEFAULT_CUSTOMER_FILTERS,
  );

  const [selected, setSelected] = useState<DirectoryContact | null>(null);
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

  const onRowPress = useCallback((c: DirectoryContact) => {
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
          renderItem={({ item }: { item: Customer }) => (
            <DirectoryCard
              contact={{ kind: 'customer', data: item }}
              onPress={onRowPress}
            />
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

      <DirectoryContactSheet
        ref={contactSheetRef}
        contact={selected}
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
