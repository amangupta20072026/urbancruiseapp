/**
 * ------------------------------------------------------------------
 * DriversListScreen (UC) — STACK SCREEN
 * ------------------------------------------------------------------
 * Pushed from the UC More sheet. Placeholder until the driver
 * directory (list + verification status + performance) ships.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { UserCheck } from 'lucide-react-native';

import { SafeScreen, ScreenHeader, ComingSoon } from '@shared/components';
import { Spacing } from '@theme';

const DriversListScreen: React.FC = () => {
  const navigation = useNavigation();
  return (
    <SafeScreen edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Drivers"
          subtitle="View driver roster and verification status."
          onBack={() => navigation.goBack()}
        />
      </View>
      <ComingSoon feature="Drivers" Icon={UserCheck} />
    </SafeScreen>
  );
};

export default DriversListScreen;

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
});