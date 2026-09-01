import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { Colors, Radius, Spacing, Typography } from '@theme';

/**
 * GreetingBlock — big greeting on the left, date "card" on the right.
 * Matches the reference mock: bold "Good morning, {name} 👋", muted
 * caption underneath, and a right-aligned framed date with day-number
 * / month-year / weekday stacked.
 */

const partsOfDay = (d: Date) => {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

type Props = {
  name: string;
  dateISO: string;
  onPickDate?: () => void;
};

export const GreetingBlock: React.FC<Props> = ({
  name,
  dateISO,
  onPickDate,
}) => {
  const date = new Date(dateISO);
  const day = date.toLocaleDateString('en-GB', { day: '2-digit' });
  const monthYear = date.toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
  });
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' });

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.hello} numberOfLines={1} adjustsFontSizeToFit>
          {partsOfDay(date)}, {name} 👋
        </Text>
        <Text style={styles.sub}>
          Here's what's happening with your business today.
        </Text>
      </View>

      <Pressable
        onPress={onPickDate}
        style={styles.datePill}
        accessibilityRole="button"
        accessibilityLabel="Change date"
      >
        <View style={styles.dateTextCol}>
          <Text style={styles.dateDay}>{day}</Text>
          <Text style={styles.dateMonth}>{monthYear}</Text>
          <Text style={styles.dateWeekday}>{weekday}</Text>
        </View>
        <View style={styles.calWrap}>
          <Calendar size={16} color={Colors.textSecondary} />
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  left: { flex: 1 },
  hello: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  sub: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  dateTextCol: {
    alignItems: 'flex-end',
  },
  dateDay: {
    ...Typography.h4,
    color: Colors.primary,
    fontWeight: '800',
    lineHeight: 22,
  },
  dateMonth: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: -1,
  },
  dateWeekday: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  calWrap: {
    width: 20,
    alignItems: 'center',
  },
});
