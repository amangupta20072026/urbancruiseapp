import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { ChevronDown, TrendingUp, TrendingDown } from 'lucide-react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import type { RevenueSeries } from '../types';

const CHART_H = 220;
const PAD = { left: 36, right: 12, top: 12, bottom: 28 };

type Props = { data: RevenueSeries; onRangeChange?: () => void };

export const RevenueChart: React.FC<Props> = ({ data, onRangeChange }) => {
  const { path, area, dots, xLabels, yTicks } = useMemo(() => {
    const values = data.points.map(p => p.value);
    const maxRaw = Math.max(...values);
    const yMax = Math.ceil(maxRaw / 20000) * 20000; // rounded to 20k
    const yMin = 0;
    const w = 320; // will be set to viewBox width; we use responsive SVG
    return build(data.points, yMin, yMax, w);
  }, [data]);

  const trendColor = data.trend === 'up' ? Colors.success : Colors.error;
  const TrendIcon = data.trend === 'up' ? TrendingUp : TrendingDown;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Revenue Overview</Text>
        <Pressable style={styles.rangePill} onPress={onRangeChange}>
          <Text style={styles.rangeText}>{data.range}</Text>
          <ChevronDown size={16} color={Colors.iconSecondary} />
        </Pressable>
      </View>

      <Text style={styles.total}>{data.total}</Text>
      <View style={styles.deltaRow}>
        <TrendIcon size={14} color={trendColor} />
        <Text style={[styles.delta, { color: trendColor }]}>
          {data.deltaPct}%
        </Text>
        <Text style={styles.compare}>{data.compareLabel}</Text>
      </View>

      <Svg width="100%" height={CHART_H} viewBox={`0 0 360 ${CHART_H}`}>
        <Defs>
          <LinearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Colors.primary} stopOpacity="0.25" />
            <Stop offset="1" stopColor={Colors.primary} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {yTicks.map(t => (
          <React.Fragment key={t.value}>
            <Line
              x1={PAD.left}
              x2={360 - PAD.right}
              y1={t.y}
              y2={t.y}
              stroke={Colors.borderLight}
              strokeWidth={1}
            />
            <SvgText
              x={PAD.left - 6}
              y={t.y + 4}
              fontSize="10"
              fill={Colors.textTertiary}
              textAnchor="end"
            >
              {t.label}
            </SvgText>
          </React.Fragment>
        ))}

        <Path d={area} fill="url(#revFill)" />
        <Path d={path} stroke={Colors.primary} strokeWidth={2.5} fill="none" />

        {dots.map((d, i) => (
          <Circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={4}
            fill={Colors.primary}
            stroke={Colors.background}
            strokeWidth={2}
          />
        ))}

        {xLabels.map(l => (
          <SvgText
            key={l.label}
            x={l.x}
            y={CHART_H - 8}
            fontSize="11"
            fill={Colors.textSecondary}
            textAnchor="middle"
          >
            {l.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
};

function build(
  points: { label: string; value: number }[],
  yMin: number,
  yMax: number,
  _w: number,
) {
  const W = 360;
  const innerW = W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const step = innerW / (points.length - 1);
  const toY = (v: number) =>
    PAD.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const coords = points.map((p, i) => ({
    x: PAD.left + i * step,
    y: toY(p.value),
    label: p.label,
  }));
  const path = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`)
    .join(' ');
  const area = `${path} L${coords[coords.length - 1].x},${PAD.top + innerH} L${
    coords[0].x
  },${PAD.top + innerH} Z`;

  const tickCount = 5;
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const v = yMin + ((yMax - yMin) * i) / tickCount;
    return { value: v, y: toY(v), label: `${Math.round(v / 1000)}K` };
  });

  return {
    path,
    area,
    dots: coords,
    xLabels: coords.map(c => ({ x: c.x, label: c.label })),
    yTicks,
  };
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { ...Typography.h5, color: Colors.textPrimary },
  rangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rangeText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  total: { ...Typography.h2, color: Colors.textPrimary, marginTop: Spacing.md },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  delta: { ...Typography.bodySmall, fontWeight: '700' },
  compare: { ...Typography.bodySmall, color: Colors.textSecondary },
});
