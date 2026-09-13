/**
 * ------------------------------------------------------------------
 * RewardRow
 * ------------------------------------------------------------------
 * One row in the Recent Rewards list. Split into its own file
 * because the row is repeated and has kind-driven styling; keeping
 * the mapping here means the screen file only reads the layout.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Trophy, Users } from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';
import type { RewardItem, RewardKind } from '../types';

type IconComp = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

type Style = { Icon: IconComp; fg: string; bg: string };

/**
 * Local purple pair — mockup shows the Special Campaign icon in
 * purple, which isn't in `theme/colors.ts`. Kept inline (same
 * pattern as ProfileScreen); promote to the theme if a third
 * screen needs it.
 */
const ICON_PURPLE = '#8B5CF6';
const ICON_PURPLE_TINT = '#EDE9FE';

const KIND_STYLE: Record<RewardKind, Style> = {
  friend_booking: {
    Icon: Users,
    fg: Colors.primary,
    bg: Colors.primaryTint,
  },
  special_campaign: {
    Icon: Trophy,
    fg: ICON_PURPLE,
    bg: ICON_PURPLE_TINT,
  },
  other: {
    Icon: Trophy,
    fg: Colors.textSecondary,
    bg: Colors.surfaceMuted,
  },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

type Props = {
  item: RewardItem;
  onPress: () => void;
};

export const RewardRow: React.FC<Props> = ({ item, onPress }) => {
  const style = KIND_STYLE[item.kind];
  const { Icon } = style;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${formatRupees(item.amount)}`}
    >
      <View style={[styles.icon, { backgroundColor: style.bg }]}>
        <Icon size={22} color={style.fg} strokeWidth={2} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {item.subtitle}
        </Text>
        <Text style={styles.date}>{formatDate(item.date)}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>+ {formatRupees(item.amount)}</Text>
      </View>
      <ChevronRight size={18} color={Colors.textTertiary} strokeWidth={2} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 1,
  },
  title: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  date: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontWeight: '500',
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  amount: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.85,
  },
});
