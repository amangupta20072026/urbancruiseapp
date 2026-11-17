/**
 * ------------------------------------------------------------------
 * TourHighlights — the ticked list in its pale green panel
 * ------------------------------------------------------------------
 * A sparkle, a heading, and one ticked line per highlight, over a
 * faint mountain watermark in the bottom-right corner.
 *
 * Both the sparkle and the mountains are drawn here. lucide ships a
 * Sparkles glyph but nothing in this repo imports it, so its name is
 * unverified against the pinned version — and the watermark is a
 * shape no icon set has. Two small path sets cost less than a build
 * failure for decoration.
 * ------------------------------------------------------------------ */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { CheckCircle2 } from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';

type Props = {
  highlights: string[];
};

/** A four-point sparkle with a small companion, as in the design. */
const SparkleMark: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24">
    <Path
      d="M13.4 2.6 L15.1 8.3 L20.8 10 L15.1 11.7 L13.4 17.4 L11.7 11.7 L6 10 L11.7 8.3 Z"
      fill={Colors.primaryDark}
    />
    <Path
      d="M5.6 14.2 L6.5 16.9 L9.2 17.8 L6.5 18.7 L5.6 21.4 L4.7 18.7 L2 17.8 L4.7 16.9 Z"
      fill={Colors.primary}
    />
  </Svg>
);

/** Faint ridge line behind the list. Decorative. */
const MountainWatermark: React.FC = () => (
  <View
    style={styles.watermark}
    pointerEvents="none"
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
  >
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 200 110"
      preserveAspectRatio="xMaxYMax slice"
    >
      <Path
        d="M0 110 L46 44 L78 80 L112 26 L152 74 L178 52 L200 72 L200 110 Z"
        fill={Colors.primaryLight}
        opacity={0.26}
      />
      <Path
        d="M96 44 L112 26 L128 44 L118 40 L112 48 L106 40 Z"
        fill={Colors.surface}
        opacity={0.5}
      />
    </Svg>
  </View>
);

export const TourHighlights: React.FC<Props> = ({ highlights }) => {
  if (highlights.length === 0) return null;

  return (
    <View style={styles.panel}>
      <MountainWatermark />

      <View style={styles.headingRow}>
        <SparkleMark />
        <Text style={styles.heading} accessibilityRole="header">
          Tour Highlights
        </Text>
      </View>

      <View style={styles.list}>
        {highlights.map(item => (
          <View key={item} style={styles.row}>
            <CheckCircle2 size={20} color={Colors.primary} strokeWidth={2.2} />
            <Text style={styles.item} maxFontSizeMultiplier={1.6}>
              {item}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    marginTop: Spacing.xxl,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryWash,
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: '58%',
    height: '72%',
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  heading: {
    ...Typography.title,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  list: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  item: {
    ...Typography.body,
    flex: 1,
    lineHeight: 21,
    color: Colors.textPrimary,
  },
});
