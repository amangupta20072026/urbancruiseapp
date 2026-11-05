/**
 * ------------------------------------------------------------------
 * ConversionCard — "Quotations vs Converted", full width, first card
 * ------------------------------------------------------------------
 *   (icon) Quotations vs Converted                          >
 *          89  converted of 214 quotations          [41.6%]
 *   ████████████░░░░░░░░░░░░░░░░░
 *   ↗ 3.1%  |  vs yesterday
 *
 * Converted = the assigned lead (tele-sales / travel advisor) has
 * called the customer. Counted by the backend; see QuotationConversion.
 * The % is worked out here from the two counts (utils/stats.ts).
 * The whole card is one button (opens Quotations).
 * ------------------------------------------------------------------
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ChartNoAxesCombined,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';

import type { QuotationConversion } from '../types';
import { formatCount } from '../utils/stats';

type Props = {
  data: QuotationConversion;
  /** 0–100, from conversionRate(). */
  ratePct: number;
  onPress: () => void;
};

export const ConversionCard: React.FC<Props> = ({ data, ratePct, onPress }) => {
  const up = data.trend === 'up';
  const TrendIcon = up ? TrendingUp : TrendingDown;
  const trendColor = up ? Colors.success : Colors.error;
  const delta = `${Math.abs(data.deltaPct)}%`;
  const converted = formatCount(data.converted);
  const total = formatCount(data.total);
  const rate = `${ratePct}%`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={
        `Quotations versus converted: ${converted} converted of ${total} ` +
        `quotations, ${rate}. ${up ? 'Up' : 'Down'} ${delta} ${
          data.compareLabel
        }`
      }
      accessibilityHint="Opens Quotations"
    >
      <View style={styles.top}>
        <View style={styles.iconCircle}>
          <ChartNoAxesCombined size={22} color={Colors.info} strokeWidth={2} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.label} numberOfLines={1}>
            Quotations vs Converted
          </Text>
          <View style={styles.valueRow}>
            <Text style={styles.value} numberOfLines={1}>
              {converted}
            </Text>
            <Text style={styles.of} numberOfLines={2}>
              converted of {total} quotations
            </Text>
          </View>
        </View>
        <View style={styles.ratePill}>
          <Text style={styles.rateText}>{rate}</Text>
        </View>
        <ChevronRight size={18} color={Colors.textTertiary} strokeWidth={2.2} />
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(ratePct, 100)}%` }]} />
      </View>

      <View style={styles.trendRow}>
        <TrendIcon size={16} color={trendColor} strokeWidth={2.4} />
        <Text style={[styles.delta, { color: trendColor }]}>{delta}</Text>
        <View style={styles.trendDivider} />
        <Text style={styles.compare} numberOfLines={1}>
          {data.compareLabel}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    ...Shadows.xs,
  },
  pressed: { opacity: 0.85 },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.infoTint,
  },
  textCol: { flex: 1, minWidth: 0 },
  label: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs + 2,
  },
  value: { ...Typography.h5, color: Colors.textPrimary, fontWeight: '800' },
  of: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  /* primaryDark on primaryTint: AA for small bold text. */
  ratePill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryTint,
  },
  rateText: {
    ...Typography.bodySmall,
    color: Colors.primaryDark,
    fontWeight: '800',
  },
  track: {
    height: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.backgroundTertiary,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
  },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  delta: { ...Typography.bodySmall, fontWeight: '700' },
  trendDivider: { width: 1, height: 14, backgroundColor: Colors.border },
  compare: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
});
