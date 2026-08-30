/**
 * ------------------------------------------------------------------
 * SectionHeader
 * ------------------------------------------------------------------
 * Reusable section title row:
 *
 *   Upcoming Trip                                View All  ›
 *
 * Used above Upcoming Trip and Recent Activity on the Home screen.
 * The right-side action is optional — omit `onActionPress` to hide
 * the "View All" affordance entirely (for sections with no "all"
 * view).
 * ------------------------------------------------------------------ */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { Colors, Spacing, Typography } from '@theme';

type Props = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export const SectionHeader: React.FC<Props> = ({
  title,
  actionLabel = 'View All',
  onActionPress,
}) => (
  <View style={styles.row}>
    <Text style={styles.title} numberOfLines={1}>
      {title}
    </Text>
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  title: {
    ...Typography.title,
    color: Colors.textPrimary,
    fontWeight: '800',
    letterSpacing: -0.2,
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
