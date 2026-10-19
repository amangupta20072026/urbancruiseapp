/**
 * ------------------------------------------------------------------
 * VendorsTabScreen — Directory > Vendors tab body
 * ------------------------------------------------------------------
 * Rendered inside DirectoryScreen's top-tab navigator. Owns:
 *   - search state
 *   - filter state
 *   - contact-sheet target
 * ...and delegates layout to <DirectoryListView />.
 *
 * Structural twin of CustomersTabScreen — kept parallel so a fifth
 * tab can be added by copy-paste + type substitution.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

import { SearchBar } from '@shared/components';
import { Spacing } from '@theme';
import {
  DirectoryListView,
  DirectoryCard,
  DirectoryContactSheet,
  type DirectoryContact,
} from '@features/uc/_directory';

import { useVendorList } from '../hooks/useVendorList';
import { DEFAULT_VENDOR_FILTERS, type Vendor } from '../types';

const VendorsTabScreen: React.FC = () => {
  const [search, setSearch] = useState('');
  // Filter sheet is scaffolded for later — default filters used today.
  const [filters] = useState(DEFAULT_VENDOR_FILTERS);

  const [selected, setSelected] = useState<DirectoryContact | null>(null);
  const contactSheetRef = useRef<BottomSheetModal>(null);

  const state = useVendorList({ search, filters });

  const onRowPress = useCallback((c: DirectoryContact) => {
    setSelected(c);
    contactSheetRef.current?.present();
  }, []);

  const onContactDismiss = useCallback(() => {
    // Delay so sheet content doesn't flash empty during close animation.
    setTimeout(() => setSelected(null), 200);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Vendor }) => (
      <DirectoryCard
        contact={{ kind: 'vendor', data: item }}
        onPress={onRowPress}
      />
    ),
    [onRowPress],
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by company, owner, phone, or city"
        />
      </View>

      <DirectoryListView
        state={state}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        emptyTitle="No vendors"
        emptyMessage="Try changing your search."
        countLabel="vendors"
      />

      <DirectoryContactSheet
        ref={contactSheetRef}
        contact={selected}
        onDismiss={onContactDismiss}
      />
    </View>
  );
};

export default VendorsTabScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
});
