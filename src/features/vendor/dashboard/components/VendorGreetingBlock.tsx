/**
 * ------------------------------------------------------------------
 * VendorGreetingBlock — "Good morning, Rajesh! 👋" + today's date card
 * ------------------------------------------------------------------
 *   Good morning, Rajesh! 👋          ┌──────────────┐
 *   Here's an overview of your        │ (📅) 11      │
 *   business today.                   │      Aug 2025│
 *                                     │      Mon     │
 *                                     └──────────────┘
 *
 * Time-of-day greeting (shared getGreeting, same as Customer home).
 * The date card is the shared DateCard, same as the UC dashboard.
 *
 * The greeting stays on ONE line: if it doesn't fit (long name) its
 * font shrinks to at most 75 %, then ends in "…". Screen readers
 * always get the full greeting.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '@theme';
import { DateCard } from '@features/uc/dashboard/components/DateCard';

import { vendorGreetingLine } from '../utils/dashboard';

type Props = {
  name: string;
  now: Date;
};

export const VendorGreetingBlock: React.FC<Props> = ({ name, now }) => {
  const greeting = vendorGreetingLine(name, now);

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text
          style={styles.hello}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          accessibilityRole="header"
          accessibilityLabel={greeting}
        >
          {greeting} 👋
        </Text>
        <Text style={styles.sub}>
          Here’s an overview of your business today.
        </Text>
      </View>

      <DateCard now={now} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  left: { flex: 1, gap: Spacing.xs },
  hello: {
    ...Typography.h5,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  sub: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});
