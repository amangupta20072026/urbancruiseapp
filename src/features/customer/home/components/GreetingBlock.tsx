/**
 * ------------------------------------------------------------------
 * GreetingBlock
 * ------------------------------------------------------------------
 * Time-aware greeting under the header. Composes:
 *   - `Good morning|afternoon|evening` from time-of-day helper
 *   - user's first name (or "there" fallback)
 *   - a wave emoji (sized so it visually matches the text baseline)
 *   - a muted subtitle line
 *
 * Time-of-day is computed at render time — not reactive to the clock.
 * Leaving the screen open through noon won't refresh the greeting,
 * but that's an accepted trade-off vs. running a per-minute timer.
 * ------------------------------------------------------------------ */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '@theme';
import { getGreeting } from '../utils/greeting';

type Props = {
  firstName: string;
  /** Sub-headline under the greeting. Injected so copy can vary
   * without another prop churn. */
  subtitle?: string;
};

const DEFAULT_SUBTITLE = "Let's plan your next journey";

export const GreetingBlock: React.FC<Props> = ({
  firstName,
  subtitle = DEFAULT_SUBTITLE,
}) => {
  const greeting = getGreeting();
  const nameOrFallback = firstName || 'there';

  return (
    <View style={styles.wrap}>
      <Text style={styles.headline} numberOfLines={2}>
        {greeting}, {nameOrFallback}
        <Text style={styles.emoji}> 👋</Text>
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    gap: 6,
  },
  headline: {
    ...Typography.h5,
    color: Colors.textPrimary,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  emoji: {
    fontWeight: '400',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});