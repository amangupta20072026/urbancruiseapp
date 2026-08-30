/**
 * ------------------------------------------------------------------
 * TripsScreen (UC) — TAB ROOT
 * ------------------------------------------------------------------
 * Landing screen for the UC "Trips" tab. Placeholder until live
 * trip monitoring, driver check-ins, and change-vehicle approvals
 * land.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Route } from 'lucide-react-native';

import { SafeScreen, ScreenHeader, ComingSoon } from '@shared/components';
import { Spacing } from '@theme';

const TripsScreen: React.FC = () => {
  return (
    <SafeScreen edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Trips"
          subtitle="Monitor live trips and driver progress."
        />
      </View>
      <ComingSoon feature="Trips" Icon={Route} />
    </SafeScreen>
  );
};

export default TripsScreen;

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
});