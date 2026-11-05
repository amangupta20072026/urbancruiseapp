/**
 * ------------------------------------------------------------------
 * DateCard — today's date chip beside the dashboard greeting
 * ------------------------------------------------------------------
 *   ┌──────────────┐
 *   │ (📅) 11      │
 *   │      Aug 2025│
 *   │      Mon     │
 *   └──────────────┘
 *
 * Shared by the UC and Vendor dashboard greetings, so both show the
 * date the same way. The date comes from the device clock (`now`),
 * so it is always today's, in the user's time zone. Display only —
 * not a button. Compact on purpose: every point it gives up goes to
 * the greeting beside it. Screen readers get the full weekday.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CalendarCheck } from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';

import { dateCardParts } from '../utils/format';

type Props = {
  now: Date;
};

export const DateCard: React.FC<Props> = ({ now }) => {
  const { day, monthYear, weekdayShort, weekday } = dateCardParts(now);

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`Today, ${weekday} ${day} ${monthYear}`}
    >
      <View style={styles.icon}>
        <CalendarCheck size={16} color={Colors.success} strokeWidth={2.2} />
      </View>
      <View>
        <Text style={styles.day}>{day}</Text>
        <Text style={styles.month}>{monthYear}</Text>
        <Text style={styles.weekday}>{weekdayShort}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
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
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: {
    ...Typography.title,
    lineHeight: 22,
    color: Colors.success,
    fontWeight: '800',
  },
  month: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  weekday: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
});
