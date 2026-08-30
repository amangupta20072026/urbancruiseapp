/**
 * ------------------------------------------------------------------
 * CustomersTabScreen — Directory > Customers tab body
 * ------------------------------------------------------------------
 * Thin tab wrapper around the existing customer domain — reuses the
 * production useCustomerList hook, CustomerCard, and
 * CustomerContactSheet unchanged. Only the layout (no back button, no
 * stack header) is different from the standalone CustomersListScreen.
 *
 * Filter sheet is intentionally NOT wired here yet — the tab uses
 * default filters. When the manager wants the tab to have the full
 * filter sheet, hoist openFilterSheet + CustomerFilterSheet from the
 * standalone screen; the hook already supports the state shape.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

import { SearchBar } from '@shared/components';
import { Spacing } from '@theme';
import { DirectoryListView } from '@features/uc/_directory';

import { useCustomerList } from '../hooks/useCustomerList';
import { CustomerCard } from '../components/CustomerCard';
import { CustomerContactSheet } from '../components/CustomerContactSheet';
import {
  DEFAULT_CUSTOMER_FILTERS,
  type Customer,
  type CustomerFilters,
} from '../types';

const CustomersTabScreen: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filters] = useState<CustomerFilters>(DEFAULT_CUSTOMER_FILTERS);

  const [selected, setSelected] = useState<Customer | null>(null);
  const contactSheetRef = useRef<BottomSheetModal>(null);

  const state = useCustomerList({ search, filters });

  const onRowPress = useCallback((c: Customer) => {
    setSelected(c);
    contactSheetRef.current?.present();
  }, []);

  const onContactDismiss = useCallback(() => {
    setTimeout(() => setSelected(null), 200);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Customer }) => (
      <CustomerCard customer={item} onPress={onRowPress} />
    ),
    [onRowPress],
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, phone, email, or company"
        />
      </View>

      <DirectoryListView
        state={state}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        emptyTitle="No customers"
        emptyMessage="Try changing your search."
        countLabel="customers"
      />

      <CustomerContactSheet
        ref={contactSheetRef}
        customer={selected}
        onDismiss={onContactDismiss}
      />
    </View>
  );
};

export default CustomersTabScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
});
