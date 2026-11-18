/**
 * ------------------------------------------------------------------
 * RegionHeader — the "📍 NORTH TOURS" band
 * ------------------------------------------------------------------
 *   ┌──────────────────────────────────────────────┐
 *   │  📍  NORTH TOURS                              │
 *   └──────────────────────────────────────────────┘
 *
 * A full-width tint band with a solid green map pin and the region
 * label. The band reads as the container the cards sit in, which is
 * what a region actually is.
 *
 * THE PIN IS DRAWN, NOT LUCIDE
 *   Lucide's MapPin is an outline; filling it also fills its inner
 *   circle, so the pin loses its hole. The design's pin is solid with
 *   a white hole, so it is one evenodd path here.
 *
 * `north` and `west` are the only regions with tours today. The
 * catalogue supplies the region name, so adding a southern tour on
 * the backend produces a correct heading with no app release.
 * ------------------------------------------------------------------ */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Colors, Radius, Spacing, Typography } from '@theme';

type Props = {
  label: string;
};

const PIN_SIZE = 22;

const MapPinSolid: React.FC = () => (
  <Svg width={PIN_SIZE} height={PIN_SIZE} viewBox="0 0 24 24">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
      fill={Colors.primaryDark}
    />
  </Svg>
);

export const RegionHeader: React.FC<Props> = ({ label }) => (
  <View style={styles.band}>
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <MapPinSolid />
    </View>

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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryTint,
  },
  label: {
    ...Typography.bodySmall,
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: Colors.primaryDark,
  },
});
