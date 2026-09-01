import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Polyline,
  Stop,
} from 'react-native-svg';
import { Radius, Spacing, Typography } from '@theme';

/**
 * InsightsBanner — dark-green promo card with a rising-line chart
 * illustration on the right and a pill "View Insights" CTA on the left.
 * Illustration is inline SVG so we don't need extra image assets.
 */

type Props = {
  headline: string;
  body: string;
  ctaLabel: string;
  onPress?: () => void;
};

const BG = '#0F3D2E';
const BG_ACCENT = '#1F6B4A';
const CHART_LINE = '#4ADE80';
const CHART_FILL = '#22C55E';

export const InsightsBanner: React.FC<Props> = ({
  headline,
  body,
  ctaLabel,
  onPress,
}) => (
  <View style={styles.card}>
    {/* Subtle radial-ish highlight — a lighter blob behind the chart */}
    <View style={styles.accentBlob} />

    <View style={styles.content}>
      <View style={styles.textCol}>
        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.body}>{body}</Text>

        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          style={({ pressed }) => [
            styles.cta,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </Pressable>
      </View>

      <View style={styles.chartWrap}>
        <MiniGrowthChart />
      </View>
    </View>
  </View>
);

/* --- Inline rising-bar/line growth chart --- */
const MiniGrowthChart: React.FC = () => {
  const W = 130;
  const H = 90;
  const bars = [
    { x: 0, h: 18 },
    { x: 20, h: 26 },
    { x: 40, h: 22 },
    { x: 60, h: 40 },
    { x: 80, h: 55 },
    { x: 100, h: 72 },
  ];
  const barW = 12;
  const linePts = bars
    .map(b => `${b.x + barW / 2},${H - b.h - 4}`)
    .join(' ');

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <LinearGradient id="growthBar" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={CHART_FILL} stopOpacity="0.9" />
          <Stop offset="1" stopColor={CHART_FILL} stopOpacity="0.35" />
        </LinearGradient>
      </Defs>

      {bars.map(b => (
        <Path
          key={b.x}
          d={`M${b.x},${H} L${b.x},${H - b.h} L${b.x + barW},${
            H - b.h
          } L${b.x + barW},${H} Z`}
          fill="url(#growthBar)"
        />
      ))}

      {/* Trend line rising over the bars */}
      <Polyline
        points={linePts}
        fill="none"
        stroke={CHART_LINE}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Rising arrow head at the end */}
      <Path
        d={`M${bars[bars.length - 1].x + barW / 2 - 6},${
          H - bars[bars.length - 1].h - 10
        } l6,-6 l6,6`}
        fill="none"
        stroke={CHART_LINE}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: BG,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  accentBlob: {
    position: 'absolute',
    right: -30,
    top: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: BG_ACCENT,
    opacity: 0.35,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  textCol: {
    flex: 1,
    gap: 4,
  },
  headline: {
    ...Typography.body,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  body: {
    fontSize: 12,
    color: '#CFEBD9',
    lineHeight: 17,
    marginBottom: Spacing.sm,
  },
  cta: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: '#052A1D',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  chartWrap: {
    width: 130,
    height: 90,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});