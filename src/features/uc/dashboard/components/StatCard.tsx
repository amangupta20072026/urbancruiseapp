/**
 * ------------------------------------------------------------------
 * StatCard — one tile of the 2×2 stats grid
 * ------------------------------------------------------------------
 *   (icon)  Total Trips                 >
 *           128
 *   ↗ 12.5%  |  vs yesterday
 *
 * The whole card is one button that opens the stat's list. The
 * delta is green with ↗ when up, red with ↘ when down.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ChevronRight,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';

import type { StatMetric } from '../types';

type Props = {
  metric: StatMetric;
  Icon: LucideIcon;
  /** Icon colour on its tinted circle. */
  tint: { fg: string; bg: string };
  onPress: () => void;
  /** Read by screen readers, e.g. 'Opens Trips'. */
  accessibilityHint: string;
};

export const StatCard: React.FC<Props> = ({
  metric,
  Icon,
  tint,
  onPress,
  accessibilityHint,
}) => {
  const up = metric.trend === 'up';
  const TrendIcon = up ? TrendingUp : TrendingDown;
  const trendColor = up ? Colors.success : Colors.error;
  const delta = `${Math.abs(metric.deltaPct)}%`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${metric.label}: ${metric.value}, ${
        up ? 'up' : 'down'
      } ${delta} ${metric.compareLabel}`}
      accessibilityHint={accessibilityHint}
    >
      <View style={styles.top}>
        <View style={[styles.iconCircle, { backgroundColor: tint.bg }]}>
          <Icon size={22} color={tint.fg} strokeWidth={2} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.label} numberOfLines={2}>
            {metric.label}
          </Text>
          <Text
            style={styles.value}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {metric.value}
          </Text>
        </View>
        <ChevronRight size={18} color={Colors.textTertiary} strokeWidth={2.2} />
      </View>

      <View style={styles.trendRow}>
        <TrendIcon size={16} color={trendColor} strokeWidth={2.4} />
        <Text style={[styles.delta, { color: trendColor }]}>{delta}</Text>
        <View style={styles.trendDivider} />
        <Text style={styles.compare} numberOfLines={1}>
          {metric.compareLabel}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },
  pressed: { opacity: 0.85 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, minWidth: 0 },
  label: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  value: {
    ...Typography.h5,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  delta: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  trendDivider: {
    width: 1,
    height: 14,
    backgroundColor: Colors.border,
  },
  compare: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
});
