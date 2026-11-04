/**
 * ------------------------------------------------------------------
 * UpcomingTrips — next trips card on the UC dashboard
 * ------------------------------------------------------------------
 * Replaces "Recent Bookings". Approved design: option B, "mini trip
 * cards" — a smaller version of the Trips tab card (UcTripCard):
 *
 *   Upcoming Trips                                  View All >
 *   ┃┌──────────────────────────────────────────────┐
 *   ┃│ [⇆ One Way]                   TRP-D-0222-00326│
 *   ┃│ Goa  - - - - - - 🚗 - - - - - -  Surat         │
 *   ┃│ 📅 18 Nov 2026   🕑 02:37 AM                   │
 *   ┃│ ───────────────────────────────────────────── │
 *   ┃│ SUV · 6 Seater           Driver not assigned   │
 *   ┃└──────────────────────────────────────────────┘
 *    ↑ left edge in the "upcoming" colour (primaryDark)
 *
 * Rules:
 *   - No status badge: every row is an upcoming trip, and the
 *     Booked / Confirmed step is not shown here (product decision).
 *   - Driver: the name, or "Driver not assigned" in amber — the same
 *     rule and colour as UcTripCard for upcoming trips.
 *   - Vehicle text, date and time use the Trips tab helpers, so both
 *     screens always print them the same way.
 *   - Tapping a card does what "View details" does on the Trips tab.
 *   - Long city names wrap (max 2 lines) instead of being cut off.
 *
 * Colours (all from @theme; text pairs pass WCAG AA for small text):
 *   Trip type  textSecondary #6B7280 on backgroundTertiary #F2F4F7
 *   No driver  pendingDark #B45309 on white
 * ------------------------------------------------------------------
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, Car, ChevronRight, Clock } from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { getTripTypeOption } from '@features/customer/quotations/tripTypeOptions';
import { vehicleLine } from '@features/uc/trips/components/UcTripCard';
import {
  formatTripDate,
  formatTripTime,
} from '@features/uc/trips/utils/format';
import type { UcTripListItem } from '@features/uc/trips/types';

type Props = {
  items: readonly UcTripListItem[];
  onViewAll: () => void;
  onPressTrip: (trip: UcTripListItem) => void;
};

/** Dash count per side of the car; the row clips any overflow. */
const DASHES = 14;

export const UpcomingTrips: React.FC<Props> = ({
  items,
  onViewAll,
  onPressTrip,
}) => (
  <View style={styles.card}>
    <View style={styles.header}>
      <Text style={styles.title} accessibilityRole="header">
        Upcoming Trips
      </Text>
      <Pressable
        onPress={onViewAll}
        hitSlop={10}
        style={({ pressed }) => [styles.viewAll, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="View all upcoming trips"
      >
        <Text style={styles.viewAllText}>View All</Text>
        <ChevronRight size={16} color={Colors.primaryDark} strokeWidth={2.5} />
      </Pressable>
    </View>

    {items.length === 0 ? (
      <Text style={styles.empty}>No upcoming trips.</Text>
    ) : (
      <View style={styles.list}>
        {items.map(item => (
          <TripRow
            key={item.id}
            item={item}
            onPress={() => onPressTrip(item)}
          />
        ))}
      </View>
    )}
  </View>
);

/* ---------------- One trip ---------------- */

const TripRow: React.FC<{ item: UcTripListItem; onPress: () => void }> =
  React.memo(({ item, onPress }) => {
    const tripType = getTripTypeOption(item.tripType);
    const TripTypeIcon = tripType.Icon;
    const date = formatTripDate(item.scheduledAt);
    const time = formatTripTime(item.scheduledAt);
    const vehicle = vehicleLine(item.vehicleName, item.seatingCapacity);
    const driver = item.driverName?.trim() || null;

    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={
          `${tripType.label} trip ${item.tripRef}, ` +
          `${item.fromCity} to ${item.toCity}, ${date} at ${time}, ` +
          `${vehicle}, ${driver ? `driver ${driver}` : 'driver not assigned'}`
        }
        accessibilityHint="Opens trip details"
      >
        <View style={styles.head}>
          <View style={[styles.pill, styles.typePill]}>
            <TripTypeIcon
              size={12}
              color={Colors.textSecondary}
              strokeWidth={2.2}
            />
            <Text style={[styles.pillText, styles.typePillText]}>
              {tripType.label}
            </Text>
          </View>
          <Text style={styles.tripId} numberOfLines={1}>
            {item.tripRef}
          </Text>
        </View>

        <View style={styles.route}>
          <Text style={[styles.city, styles.cityFrom]} numberOfLines={2}>
            {item.fromCity}
          </Text>
          <DashedLine />
          <Car size={16} color={Colors.primaryDark} strokeWidth={2.2} />
          <DashedLine />
          <Text style={[styles.city, styles.cityTo]} numberOfLines={2}>
            {item.toCity}
          </Text>
        </View>

        <View style={styles.when}>
          <View style={styles.whenItem}>
            <Calendar size={13} color={Colors.textSecondary} strokeWidth={2} />
            <Text style={styles.whenText}>{date}</Text>
          </View>
          <View style={styles.whenItem}>
            <Clock size={13} color={Colors.textSecondary} strokeWidth={2} />
            <Text style={styles.whenText}>{time}</Text>
          </View>
        </View>

        <View style={styles.foot}>
          <Text style={styles.vehicle} numberOfLines={1}>
            {vehicle}
          </Text>
          <Text
            style={[styles.driver, !driver && styles.noDriver]}
            numberOfLines={1}
          >
            {driver ?? 'Driver not assigned'}
          </Text>
        </View>
      </Pressable>
    );
  });
TripRow.displayName = 'UpcomingTripRow';

/**
 * Dashed line drawn with small views: `borderStyle: 'dashed'` on one
 * side of a view renders unreliably on Android and iOS (same approach
 * as UcTripCard).
 */
const DashedLine: React.FC = () => (
  <View style={styles.dashes} importantForAccessibility="no-hide-descendants">
    {Array.from({ length: DASHES }, (_, i) => (
      <View key={i} style={styles.dash} />
    ))}
  </View>
);

/* ---------------- Styles ---------------- */

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
    marginBottom: Spacing.md,
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
  list: { gap: Spacing.sm },

  row: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primaryDark,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
    marginBottom: Spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  pillText: { fontSize: 11, fontWeight: '700' },
  typePill: { backgroundColor: Colors.backgroundTertiary },
  typePillText: { color: Colors.textSecondary, fontWeight: '600' },
  tripId: {
    marginLeft: 'auto',
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  route: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  city: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '700',
    maxWidth: '38%',
  },
  cityFrom: { textAlign: 'left' },
  cityTo: { textAlign: 'right' },
  dashes: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    overflow: 'hidden',
    minWidth: 12,
  },
  dash: {
    width: 4,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.border,
  },

  when: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  whenItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  whenText: { ...Typography.caption, color: Colors.textSecondary },

  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.sm,
  },
  vehicle: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '600',
    flexShrink: 1,
  },
  driver: {
    ...Typography.caption,
    color: Colors.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
  },
  noDriver: { color: Colors.pendingDark, fontWeight: '600' },
});
