/**
 * ------------------------------------------------------------------
 * TabPieces — the two things every tab panel needs
 * ------------------------------------------------------------------
 * SectionHeading — a bold heading with the design's short green rule
 *                  under its first few characters ("About the Tour").
 * TabEmpty       — what a panel shows when the catalog has no content
 *                  for it yet.
 *
 * ON THE EMPTY STATE
 *   Four of the five tabs ship with nothing in them, because only the
 *   Overview was designed and only Char Dham is written up. The copy
 *   says the detail is being prepared and points at the team, which
 *   is true and useful. It deliberately does NOT say "coming soon" —
 *   this is a tour the customer can enquire about today, and the CTA
 *   at the foot of the screen still works.
 * ------------------------------------------------------------------ */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';

export const SectionHeading: React.FC<{ title: string }> = ({ title }) => (
  <View style={styles.headingWrap}>
    <Text style={styles.heading} accessibilityRole="header">
      {title}
    </Text>
    <View
      style={styles.rule}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  </View>
);

export const TabEmpty: React.FC<{ message: string }> = ({ message }) => (
  <View style={styles.empty}>
    <Text style={styles.emptyText}>{message}</Text>
    <Text style={styles.emptyHint}>
      Use Enquire / Book Now below and our team will share the full detail for
      your dates.
    </Text>
  </View>
);

const styles = StyleSheet.create({
  headingWrap: {
    gap: Spacing.sm,
  },
  heading: {
    ...Typography.h4,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  rule: {
    width: 64,
    height: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryDark,
  },
  empty: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.backgroundSecondary,
    gap: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptyHint: {
    ...Typography.bodySmall,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
});
