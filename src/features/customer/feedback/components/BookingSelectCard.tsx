/**
 * ------------------------------------------------------------------
 * BookingSelectCard
 * ------------------------------------------------------------------
 * One row in the "Select a Booking" list on CustomerFeedbackScreen.
 * Layout:
 *
 *   ┌──────────────────────────────────────────────────────┐
 *   │ Delhi  →  Jaipur              [Completed pill]       │
 *   │ 📅 15 Sep · 👥 20 Passengers  [Give Feedback  →]     │
 *   │ Tempo Traveller | AC                                 │
 *   └──────────────────────────────────────────────────────┘
 *
 * The whole card AND the per-row "Give Feedback" CTA both fire the
 * same `onGiveFeedback` — larger tap target, no confusion about
 * which spot to press. Both routes push GiveFeedbackScreen with
 * the bookingId; there's no local selection state any more, so the
 * card is a stateless pressable rather than a two-mode component.
 *
 * Vehicle imagery is a text summary until real photos are wired
 * (same treatment as BookingCard elsewhere in the app).
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
  onGiveFeedback: () => void;
};

export const BookingSelectCard: React.FC<Props> = ({
  item,
  onGiveFeedback,
}) => {
  return (
    <Pressable
      onPress={onGiveFeedback}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Give feedback for ${item.from} to ${
        item.to
      } on ${formatDate(item.travelDate)}`}
    >
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
        {/*
          The card itself is pressable, so this CTA is a visual
          affordance — nothing more. Using a nested Pressable with
          `pointerEvents='none'` keeps the tap on the parent so we
          never fire the handler twice; on iOS a nested Pressable
          also fires (bubbling), which we don't want here.
        */}
        <View
          style={styles.ctaBtn}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
        >
          <Text style={styles.ctaBtnText}>Give Feedback</Text>
          <ArrowRight size={14} color={Colors.primary} strokeWidth={2.5} />
        </View>
      </View>
    </Pressable>
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
    justifyContent: 'space-between',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
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
