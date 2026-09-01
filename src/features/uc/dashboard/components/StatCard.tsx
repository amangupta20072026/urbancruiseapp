import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import type { StatMetric } from '../types';

/**
 * StatCard — compact vertical layout for a 4-column row on phones.
 *
 * Layout (matches reference mock):
 *   [icon bubble]
 *   Label (single line, small caps-like)
 *   Big value
 *   ↑ 12.5%
 *   vs yesterday
 *
 * `accent` colors the trend arrow + %; delta stays green/red by trend
 * so a wrong-direction move still reads correctly.
 */

type Props = {
  metric: StatMetric;
  icon: React.ReactNode;
  iconBg: string;
  accent: string;
};

export const StatCard: React.FC<Props> = ({ metric, icon, iconBg }) => {
  const TrendIcon = metric.trend === 'up' ? TrendingUp : TrendingDown;
  const trendColor = metric.trend === 'up' ? Colors.success : Colors.error;

  return (
    <View style={styles.card}>
      <View style={[styles.iconBubble, { backgroundColor: iconBg }]}>
        {icon}
      </View>

      <Text style={styles.label} numberOfLines={1}>
        {metric.label}
      </Text>

      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {metric.value}
      </Text>

      <View style={styles.trendRow}>
        <TrendIcon size={10} color={trendColor} />
        <Text style={[styles.delta, { color: trendColor }]}>
          {metric.deltaPct}%
        </Text>
      </View>

      <Text style={styles.compare} numberOfLines={1}>
        {metric.compareLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'flex-start',
    gap: 4,
    ...Shadows.xs,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  value: {
    ...Typography.h4,
    color: Colors.textPrimary,
    fontWeight: '800',
    marginTop: 1,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  delta: {
    fontSize: 11,
    fontWeight: '700',
  },
  compare: {
    fontSize: 9,
    color: Colors.textSecondary,
  },
});
