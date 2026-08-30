/**
 * ------------------------------------------------------------------
 * DriversTabScreen — Directory > Drivers tab body
 * ------------------------------------------------------------------
 * Includes the vendor filter chip. Tapping the chip cycles through
 * vendor scopes (all vendors ↔ specific vendor). A production build
 * would open a vendor picker bottom sheet — scaffolded here as a
 * simple "All Vendors / Clear" toggle, and reads a vendorId route
 * param if navigated here from a vendor row's "See drivers" action.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Building2, X } from 'lucide-react-native';

import { SearchBar } from '@shared/components';
import { Colors, Radius, Spacing, Typography } from '@theme';
import { DirectoryListView } from '@features/uc/_directory';

import { useDriverList } from '../hooks/useDriverList';
import { DriverCard } from '../components/DriverCard';
import { DriverContactSheet } from '../components/DriverContactSheet';
import { DEFAULT_DRIVER_FILTERS, type Driver, type DriverFilters } from '../types';

const DriversTabScreen: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<DriverFilters>(DEFAULT_DRIVER_FILTERS);

  const [selected, setSelected] = useState<Driver | null>(null);
  const contactSheetRef = useRef<BottomSheetModal>(null);

  const state = useDriverList({ search, filters });

  const onRowPress = useCallback((d: Driver) => {
    setSelected(d);
    contactSheetRef.current?.present();
  }, []);

  const onContactDismiss = useCallback(() => {
    setTimeout(() => setSelected(null), 200);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Driver }) => (
      <DriverCard driver={item} onPress={onRowPress} />
    ),
    [onRowPress],
  );

  const clearVendorFilter = useCallback(() => {
    setFilters(f => ({ ...f, vendorId: null }));
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, phone, vendor, city, or license"
        />

        {filters.vendorId && (
          <Pressable
            onPress={clearVendorFilter}
            style={styles.filterChip}
            accessibilityRole="button"
            accessibilityLabel="Clear vendor filter"
          >
            <Building2 size={12} color={Colors.primary} />
            <Text style={styles.filterChipText}>
              Vendor: {filters.vendorId}
            </Text>
            <X size={12} color={Colors.primary} />
          </Pressable>
        )}
      </View>

      <DirectoryListView
        state={state}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        emptyTitle="No drivers"
        emptyMessage="Try changing your search or filters."
        countLabel="drivers"
      />

      <DriverContactSheet
        ref={contactSheetRef}
        driver={selected}
        onDismiss={onContactDismiss}
      />
    </View>
  );
};

export default DriversTabScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  filterChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: `${Colors.primary}15`,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  filterChipText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
});
