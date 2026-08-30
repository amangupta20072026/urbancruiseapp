/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowDown } from 'lucide-react-native';
import {
  Colors,
  Dimensions,
  Radius,
  Shadows,
  Spacing,
  Typography,
} from '@theme';
import type { BookingStatus, RecentBooking } from '../types';

const statusStyle: Record<BookingStatus, { bg: string; fg: string }> = {
  Completed: { bg: '#E7F7EC', fg: Colors.success },
  Ongoing: { bg: '#E6F0FE', fg: '#2563EB' },
  Scheduled: { bg: '#FFF3D6', fg: Colors.warning },
  Cancelled: { bg: '#FDECEC', fg: Colors.error },
};

const initials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

const BookingRow: React.FC<{ item: RecentBooking }> = ({ item }) => {
  const s = statusStyle[item.status];
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(item.customerName)}</Text>
      </View>
      <View style={styles.customerCol}>
        <Text style={styles.name}>{item.customerName}</Text>
        <Text style={styles.meta}>
          #{item.id} • {item.time}
        </Text>
      </View>
      <View style={styles.routeCol}>
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: Colors.success }]} />
          <Text style={styles.routeText} numberOfLines={1}>
            {item.pickup}
          </Text>
        </View>
        <ArrowDown
          size={12}
          color={Colors.textTertiary}
          style={{ marginLeft: 3 }}
        />
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: Colors.error }]} />
          <Text style={styles.routeText} numberOfLines={1}>
            {item.drop}
          </Text>
        </View>
      </View>
      <View style={styles.rightCol}>
        <Text style={styles.fare}>{item.fare}</Text>
        <View style={[styles.badge, { backgroundColor: s.bg }]}>
          <Text style={[styles.badgeText, { color: s.fg }]}>{item.status}</Text>
        </View>
      </View>
    </View>
  );
};

type Props = { items: RecentBooking[]; onViewAll?: () => void };

export const RecentBookings: React.FC<Props> = ({ items, onViewAll }) => (
  <View style={styles.card}>
    <View style={styles.header}>
      <Text style={styles.title}>Recent Bookings</Text>
      <Pressable onPress={onViewAll} hitSlop={8}>
        <Text style={styles.link}>View All</Text>
      </Pressable>
    </View>
    {items.map((it, idx) => (
      <React.Fragment key={it.id}>
        <BookingRow item={it} />
        {idx < items.length - 1 ? <View style={styles.divider} /> : null}
      </React.Fragment>
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: { ...Typography.h5, color: Colors.textPrimary },
  link: { ...Typography.bodySmall, color: Colors.primary, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  avatar: {
    width: Dimensions.avatarMd,
    height: Dimensions.avatarMd,
    borderRadius: Dimensions.avatarMd / 2,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.label,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  customerCol: { width: 110 },
  name: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  meta: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  routeCol: { flex: 1 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  routeText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  rightCol: { alignItems: 'flex-end', gap: 4 },
  fare: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  badgeText: { ...Typography.caption, fontWeight: '600' },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.xs,
  },
});
