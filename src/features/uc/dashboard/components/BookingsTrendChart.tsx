/**
 * ------------------------------------------------------------------
 * BookingsTrendChart — daily bookings line chart with range menu
 * ------------------------------------------------------------------
 *   Bookings Trend                        [Last 7 Days ⌄]
 *   Total bookings for the last 7 days
 *   60 ┤                                   (52 Bookings)
 *   40 ┤        •                     •  •
 *   20 ┤   •          •         •
 *    0 ┼──────────────────────────────────────
 *       Aug 5  Aug 6 …                  Aug 11
 *
 * Geometry is computed in utils/trendChart.ts for the measured width,
 * so labels keep their real size on every screen. Up to 15 days every
 * point gets a dot; beyond that only the latest day does, and the
 * date labels are thinned to at most 7.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';

import type { BookingTrend, TrendRange } from '../types';
import { bookingsLabel, trendDayLabel } from '../utils/format';
import { buildChart } from '../utils/trendChart';
import { TrendRangeMenu } from './TrendRangeMenu';

const CHART_H = 220;
const BUBBLE_W = 84;
const BUBBLE_H = 40;
const LINE = Colors.success;

type Props = {
  trend: BookingTrend | undefined;
  range: TrendRange;
  onRangeChange: (range: TrendRange) => void;
  isError: boolean;
  onRetry: () => void;
};

export const BookingsTrendChart: React.FC<Props> = ({
  trend,
  range,
  onRangeChange,
  isError,
  onRetry,
}) => {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(Math.round(e.nativeEvent.layout.width));
  }, []);

  const chart = useMemo(
    () => (trend ? buildChart(trend.points, width, CHART_H) : null),
    [trend, width],
  );

  const last = chart?.points[chart.points.length - 1];
  const bubbleLeft = last
    ? Math.min(Math.max(last.x - BUBBLE_W / 2, 0), width - BUBBLE_W)
    : 0;
  const bubbleTop = last ? Math.max(last.y - BUBBLE_H - 10, 0) : 0;

  const summary = useMemo(() => {
    if (!trend || trend.points.length === 0) return undefined;
    const counts = trend.points.map(p => p.count);
    const latest = trend.points[trend.points.length - 1];
    return `Bookings per day for the last ${range} days, from ${Math.min(
      ...counts,
    )} to ${Math.max(...counts)}. Latest, ${trendDayLabel(
      latest.date,
    )}: ${bookingsLabel(latest.count)}.`;
  }, [trend, range]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header">
            Bookings Trend
          </Text>
          <Text style={styles.subtitle}>
            Total bookings for the last {range} days
          </Text>
        </View>
        <TrendRangeMenu value={range} onChange={onRangeChange} />
      </View>

      <View
        style={styles.chartBox}
        onLayout={onLayout}
        accessible={summary !== undefined}
        accessibilityRole="image"
        accessibilityLabel={summary}
      >
        {isError && !trend ? (
          <View style={styles.center}>
            <Text style={styles.message}>Couldn’t load the trend.</Text>
            <Pressable
              onPress={onRetry}
              hitSlop={8}
              accessibilityRole="button"
              style={styles.retry}
            >
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : !trend ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : !chart ? (
          width > 0 ? (
            <View style={styles.center}>
              <Text style={styles.message}>No bookings in this period.</Text>
            </View>
          ) : null
        ) : (
          <>
            <Svg width={width} height={CHART_H}>
              <Defs>
                <LinearGradient id="bookingsFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={LINE} stopOpacity="0.22" />
                  <Stop offset="1" stopColor={LINE} stopOpacity="0" />
                </LinearGradient>
              </Defs>

              {chart.yTicks.map(t => (
                <React.Fragment key={t.value}>
                  <Line
                    x1={chart.points[0].x}
                    x2={width - 4}
                    y1={t.y}
                    y2={t.y}
                    stroke={Colors.border}
                    strokeWidth={1}
                    strokeDasharray={t.value === 0 ? undefined : '4 4'}
                  />
                  <SvgText
                    x={chart.points[0].x - 10}
                    y={t.y + 4}
                    fontSize="11"
                    fill={Colors.textSecondary}
                    textAnchor="end"
                  >
                    {t.value}
                  </SvgText>
                </React.Fragment>
              ))}

              <Path d={chart.area} fill="url(#bookingsFill)" />
              <Path
                d={chart.line}
                stroke={LINE}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                fill="none"
              />

              {last ? (
                <Line
                  x1={last.x}
                  x2={last.x}
                  y1={last.y}
                  y2={chart.baseY}
                  stroke={LINE}
                  strokeOpacity={0.35}
                  strokeWidth={1}
                />
              ) : null}

              {(chart.showAllDots ? chart.points : last ? [last] : []).map(
                p => (
                  <Circle
                    key={p.date}
                    cx={p.x}
                    cy={p.y}
                    r={4.5}
                    fill={LINE}
                    stroke={Colors.surface}
                    strokeWidth={2}
                  />
                ),
              )}

              {chart.xLabels.map(l => (
                <SvgText
                  key={l.date}
                  x={l.x}
                  y={CHART_H - 6}
                  fontSize="11"
                  fill={Colors.textSecondary}
                  textAnchor="middle"
                >
                  {trendDayLabel(l.date)}
                </SvgText>
              ))}
            </Svg>

            {last ? (
              <View
                style={[styles.bubble, { left: bubbleLeft, top: bubbleTop }]}
                importantForAccessibility="no-hide-descendants"
                accessibilityElementsHidden
              >
                <Text style={styles.bubbleCount}>{last.count}</Text>
                <Text style={styles.bubbleLabel}>
                  {last.count === 1 ? 'Booking' : 'Bookings'}
                </Text>
              </View>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  headerText: { flex: 1, gap: 2 },
  title: {
    ...Typography.title,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  subtitle: { ...Typography.bodySmall, color: Colors.textSecondary },

  chartBox: { height: CHART_H },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  message: { ...Typography.body, color: Colors.textSecondary },
  retry: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  retryText: {
    ...Typography.body,
    color: Colors.primaryDark,
    fontWeight: '700',
  },

  /* White on primaryDark: 5.1:1 contrast. */
  bubble: {
    position: 'absolute',
    width: BUBBLE_W,
    height: BUBBLE_H,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryDark,
  },
  bubbleCount: {
    ...Typography.bodySmall,
    lineHeight: 16,
    color: Colors.textOnPrimary,
    fontWeight: '800',
  },
  bubbleLabel: {
    ...Typography.caption,
    color: Colors.textOnPrimary,
  },
});
