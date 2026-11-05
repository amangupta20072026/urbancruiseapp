/**
 * ------------------------------------------------------------------
 * OutstandingCard — Total Outstanding with this month's collection
 * target vs achieved (grid size, same frame as StatCard)
 * ------------------------------------------------------------------
 *   (icon) Total Outstanding         >
 *          ₹3,42,500
 *   ██████████░░░░░░
 *   Collected ₹2,08,900
 *   Target (This month) ₹3,42,500   61%
 *
 * Target = amount to collect this month; Collected = amount collected
 * so far this month (product rule). Both come from the backend in
 * paise; the % is worked out here (utils/stats.ts collectionRate).
 * The bar stops at 100 %; the text can show more (target beaten).
 * % colour: green at or above target, amber below.
 * ------------------------------------------------------------------
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';

import type { OutstandingCollection, StatMetric } from '../types';
import { formatRupees } from '../utils/format';

type Props = {
  /** The 'outstanding' stat: label + formatted value. */
  metric: StatMetric;
  collection: OutstandingCollection;
  /** From collectionRate(): ≥ 0, may exceed 100. */
  ratePct: number;
  Icon: LucideIcon;
  tint: { fg: string; bg: string };
  onPress: () => void;
  accessibilityHint: string;
};

export const OutstandingCard: React.FC<Props> = ({
  metric,
  collection,
  ratePct,
  Icon,
  tint,
  onPress,
  accessibilityHint,
}) => {
  const collected = formatRupees(collection.collected);
  const target = formatRupees(collection.target);
  const rate = `${ratePct}%`;
  const reached = ratePct >= 100;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={
        `${metric.label}: ${metric.value}. Collected ${collected} of ` +
        `${collection.periodLabel.toLowerCase()} target ${target}, ${rate}.`
      }
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

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(ratePct, 100)}%` }]} />
      </View>

      <View style={styles.lines}>
        <Text style={styles.line} numberOfLines={1}>
          Collected <Text style={styles.strong}>{collected}</Text>
        </Text>
        <View style={styles.targetRow}>
          <Text style={[styles.line, styles.targetText]} numberOfLines={1}>
            Target {target}
          </Text>
          <Text
            style={[styles.rate, reached ? styles.rateGood : styles.rateLow]}
          >
            {rate}
          </Text>
        </View>
        <Text style={styles.period} numberOfLines={1}>
          {collection.periodLabel}
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
  },
  textCol: { flex: 1, minWidth: 0 },
  label: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  value: { ...Typography.h5, color: Colors.textPrimary, fontWeight: '800' },
  track: {
    height: 7,
    borderRadius: Radius.pill,
    backgroundColor: Colors.backgroundTertiary,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
  },
  lines: { gap: 2 },
  line: { ...Typography.caption, color: Colors.textSecondary },
  strong: { color: Colors.textPrimary, fontWeight: '700' },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  targetText: { flex: 1 },
  rate: { ...Typography.caption, fontWeight: '800' },
  /* primaryDark / pendingDark on white: both pass AA for small bold text. */
  rateGood: { color: Colors.primaryDark },
  rateLow: { color: Colors.pendingDark },
  period: { ...Typography.caption, color: Colors.textTertiary },
});
