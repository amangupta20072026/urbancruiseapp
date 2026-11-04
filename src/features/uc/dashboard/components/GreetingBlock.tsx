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
import { CalendarCheck } from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';

import { dateCardParts } from '../utils/format';
import { ucGreetingLine } from '../utils/salutation';

type Props = {
  name: string;
  /** Text sent by the backend, e.g. 'Jai Shree Ram'. Blank → default. */
  salutation?: string | null;
  now: Date;
};

export const GreetingBlock: React.FC<Props> = ({ name, salutation, now }) => {
  const { day, monthYear, weekdayShort, weekday } = dateCardParts(now);
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

      <View
        style={styles.dateCard}
        accessible
        accessibilityLabel={`Today, ${weekday} ${day} ${monthYear}`}
      >
        <View style={styles.dateIcon}>
          <CalendarCheck size={16} color={Colors.success} strokeWidth={2.2} />
        </View>
        <View>
          <Text style={styles.dateDay}>{day}</Text>
          <Text style={styles.dateMonth}>{monthYear}</Text>
          <Text style={styles.dateWeekday}>{weekdayShort}</Text>
        </View>
      </View>
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

  /* Compact on purpose: every point it gives up goes to the greeting. */
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    backgroundColor: Colors.primaryWash,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primaryTint,
  },
  dateIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDay: {
    ...Typography.title,
    lineHeight: 22,
    color: Colors.success,
    fontWeight: '800',
  },
  dateMonth: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  dateWeekday: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
});
