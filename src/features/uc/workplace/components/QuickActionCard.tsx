/**
 * ------------------------------------------------------------------
 * QuickActionCard — one tinted tile on the Workplace home
 * ------------------------------------------------------------------
 * Title, one line of description, a tinted icon circle and a chevron.
 * Two per row on the Workplace dashboard.
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
    <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
      <Icon size={20} color={iconFg} />
    </View>

    <View style={styles.textWrap}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.description} numberOfLines={2}>
        {description}
      </Text>
    </View>

    <ChevronRight size={18} color={Colors.textTertiary} />
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    minHeight: 96,
  },
  pressed: { opacity: 0.7 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
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
