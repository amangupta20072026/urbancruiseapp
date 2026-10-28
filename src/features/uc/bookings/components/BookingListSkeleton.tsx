/**
 * ------------------------------------------------------------------
 * BookingListSkeleton — first-load placeholder
 * ------------------------------------------------------------------
 * Mirrors UcBookingCard's geometry (status + ref row, right-aligned
 * trip type pill, two body columns, footer, tracker) so the swap to
 * real rows does not shift the layout. Shown only while the very first page is pending; later
 * chip/search changes keep the previous rows on screen.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@shared/components';
import { Colors, Radius, Spacing } from '@theme';

const ROWS = 3;

export const BookingListSkeleton: React.FC = () => (
  <View
    style={styles.wrap}
    accessibilityRole="progressbar"
    accessibilityLabel="Loading bookings"
  >
    {Array.from({ length: ROWS }, (_, i) => (
      <View key={i} style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Skeleton width={110} height={32} radius={Radius.pill} />
            <Skeleton width={130} height={16} />
          </View>
          <View style={styles.typePill}>
            <Skeleton width={120} height={30} radius={Radius.pill} />
          </View>
        </View>
        <View style={styles.body}>
          <View style={styles.col}>
            <Skeleton width="80%" height={20} />
            <Skeleton width="90%" height={14} />
            <Skeleton width="60%" height={14} />
          </View>
          <View style={styles.colWide}>
            <Skeleton width="85%" height={20} />
            <Skeleton width="95%" height={14} />
            <Skeleton width="60%" height={14} />
            <Skeleton width="80%" height={14} />
          </View>
        </View>
        <View style={styles.footer}>
          <Skeleton width={110} height={24} />
          <Skeleton width={128} height={44} radius={Radius.md} />
        </View>
        <Skeleton width="100%" height={44} />
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.lg,
  },
  header: {
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typePill: {
    alignSelf: 'flex-end',
  },
  body: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  col: {
    flex: 1,
    gap: Spacing.sm,
  },
  colWide: {
    flex: 1.4,
    gap: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
