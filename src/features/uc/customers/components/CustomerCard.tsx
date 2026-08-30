import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Phone,
  Mail,
  Calendar,
  Briefcase,
  ChevronRight,
} from 'lucide-react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import type { Customer } from '../types';
import { avatarColorFor, initials } from '../utils/avatar';

type Props = { customer: Customer; onPress: (c: Customer) => void };

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export const CustomerCard: React.FC<Props> = ({ customer, onPress }) => {
  const c = avatarColorFor(customer.id);

  return (
    <Pressable
      onPress={() => onPress(customer)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.avatar, { backgroundColor: c.bg }]}>
        <Text style={[styles.avatarText, { color: c.fg }]}>
          {initials(customer.name)}
        </Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {customer.name}
        </Text>

        <View style={styles.metaRow}>
          <Phone size={13} color={Colors.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>
            {customer.phoneIndia}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Mail size={13} color={Colors.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>
            {customer.email}
          </Text>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.footerLeft}>
            <Calendar size={13} color={Colors.textSecondary} />
            <Text style={styles.footerText} numberOfLines={1}>
              {fmtDate(customer.createdAt)}
            </Text>
          </View>

          <View style={styles.sep} />

          <View style={styles.footerRight}>
            <Briefcase size={13} color={Colors.success} />
            <Text style={styles.tripsText} numberOfLines={1}>
              {customer.totalBookings} Trips
            </Text>
          </View>
        </View>
      </View>

      <ChevronRight size={20} color={Colors.textTertiary} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm + 4,
    marginBottom: Spacing.md,
    ...Shadows.xs,
  },
  pressed: { opacity: 0.85 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.body, fontWeight: '700' },
  body: { flex: 1, gap: 4 },
  name: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  tripsText: {
    ...Typography.bodySmall,
    color: Colors.success,
    fontWeight: '600',
  },
  sep: {
    width: 1,
    height: 12,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
});
