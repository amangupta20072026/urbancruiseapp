/**
 * IconSection — a bold heading with a line icon to its left, and the
 * section body indented beneath the heading text.
 *
 *   (i)  About the Tour
 *        A sacred pilgrimage to the four revered Dhams …
 *
 * The icon is decorative: the heading already says what the section
 * is, so it is hidden from screen readers.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LucideProps } from 'lucide-react-native';

import { Colors, Spacing, Typography } from '@theme';

type Props = {
  Icon: React.ComponentType<LucideProps>;
  title: string;
  children?: React.ReactNode;
};

const ICON = 26;
const TITLE_LINE = 28;

export const IconSection: React.FC<Props> = ({ Icon, title, children }) => (
  <View style={styles.row}>
    <View
      style={styles.icon}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Icon size={ICON} color={Colors.primaryDark} strokeWidth={2} />
    </View>

    <View style={styles.body}>
      <Text
        style={styles.title}
        accessibilityRole="header"
        maxFontSizeMultiplier={1.4}
      >
        {title}
      </Text>
      {children}
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  icon: {
    // Centres the icon on the heading's first line.
    marginTop: (TITLE_LINE - ICON) / 2,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.sm,
  },
  title: {
    ...Typography.h4,
    fontSize: 22,
    lineHeight: TITLE_LINE,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
});
