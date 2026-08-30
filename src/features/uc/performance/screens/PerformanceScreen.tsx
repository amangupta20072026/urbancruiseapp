/**
 * ------------------------------------------------------------------
 * PerformanceScreen (UC) — STACK SCREEN
 * ------------------------------------------------------------------
 * Pushed from the UC More sheet. Placeholder until performance
 * analytics (fleet utilisation, vendor scorecards, KPIs) ship.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TrendingUp } from 'lucide-react-native';

import { SafeScreen, ScreenHeader, ComingSoon } from '@shared/components';
import { Spacing } from '@theme';

const PerformanceScreen: React.FC = () => {
  const navigation = useNavigation();
  return (
    <SafeScreen edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Performance"
          subtitle="Utilisation, scorecards, and operational KPIs."
          onBack={() => navigation.goBack()}
        />
      </View>
      <ComingSoon feature="Performance" Icon={TrendingUp} />
    </SafeScreen>
  );
};

export default PerformanceScreen;

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
});