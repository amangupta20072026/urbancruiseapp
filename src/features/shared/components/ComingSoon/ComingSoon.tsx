/**
 * ------------------------------------------------------------------
 * ComingSoon
 * ------------------------------------------------------------------
 * A polished placeholder body for screens whose real UI has not yet
 * shipped. Composable — accepts an optional custom icon; defaults to
 * a hard-hat glyph. Callers wrap this in <SafeScreen> (+ optionally
 * <ScreenHeader>) so it fits both tab landings and stack pages.
 *
 * WHY NOT NoImplementedScreen?
 *   NoImplementedScreen is a DEVELOPER SAFETY NET — a bare-bones
 *   placeholder registered on unimplemented ghost routes, showing
 *   the route name + params so devs can debug bad navigation calls.
 *   ComingSoon is USER-FACING — polished copy, brand-consistent, no
 *   route-name debug chip. Keep them separate: NoImplementedScreen
 *   should never leak to production; ComingSoon is intentional
 *   product-facing messaging.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HardHat, type LucideProps } from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';

type Props = {
  /**
   * Feature name shown in the primary line, e.g. "Vendors".
   * Rendered as `{feature} is coming soon`.
   */
  feature: string;
  /** Optional supporting copy. Falls back to a generic sentence. */
  message?: string;
  /**
   * Optional custom icon component (any lucide-react-native icon).
   * Defaults to the HardHat glyph.
   */
  Icon?: React.ComponentType<LucideProps>;
};

export const ComingSoon: React.FC<Props> = ({
  feature,
  message,
  Icon = HardHat,
}) => {
  return (
    <View style={styles.root} accessibilityRole="summary">
      <View style={styles.iconBubble}>
        <Icon size={40} color={Colors.primary} strokeWidth={1.75} />
      </View>

      <Text style={styles.title} accessibilityRole="header">
        {feature} is coming soon
      </Text>
      <Text style={styles.message}>
        {message ??
          "We're building this out. Check back shortly — the full experience will land in a future update."}
      </Text>

      <View style={styles.chip}>
        <Text style={styles.chipText}>Work in progress</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  iconBubble: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#E7F7EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: Spacing.xl,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  chipText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
