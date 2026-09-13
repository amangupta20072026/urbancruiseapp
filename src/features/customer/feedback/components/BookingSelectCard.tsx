/**
 * ------------------------------------------------------------------
 * BookingSelectCard
 * ------------------------------------------------------------------
 * One row in the "Select a Booking" list on the Feedback screen.
 * Layout:
 *
 *   ┌──────────────────────────────────────────────────────┐
 *   │ ┌────┐  Delhi  →  Jaipur         [Completed pill]   │
 *   │ │ 🚌 │  📅 15 Sep · 👥 20 Passengers                │
 *   │ │    │  Tempo Traveller | AC     [Give Feedback]    │
 *   │ └────┘                                               │
 *   └──────────────────────────────────────────────────────┘
 *
 * The "Give Feedback" CTA is per-row (not global) so the user can
 * see each option and pick the trip they want to rate. Selecting a
 * card sets `selectedBookingId` in the screen state; the "Rate Your
 * Experience" section below reflects that selection.
 *
 * Vehicle imagery falls back to a lucide glyph inside a tinted tile
 * until real photos are wired (same treatment as BookingCard).
 * ------------------------------------------------------------------
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, Calendar, Users } from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import type { CompletedBookingSummary } from '../types';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

type Props = {
  item: CompletedBookingSummary;
  selected: boolean;
  onSelect: () => void;
};

export const BookingSelectCard: React.FC<Props> = ({
  item,
  selected,
  onSelect,
}) => {
  return (
    <View style={[styles.card, selected && styles.cardSelected]}>
      <View style={styles.body}>
        <View style={styles.routeRow}>
          <Text style={styles.routeText} numberOfLines={1}>
            {item.from}
          </Text>
          <ArrowRight
            size={16}
            color={Colors.textSecondary}
            strokeWidth={2.5}
          />
          <Text style={styles.routeText} numberOfLines={1}>
            {item.to}
          </Text>
        </View>

        <View style={styles.metaLine}>
          <Calendar size={12} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.metaText}>{formatDate(item.travelDate)}</Text>
        </View>

        <View style={styles.metaLine}>
          <Users size={12} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.metaText}>{item.passengers} Passengers</Text>
        </View>

        <Text style={styles.vehicleText}>
          {item.vehicleModel ?? item.vehicleType}
          {item.hasAC ? ' | AC' : ''}
        </Text>
      </View>

      <View style={styles.right}>
        <View style={styles.completedPill}>
          <Text style={styles.completedPillText}>Completed</Text>
        </View>
        <Pressable
          onPress={onSelect}
          style={({ pressed }) => [styles.ctaBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityLabel={
            selected
              ? `Selected trip ${item.from} to ${item.to}`
              : `Give feedback for ${item.from} to ${item.to}`
          }
        >
          <Text style={styles.ctaBtnText}>Give Feedback</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
    ...Shadows.xs,
  },
  cardSelected: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
    backgroundColor: Colors.primaryTint,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  routeText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '800',
    flexShrink: 1,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    includeFontPadding: false,
  },
  vehicleText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
    includeFontPadding: false,
  },
  right: {
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  completedPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryTint,
  },
  completedPillText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
    includeFontPadding: false,
  },
  ctaBtn: {
    height: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnText: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
