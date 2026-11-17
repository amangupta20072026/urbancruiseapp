/**
 * ------------------------------------------------------------------
 * RegionHeader — the "NORTH TOURS" band
 * ------------------------------------------------------------------
 *   ┌──────────────────────────────────────────────┐
 *   │  ⛰  NORTH TOURS                              │
 *   └──────────────────────────────────────────────┘
 *
 * A full-width tint band with a small mark, replacing the earlier
 * pill-and-hairline. The band reads as the container the cards sit
 * in, which is what a region actually is.
 *
 * The marks are drawn here rather than imported. lucide-react-native
 * does ship mountain and sunrise glyphs, but nothing in this repo
 * imports them yet, so their names are unverified against the pinned
 * version — a wrong name is a build failure for a 22 dp decoration.
 *
 * `north` and `west` are the only regions with tours today. The rest
 * resolve to a neutral compass mark, so adding a southern tour on the
 * backend produces a correct heading immediately, without waiting for
 * an app release to draw its icon.
 * ------------------------------------------------------------------ */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Colors, Radius, Spacing, Typography } from '@theme';
import type { SpiritualTourRegion } from '../types';

type Props = {
  label: string;
  region: SpiritualTourRegion;
};

const MARK = 22;

const markProps = {
  stroke: Colors.primaryDark,
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none' as const,
};

/** A snow-capped range — the Himalaya, for the northern circuits. */
const MountainsMark: React.FC = () => (
  <>
    <Path d="M2 18 L8.5 7 L13 14 L16 9.5 L22 18 Z" {...markProps} />
    <Path d="M6.4 10.6 L8.5 9.2 L10.6 10.6" {...markProps} />
  </>
);

/** A sun over water — the design's mark for the western circuits. */
const SunWavesMark: React.FC = () => (
  <>
    <Circle cx={12} cy={9} r={3.6} {...markProps} />
    <Path d="M12 2.4 V3.7" {...markProps} />
    <Path d="M5.6 9 H4.3" {...markProps} />
    <Path d="M19.7 9 H18.4" {...markProps} />
    <Path d="M7 4.2 L7.9 5.1" {...markProps} />
    <Path d="M17 4.2 L16.1 5.1" {...markProps} />
    <Path d="M2.6 16.4 Q5.4 14.4 8.1 16.4 T13.5 16.4 T19 16.4" {...markProps} />
    <Path d="M2.6 20 Q5.4 18 8.1 20 T13.5 20 T19 20" {...markProps} />
  </>
);

/** Neutral stand-in for regions with no mark of their own yet. */
const CompassMark: React.FC = () => (
  <>
    <Circle cx={12} cy={12} r={9} {...markProps} />
    <Path d="M15.2 8.8 L13.4 13.4 L8.8 15.2 L10.6 10.6 Z" {...markProps} />
  </>
);

function markFor(region: SpiritualTourRegion): React.ReactNode {
  switch (region) {
    case 'north':
      return <MountainsMark />;
    case 'west':
      return <SunWavesMark />;
    default:
      return <CompassMark />;
  }
}

export const RegionHeader: React.FC<Props> = ({ label, region }) => (
  <View style={styles.band}>
    <Svg
      width={MARK}
      height={MARK}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {markFor(region)}
    </Svg>

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
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryTint,
  },
  label: {
    ...Typography.bodySmall,
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.9,
    color: Colors.primaryDark,
  },
});
