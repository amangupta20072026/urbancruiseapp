import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '@theme';

type Props = {
  title: string;
  message?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
};

export const EmptyState: React.FC<Props> = ({
  title,
  message,
  ctaLabel,
  onCtaPress,
}) => (
  <View style={styles.wrap}>
    <View style={styles.iconCircle}>
      <Text style={styles.iconGlyph}>◌</Text>
    </View>
    <Text style={styles.title}>{title}</Text>
    {message ? <Text style={styles.message}>{message}</Text> : null}
    {ctaLabel && onCtaPress ? (
      <Pressable style={styles.cta} onPress={onCtaPress}>
        <Text style={styles.ctaLabel}>{ctaLabel}</Text>
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  iconGlyph: {
    fontSize: 40,
    color: Colors.textMuted,
  },
  title: {
    ...Typography.h4,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  message: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  cta: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  ctaLabel: {
    ...Typography.button,
    color: Colors.textOnPrimary,
  },
});
