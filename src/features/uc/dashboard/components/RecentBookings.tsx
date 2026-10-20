/**
 * ------------------------------------------------------------------
 * RecentBookings — latest bookings card on the UC dashboard
 * ------------------------------------------------------------------
 *   Recent Bookings                               View All >
 *   (RS)  Rahul Sharma        • Connaught Place     ₹1,250    >
 *         #UC12345            ↓                    [Upcoming]
 *         📅 01 Aug 2025 • 10:30 AM  • Gurugram
 *
 * Status pill colours come from BOOKING_STATUS_VISUAL
 * (features/shared/bookings): the same as the Customer bookings
 * screen. Each row is one button. Long place names and the date wrap
 * instead of being cut off on narrow phones.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowDown, Calendar, ChevronRight } from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { BOOKING_STATUS_VISUAL, isBookingStatus } from '@shared/bookings';

import { avatarColorFor, initials } from '../../customers/utils/avatar';
import type { RecentBooking } from '../types';
import { formatBookingDateTime } from '../utils/format';

type Props = {
  items: readonly RecentBooking[];
  onViewAll: () => void;
  onPressBooking: (id: string) => void;
};

export const RecentBookings: React.FC<Props> = ({
  items,
  onViewAll,
  onPressBooking,
}) => (
  <View style={styles.card}>
    <View style={styles.header}>
      <Text style={styles.title} accessibilityRole="header">
        Recent Bookings
      </Text>
      <Pressable
        onPress={onViewAll}
        hitSlop={10}
        style={({ pressed }) => [styles.viewAll, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="View all bookings"
      >
        <Text style={styles.viewAllText}>View All</Text>
        <ChevronRight size={16} color={Colors.primaryDark} strokeWidth={2.5} />
      </Pressable>
    </View>

    {items.length === 0 ? (
      <Text style={styles.empty}>No bookings yet.</Text>
    ) : (
      items.map((item, idx) => (
        <React.Fragment key={item.id}>
          {idx > 0 ? <View style={styles.divider} /> : null}
          <BookingRow item={item} onPress={() => onPressBooking(item.id)} />
        </React.Fragment>
      ))
    )}
  </View>
);

const BookingRow: React.FC<{ item: RecentBooking; onPress: () => void }> = ({
  item,
  onPress,
}) => {
  const avatar = avatarColorFor(item.id);
  // A status this app version doesn't know shows no pill (no crash).
  const status = isBookingStatus(item.status)
    ? BOOKING_STATUS_VISUAL[item.status]
    : null;
  const when = formatBookingDateTime(item.pickupAt);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={[
        item.customerName,
        `booking ${item.id}`,
        when,
        `from ${item.pickup} to ${item.drop}`,
        item.fare,
        status?.label,
      ]
        .filter(Boolean)
        .join(', ')}
      accessibilityHint="Opens booking details"
    >
      <View style={[styles.avatar, { backgroundColor: avatar.bg }]}>
        <Text style={[styles.avatarText, { color: avatar.fg }]}>
          {initials(item.customerName)}
        </Text>
      </View>

      <View style={styles.customerCol}>
        <Text style={styles.name} numberOfLines={1}>
          {item.customerName}
        </Text>
        <Text style={styles.meta}>#{item.id}</Text>
        <View style={styles.whenRow}>
          <Calendar size={12} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.meta}>{when}</Text>
        </View>
      </View>

      <View style={styles.routeCol}>
        <View style={styles.place}>
          <View style={[styles.dot, styles.dotPickup]} />
          <Text style={styles.placeText} numberOfLines={2}>
            {item.pickup}
          </Text>
        </View>
        <ArrowDown
          size={12}
          color={Colors.textTertiary}
          style={styles.routeArrow}
        />
        <View style={styles.place}>
          <View style={[styles.dot, styles.dotDrop]} />
          <Text style={styles.placeText} numberOfLines={2}>
            {item.drop}
          </Text>
        </View>
      </View>

      <View style={styles.rightCol}>
        <Text style={styles.fare}>{item.fare}</Text>
        {status ? (
          <View style={[styles.pill, { backgroundColor: status.bg }]}>
            <Text style={[styles.pillText, { color: status.fg }]}>
              {status.label}
            </Text>
          </View>
        ) : null}
      </View>

      <ChevronRight size={16} color={Colors.textTertiary} strokeWidth={2.2} />
    </Pressable>
  );
};

const AVATAR = 44;

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.title,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  /* primaryDark on white: 5.1:1 (primary would be 2.8:1). */
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText: {
    ...Typography.body,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  pressed: { opacity: 0.7 },
  empty: {
    ...Typography.body,
    color: Colors.textSecondary,
    paddingVertical: Spacing.lg,
    textAlign: 'center',
  },
  divider: { height: 1, backgroundColor: Colors.divider },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.body, fontWeight: '800' },

  customerCol: { flex: 1.2, minWidth: 0, gap: 2 },
  name: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  meta: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  whenRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },

  routeCol: { flex: 1, minWidth: 0 },
  place: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotPickup: { backgroundColor: Colors.success },
  dotDrop: { backgroundColor: Colors.error },
  placeText: {
    ...Typography.caption,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  routeArrow: { marginLeft: -2, marginVertical: 1 },

  rightCol: { alignItems: 'flex-end', gap: 6 },
  fare: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  pill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  pillText: { ...Typography.caption, fontSize: 11, fontWeight: '700' },
});
