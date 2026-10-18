/**
 * ------------------------------------------------------------------
 * QuotationListSkeleton — first-load placeholder
 * ------------------------------------------------------------------
 * Mirrors UcQuotationCard's geometry so the swap to real rows does
 * not shift the layout. Shown only while the very first page is
 * pending; later refetches keep the previous data on screen.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@shared/components';
import { Colors, Radius, Spacing } from '@theme';

const ROWS = 4;

export const QuotationListSkeleton: React.FC = () => (
  <View
    style={styles.wrap}
    accessibilityRole="progressbar"
    accessibilityLabel="Loading quotations"
  >
    {Array.from({ length: ROWS }, (_, i) => (
      <View key={i} style={styles.card}>
        <View style={styles.top}>
          <Skeleton width={48} height={48} radius={24} />
          <View style={styles.lines}>
            <Skeleton width="60%" height={16} />
            <Skeleton width="80%" height={12} />
            <Skeleton width="50%" height={12} />
          </View>
          <View style={styles.trailing}>
            <Skeleton width={84} height={26} radius={Radius.pill} />
            <Skeleton width={70} height={18} />
          </View>
        </View>
        <View style={styles.bottom}>
          <Skeleton width="28%" height={30} />
          <Skeleton width="28%" height={30} />
          <Skeleton width="32%" height={30} />
        </View>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.lg,
  },
  top: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  lines: {
    flex: 1,
    gap: Spacing.sm,
  },
  trailing: {
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
