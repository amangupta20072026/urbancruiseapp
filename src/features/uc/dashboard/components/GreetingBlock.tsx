/**
 * ------------------------------------------------------------------
 * GreetingBlock — "Jai Mata Di, Admin 👋" + today's date card
 * ------------------------------------------------------------------
 *   Jai Mata Di, Admin 👋             ┌──────────────┐
 *   Here's what's happening with      │ (📅) 11      │
 *   your business today.              │      Aug 2025│
 *                                     │      Mon     │
 *                                     └──────────────┘
 *
 * UC ONLY: the greeting is the devotional salutation TEXT sent by the
 * backend (utils/salutation.ts) — not "Good morning / evening".
 * Customer home has its own GreetingBlock and keeps the time-based
 * greeting. The date comes from the device clock (`now`), so it is
 * always today's, in the user's time zone. The date card is display
 * only — not a button.
 *
 * The greeting stays on ONE line: the date card is kept compact,
 * and if the greeting still doesn't fit (a longer greeting or name)
 * its font shrinks to at most 75 %, then ends in "…". Screen readers
 * always get the full greeting.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '@theme';

import { ucGreetingLine } from '../utils/salutation';
import { DateCard } from './DateCard';

type Props = {
  name: string;
  /** Text sent by the backend, e.g. 'Jai Shree Ram'. Blank → default. */
  salutation?: string | null;
  now: Date;
};

export const GreetingBlock: React.FC<Props> = ({ name, salutation, now }) => {
  const greeting = ucGreetingLine(salutation, name);

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
          Here’s what’s happening with your business today.
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
