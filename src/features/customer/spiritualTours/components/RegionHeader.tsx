/**
 * ------------------------------------------------------------------
 * RegionHeader — the "NORTH TOURS" band
 * ------------------------------------------------------------------
 *   ┌──────────────────────────────────────────────┐
 *   │  NORTH TOURS                                  │
 *   └──────────────────────────────────────────────┘
 *
 * A full-width tint band holding the region label, with no icon. The
 * band reads as the container the cards sit in, which is what a
 * region actually is.
 *
 * `north` and `west` are the only regions with tours today. The
 * catalogue supplies the region name, so adding a southern tour on
 * the backend produces a correct heading with no app release.
 * ------------------------------------------------------------------ */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';

type Props = {
  label: string;
};

export const RegionHeader: React.FC<Props> = ({ label }) => (
  <View style={styles.band}>
    {/* "NORTH" + " TOURS": the catalogue supplies the region name,
        the screen supplies the noun, so a new region needs no copy
        change here. */}
    <Text
      style={styles.label}
      accessibilityRole="header"
      maxFontSizeMultiplier={1.4}
      numberOfLines={1}
    >
      {label} TOURS
    </Text>
  </View>
);

const styles = StyleSheet.create({
  band: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryTint,
  },
  label: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.9,
    color: Colors.primaryDark,
  },
});
