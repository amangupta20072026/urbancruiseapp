/**
 * ------------------------------------------------------------------
 * UpcomingTripCard
 * ------------------------------------------------------------------
 * Shows the customer's next trip below the "Upcoming Trip" section
 * header:
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ ┌────────────┐  [CONFIRMED]                              │
 *   │ │            │  Delhi → Agra                             │
 *   │ │  vehicle   │  📅 12 May 2026 · 9:00 AM                  │
 *   │ │   image    │  🚐 Toyota Innova Crysta                   │
 *   │ │            │                                            │
 *   │ └────────────┘                              [ View Trip ] │
 *   └──────────────────────────────────────────────────────────┘
 *
 * The vehicle "image" is a coloured placeholder tile in v1. When a
 * real asset URL is available (either a bundled asset or a CDN URL
 * from backend), the placeholder swaps for `<Image source={...}>`.
 * The `vehicleImageUrl` field on the type already carries the value.
 * ------------------------------------------------------------------ */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, Calendar, ChevronRight, Car } from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import {
  UPCOMING_STATUS_COLOR,
  UPCOMING_STATUS_LABEL,
  type UpcomingTrip,
} from '../types';

type Props = {
  trip: UpcomingTrip;
  onViewPress: () => void;
};

/* ------------------------------------------------------------------ */
/* Formatters                                                         */
/* ------------------------------------------------------------------ */

const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const fmtTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export const UpcomingTripCard: React.FC<Props> = ({ trip, onViewPress }) => {
  const statusColor = UPCOMING_STATUS_COLOR[trip.status];

  return (
    <View style={styles.card}>
      {/* Vehicle image placeholder. Swap for <Image> when real assets
          arrive — see file header. */}
      <View style={styles.imageWrap}>
        <View style={styles.imagePlaceholder}>
          <Car size={36} color={Colors.textSecondary} strokeWidth={1.6} />
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Status chip */}
        <View style={[styles.chip, { backgroundColor: statusColor.bg }]}>
          <Text style={[styles.chipText, { color: statusColor.fg }]}>
            {UPCOMING_STATUS_LABEL[trip.status]}
          </Text>
        </View>

        {/* Route */}
        <View style={styles.routeRow}>
          <Text style={styles.city} numberOfLines={1}>
            {trip.fromCity}
          </Text>
          <ArrowRight size={16} color={Colors.success} strokeWidth={2.4} />
          <Text style={styles.city} numberOfLines={1}>
            {trip.toCity}
          </Text>
        </View>

        {/* Meta lines */}
        <View style={styles.metaRow}>
          <Calendar size={13} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.metaText} numberOfLines={1}>
            {fmtDate(trip.scheduledAt)} · {fmtTime(trip.scheduledAt)}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Car size={13} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.metaText} numberOfLines={1}>
            {trip.vehicleName}
          </Text>
        </View>

        {/* CTA */}
        <Pressable
          onPress={onViewPress}
          accessibilityRole="button"
          accessibilityLabel="View trip"
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>View Trip</Text>
          <ChevronRight
            size={14}
            color={Colors.textOnPrimary}
            strokeWidth={2.4}
          />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },

  imageWrap: {
    width: 100,
    aspectRatio: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundTertiary,
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: {
    flex: 1,
    gap: 4,
  },

  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginBottom: 2,
  },
  chipText: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  city: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '800',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  metaText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flexShrink: 1,
  },

  cta: {
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    ...Shadows.xs,
  },
  ctaText: {
    ...Typography.caption,
    color: Colors.textOnPrimary,
    fontWeight: '800',
    fontSize: 12,
  },
  pressed: { opacity: 0.85 },
});
