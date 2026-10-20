/**
 * ------------------------------------------------------------------
 * GreetingBlock — "Good morning, Admin 👋" + today's date card
 * ------------------------------------------------------------------
 *   Good morning, Admin 👋             ┌──────────────────┐
 *   Here's what's happening with       │ (📅)  11         │
 *   your business today.               │       Aug 2025   │
 *                                      │       Monday     │
 *                                      └──────────────────┘
 * Greeting and date come from the device clock (`now`), so they are
 * always today's, in the user's time zone. The date card is display
 * only — not a button.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CalendarCheck } from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';

import { dateCardParts, partOfDay } from '../utils/format';

type Props = {
  name: string;
  now: Date;
};

export const GreetingBlock: React.FC<Props> = ({ name, now }) => {
  const { day, monthYear, weekday } = dateCardParts(now);
  const greeting = `${partOfDay(now)}, ${name}`;

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text
          style={styles.hello}
          numberOfLines={2}
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
          <CalendarCheck size={20} color={Colors.success} strokeWidth={2.2} />
        </View>
        <View>
          <Text style={styles.dateDay}>{day}</Text>
          <Text style={styles.dateMonth}>{monthYear}</Text>
          <Text style={styles.dateWeekday}>{weekday}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
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

  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryWash,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryTint,
  },
  dateIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDay: {
    ...Typography.h5,
    lineHeight: 26,
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
