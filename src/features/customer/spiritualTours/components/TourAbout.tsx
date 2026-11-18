/**
 * ------------------------------------------------------------------
 * TourAbout — the "About the Tour" block
 * ------------------------------------------------------------------
 *   (i)  About the Tour
 *        A sacred journey to the four holy shrines of …
 *
 * The body is the catalog's `overview`, printed as sent. The screen
 * does not render this block at all when a tour has no overview yet.
 * ------------------------------------------------------------------ */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Info } from 'lucide-react-native';

import { Colors, Spacing, Typography } from '@theme';

type Props = {
  body: string;
};

/** Same deep green as the tour title. */
const HEADING = '#1B5E20';

export const TourAbout: React.FC<Props> = ({ body }) => (
  <View style={styles.row}>
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Info size={30} color={Colors.primaryDark} strokeWidth={2} />
    </View>

    <View style={styles.copy}>
      <Text
        style={styles.heading}
        accessibilityRole="header"
        maxFontSizeMultiplier={1.4}
      >
        About the Tour
      </Text>
      <Text style={styles.body} maxFontSizeMultiplier={1.6}>
        {body}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xs,
  },
  heading: {
    ...Typography.subtitle,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '800',
    color: HEADING,
  },
  body: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
});
