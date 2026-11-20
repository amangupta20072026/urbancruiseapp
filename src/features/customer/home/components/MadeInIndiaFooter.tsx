/**
 * ------------------------------------------------------------------
 * MadeInIndiaFooter — the sign-off at the bottom of Customer Home
 * ------------------------------------------------------------------
 *   Travel together,          ← large, faded brand line
 *   travel happy
 *
 *   Crafted with ♥ in India
 *   ──────────────────────────
 *   Urban Cruise · v1.0.1
 *
 * Purely decorative: nothing here is tappable. The version comes from
 * the installed build (react-native-device-info), the same source as
 * Settings and About, so it is always the real one.
 *
 * TODO(copy): the tagline is a placeholder until marketing confirms
 * the final line.
 * ------------------------------------------------------------------ */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { Heart } from 'lucide-react-native';

import { Colors, Spacing, Typography } from '@theme';

const TAGLINE = 'Travel together,\ntravel happy';
const HEART_RED = '#E11D48';

export const MadeInIndiaFooter: React.FC = () => {
  const version = DeviceInfo.getVersion();

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={`Travel together, travel happy. Crafted with love in India. Urban Cruise version ${version}`}
    >
      <Text style={styles.tagline}>{TAGLINE}</Text>

      <View style={styles.craftedRow}>
        <Text style={styles.crafted}>Crafted with</Text>
        <Heart size={14} color={HEART_RED} fill={HEART_RED} strokeWidth={2} />
        <Text style={styles.crafted}>in India</Text>
      </View>

      <View style={styles.rule} />

      <Text style={styles.version}>Urban Cruise · v{version}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxxl + Spacing.lg,
  },
  tagline: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: Colors.textDisabled,
  },
  craftedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: Spacing.lg,
  },
  crafted: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
  rule: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  version: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
});
