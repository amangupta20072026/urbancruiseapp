import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Calendar, ChevronDown } from 'lucide-react-native';
import { Colors, Dimensions, Radius, Spacing, Typography } from '@theme';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

type Props = { name: string; dateISO: string; onPickDate?: () => void };

export const GreetingBlock: React.FC<Props> = ({
  name,
  dateISO,
  onPickDate,
}) => (
  <View style={styles.row}>
    <View style={styles.left}>
      <Text style={styles.eyebrow}>SIGNED IN</Text>
      <Text style={styles.hello} numberOfLines={1} adjustsFontSizeToFit>
        Hello, {name} 👋
      </Text>
      <Text style={styles.sub}>Here's what's happening today.</Text>
    </View>
    <Pressable onPress={onPickDate} style={styles.pill}>
      <Calendar size={Dimensions.iconSm} color={Colors.iconSecondary} />
      <Text style={styles.pillText}>{fmtDate(dateISO)}</Text>
      <ChevronDown size={Dimensions.iconSm} color={Colors.iconSecondary} />
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  left: { flex: 1 },
  eyebrow: { ...Typography.label, color: Colors.primary, letterSpacing: 0.6 },
  hello: { ...Typography.h3, color: Colors.textPrimary, marginTop: Spacing.xs },
  sub: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs, // was Spacing.sm
    paddingHorizontal: Spacing.sm, // was Spacing.md
    paddingVertical: 6, // was Spacing.sm
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillText: {
    fontSize: 12, // was Typography.bodySmall (14)
    color: Colors.textPrimary,
    fontWeight: '600',
  },
});
