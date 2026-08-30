/**
 * ------------------------------------------------------------------
 * StaffTabScreen — Directory > UC Staff tab body
 * ------------------------------------------------------------------
 */

import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

import { SearchBar } from '@shared/components';
import { Spacing } from '@theme';
import { DirectoryListView } from '@features/uc/_directory';

import { useStaffList } from '../hooks/useStaffList';
import { StaffCard } from '../components/StaffCard';
import { StaffContactSheet } from '../components/StaffContactSheet';
import { DEFAULT_STAFF_FILTERS, type Staff } from '../types';

const StaffTabScreen: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filters] = useState(DEFAULT_STAFF_FILTERS);

  const [selected, setSelected] = useState<Staff | null>(null);
  const contactSheetRef = useRef<BottomSheetModal>(null);

  const state = useStaffList({ search, filters });

  const onRowPress = useCallback((s: Staff) => {
    setSelected(s);
    contactSheetRef.current?.present();
  }, []);

  const onContactDismiss = useCallback(() => {
    setTimeout(() => setSelected(null), 200);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Staff }) => (
      <StaffCard staff={item} onPress={onRowPress} />
    ),
    [onRowPress],
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, phone, email, or branch"
        />
      </View>

      <DirectoryListView
        state={state}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        emptyTitle="No teammates"
        emptyMessage="Try changing your search."
        countLabel="teammates"
      />

      <StaffContactSheet
        ref={contactSheetRef}
        staff={selected}
        onDismiss={onContactDismiss}
      />
    </View>
  );
};

export default StaffTabScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
});
