/**
 * ------------------------------------------------------------------
 * TripListSkeleton — first-load placeholder
 * ------------------------------------------------------------------
 * Mirrors UcTripCard's geometry (status + ID row, route, two detail
 * columns, amount row, tracker, full-width button) so the swap to
 * real rows does not shift the layout. Shown only while the very
 * first page is pending; later chip/search changes keep the previous
 * rows on screen.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@shared/components';
import { Colors, Radius, Spacing } from '@theme';

const ROWS = 3;

export const TripListSkeleton: React.FC = () => (
  <View
    style={styles.wrap}
    accessibilityRole="progressbar"
    accessibilityLabel="Loading trips"
  >
    {Array.from({ length: ROWS }, (_, i) => (
      <View key={i} style={styles.card}>
        <View style={styles.row}>
          <Skeleton width={104} height={32} radius={Radius.pill} />
          <Skeleton width={130} height={16} />
        </View>
        <Skeleton width="60%" height={24} />
        <View style={styles.body}>
          <View style={styles.col}>
            <Skeleton width="80%" height={14} />
            <Skeleton width="60%" height={14} />
            <Skeleton width="75%" height={14} />
          </View>
          <View style={styles.col}>
            <Skeleton width="80%" height={14} />
            <Skeleton width="70%" height={14} />
          </View>
        </View>
        <View style={styles.row}>
          <Skeleton width={96} height={16} />
          <Skeleton width={110} height={24} />
        </View>
        <Skeleton width="100%" height={44} />
        <Skeleton width="100%" height={48} radius={Radius.md} />
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
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  body: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  col: {
    flex: 1,
    gap: Spacing.sm,
  },
});
