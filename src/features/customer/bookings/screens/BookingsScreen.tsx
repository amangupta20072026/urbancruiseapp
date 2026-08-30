/**
 * ------------------------------------------------------------------
 * BookingsScreen (Customer) — TAB ROOT
 * ------------------------------------------------------------------
 * Landing screen for the Customer "Bookings" tab. Currently a
 * ComingSoon placeholder; when the real UI ships (bookings list +
 * status filters + trip/passenger details), replace the ComingSoon
 * body below. No navigator wiring changes required at that point —
 * this file is the swap point.
 *
 * Tab roots render NO back chevron — the ScreenHeader is used only
 * for the title/subtitle here.
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
          subtitle="Track your confirmed trips and passenger details."
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