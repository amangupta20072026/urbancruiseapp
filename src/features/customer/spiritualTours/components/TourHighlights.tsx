/**
 * ------------------------------------------------------------------
 * TourHighlights — "Tour Highlights" with a dotted list
 * ------------------------------------------------------------------
 * A star heading and one green-dotted line per highlight, directly
 * on the page (no panel behind it). Renders nothing when the catalog
 * has no highlights for the tour.
 * ------------------------------------------------------------------ */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Star } from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';
import { IconSection } from './tabs/IconSection';

type Props = {
  highlights: string[];
};

const DOT = 9;

export const TourHighlights: React.FC<Props> = ({ highlights }) => {
  if (highlights.length === 0) return null;

  return (
    <IconSection Icon={Star} title="Tour Highlights">
      <View style={styles.list}>
        {highlights.map(item => (
          <View key={item} style={styles.row}>
            <View
              style={styles.dot}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <Text style={styles.item} maxFontSizeMultiplier={1.6}>
              {item}
            </Text>
          </View>
        ))}
      </View>
    </IconSection>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  dot: {
    width: DOT,
    height: DOT,
    // Centres the dot on the first text line (lineHeight 22).
    marginTop: (22 - DOT) / 2,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primary,
  },
  item: {
    ...Typography.body,
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
});
