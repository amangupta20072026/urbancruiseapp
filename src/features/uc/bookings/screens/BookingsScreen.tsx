/**
 * ------------------------------------------------------------------
 * BookingsScreen (UC) — TAB ROOT
 * ------------------------------------------------------------------
 * Landing screen for the UC "Bookings" tab. Placeholder until the
 * real bookings list + status filters + assignment CTAs land.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CalendarCheck } from 'lucide-react-native';

import { SafeScreen, ScreenHeader, ComingSoon } from '@shared/components';
import { Spacing } from '@theme';

const BookingsScreen: React.FC = () => {
  return (
    <SafeScreen edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Bookings"
          subtitle="Track confirmed bookings and vendor assignments."
        />
      </View>
      <ComingSoon feature="Bookings" Icon={CalendarCheck} />
    </SafeScreen>
  );
};

export default BookingsScreen;

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
});