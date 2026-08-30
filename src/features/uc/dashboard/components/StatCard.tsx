import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import type { StatMetric } from '../types';

type Props = {
  metric: StatMetric;
  icon: React.ReactNode;
  iconBg: string;
  sparkline: number[];
  sparkColor: string;
};

const SPARK_W = 48;
const SPARK_H = 22;

const buildSparkPath = (values: number[], w: number, h: number) => {
  if (!values.length) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = w / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / span) * h;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
};

export const StatCard: React.FC<Props> = ({
  metric,
  icon,
  iconBg,
  sparkline,
  sparkColor,
}) => {
  const d = buildSparkPath(sparkline, SPARK_W, SPARK_H);
  const gradientId = `spark-${metric.key}`;
  const TrendIcon = metric.trend === 'up' ? TrendingUp : TrendingDown;
  const trendColor = metric.trend === 'up' ? Colors.success : Colors.error;

  return (
    <View style={styles.card}>
      {/* Row 1: icon + (label, value) */}
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          {icon}
        </View>
        <View style={styles.textCol}>
          <Text style={styles.label} numberOfLines={1}>
            {metric.label}
          </Text>
          <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
            {metric.value}
          </Text>
        </View>
      </View>

      {/* Row 2: trend % + compare + sparkline */}
      <View style={styles.bottomRow}>
        <TrendIcon size={12} color={trendColor} />
        <Text style={[styles.delta, { color: trendColor }]} numberOfLines={1}>
          {metric.deltaPct}%
        </Text>
        <Text style={styles.compare} numberOfLines={1}>
          {metric.compareLabel}
        </Text>
        <View style={styles.spark}>
          <Svg width={SPARK_W} height={SPARK_H}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={sparkColor} stopOpacity="0.25" />
                <Stop offset="1" stopColor={sparkColor} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Path
              d={`${d} L${SPARK_W},${SPARK_H} L0,${SPARK_H} Z`}
              fill={`url(#${gradientId})`}
            />
            <Path d={d} stroke={sparkColor} strokeWidth={2} fill="none" />
          </Svg>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md, // 12
    paddingHorizontal: Spacing.md, // 12
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm, // 8
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    minWidth: 0, // lets flex children shrink instead of overflowing
  },
  label: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  value: {
    ...Typography.h5, // 22
    color: Colors.textPrimary,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md, // 12
    gap: 4,
  },
  delta: {
    fontSize: 11,
    fontWeight: '700',
  },
  compare: {
    fontSize: 10,
    color: Colors.textSecondary,
    flexShrink: 1, // KEY: lets it shrink instead of wrapping vertically
  },
  spark: {
    width: SPARK_W,
    height: SPARK_H,
  },
});
