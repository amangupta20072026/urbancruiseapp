/**
 * ------------------------------------------------------------------
 * SectionHeader
 * ------------------------------------------------------------------
 * Reusable section title row:
 *
 *   Upcoming Trip                                View All  ›
 *
 *   Explore our fleet                            View All  ›
 *   Watch the vehicles before you book      ← optional subtitle
 *
 * Used above Upcoming Trip and Explore our fleet on the Home screen.
 * The right-side action is optional — omit `onActionPress` to hide
 * the "View All" affordance entirely (for sections with no "all"
 * view). `subtitle` is optional too; without it the row is exactly
 * as before.
 * ------------------------------------------------------------------ */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { Colors, Spacing, Typography } from '@theme';

type Props = {
  title: string;
  /** Small grey line under the title. */
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export const SectionHeader: React.FC<Props> = ({
  title,
  subtitle,
  actionLabel = 'View All',
  onActionPress,
}) => (
  <View style={styles.row}>
    <View style={styles.titleBlock}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
    {onActionPress ? (
      <Pressable
        onPress={onActionPress}
        accessibilityRole="button"
        accessibilityLabel={`${actionLabel} ${title}`}
        hitSlop={8}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      >
        <Text style={styles.actionLabel}>{actionLabel}</Text>
        <ChevronRight size={16} color={Colors.primary} strokeWidth={2.2} />
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  titleBlock: {
    flexShrink: 1,
  },
  title: {
    ...Typography.title,
    color: Colors.textPrimary,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionLabel: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '700',
  },
  pressed: { opacity: 0.5 },
});
