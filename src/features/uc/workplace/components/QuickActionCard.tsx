/**
 * ------------------------------------------------------------------
 * QuickActionCard — one tinted tile on the Workplace home
 * ------------------------------------------------------------------
 * Stacked layout: a top row with the tinted icon circle (left) and a
 * chevron (right), then the title and description underneath at the
 * tile's full width. Two tiles per row on the Workplace dashboard.
 *
 * Text is never truncated: title and description wrap onto as many
 * lines as they need. Tiles in the same row stay the same height,
 * because the parent row (actionRow) stretches its children.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, type LucideProps } from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';

export type QuickActionCardProps = {
  title: string;
  description: string;
  Icon: React.ComponentType<LucideProps>;
  /** Card background wash. */
  bg: string;
  /** Icon circle background. */
  iconBg: string;
  /** Icon stroke colour. */
  iconFg: string;
  onPress: () => void;
};

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  description,
  Icon,
  bg,
  iconBg,
  iconFg,
  onPress,
}) => (
  <Pressable
    style={({ pressed }) => [
      styles.card,
      { backgroundColor: bg },
      pressed && styles.pressed,
    ]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={title}
    accessibilityHint={description}
  >
    <View style={styles.topRow}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Icon size={20} color={iconFg} />
      </View>
      <ChevronRight size={18} color={Colors.textTertiary} />
    </View>

    <Text style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    minHeight: 96,
  },
  pressed: { opacity: 0.7 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  description: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
