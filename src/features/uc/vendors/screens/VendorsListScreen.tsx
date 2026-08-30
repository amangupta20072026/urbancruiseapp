/**
 * ------------------------------------------------------------------
 * VendorsListScreen (UC) — STACK SCREEN
 * ------------------------------------------------------------------
 * Pushed from the UC More sheet. Placeholder until the vendor
 * directory (list + search + approval status) ships.
 * Naming mirrors CustomersListScreen for consistency.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Building2 } from 'lucide-react-native';

import { SafeScreen, ScreenHeader, ComingSoon } from '@shared/components';
import { Spacing } from '@theme';

const VendorsListScreen: React.FC = () => {
  const navigation = useNavigation();
  return (
    <SafeScreen edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Vendors"
          subtitle="Manage and view onboarded vendors."
          onBack={() => navigation.goBack()}
        />
      </View>
      <ComingSoon feature="Vendors" Icon={Building2} />
    </SafeScreen>
  );
};

export default VendorsListScreen;

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
});