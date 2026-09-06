/**
 * ------------------------------------------------------------------
 * UpcomingTripCard
 * ------------------------------------------------------------------
 * Shows the customer's next trip below the "Upcoming Trip" section
 * header:
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ [TOMORROW]                                    [CONFIRMED] │
 *   │ ┌────────────┐  Delhi → Agra                              │
 *   │ │  vehicle   │  🕐 8:00 AM · 13 May 2025                   │
 *   │ │   image    │  🚐 Toyota Innova Crysta                    │
 *   │ │            │  👤 Driver details available tomorrow      │
 *   │ └────────────┘                                            │
 *   │              [        View Trip          ›        ]       │
 *   └──────────────────────────────────────────────────────────┘
 *
 * The vehicle "image" is a coloured placeholder tile in v1. When a
 * real asset URL is available (either a bundled asset or a CDN URL
 * from backend), the placeholder swaps for `<Image source={...}>`.
 * The `vehicleImageUrl` field on the type already carries the value.
 *
 * The [TOMORROW] pill is calendar-day-relative ("TODAY" / "TOMORROW"
 * / formatted date beyond that) — see `fmtRelativeDay` below. The
 * driver-details row only renders when `driverDetailsNote` is set on
 * the trip; omitted entirely otherwise (not blanked out).
 * ------------------------------------------------------------------ */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  Car,
  User,
} from 'lucide-react-native';

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

/** Calendar-day-aware relative label: "TODAY" / "TOMORROW" for the
 * next two days, otherwise the formatted date. Compares calendar
 * days (not 24h windows) so a trip at 12:01 AM tomorrow still reads
 * "TOMORROW" rather than falling through to a raw date. */
const startOfDay = (d: Date): number =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const fmtRelativeDay = (iso: string): string => {
  const target = startOfDay(new Date(iso));
  const today = startOfDay(new Date());
  const diffDays = Math.round((target - today) / 86_400_000);

  if (diffDays === 0) return 'TODAY';
  if (diffDays === 1) return 'TOMORROW';
  return fmtDate(iso).toUpperCase();
};

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export const UpcomingTripCard: React.FC<Props> = ({ trip, onViewPress }) => {
  const statusColor = UPCOMING_STATUS_COLOR[trip.status];

  return (
    <View style={styles.card}>
      {/* Badge row — relative day (left) + trip status (right). Sits
          above the image/body row so both pills stay legible even on
          narrow screens where the image crowds the body column. */}
      <View style={styles.badgeRow}>
        <View style={[styles.chip, styles.chipDay]}>
          <Text style={[styles.chipText, styles.chipTextDay]}>
            {fmtRelativeDay(trip.scheduledAt)}
          </Text>
        </View>
        <View style={[styles.chip, { backgroundColor: statusColor.bg }]}>
          <Text style={[styles.chipText, { color: statusColor.fg }]}>
            {UPCOMING_STATUS_LABEL[trip.status]}
          </Text>
        </View>
      </View>

      <View style={styles.mainRow}>
        {/* Vehicle image placeholder. Swap for <Image> when real assets
            arrive — see file header. */}
        <View style={styles.imageWrap}>
          <View style={styles.imagePlaceholder}>
            <Car size={36} color={Colors.textSecondary} strokeWidth={1.6} />
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>
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
              {fmtTime(trip.scheduledAt)} · {fmtDate(trip.scheduledAt)}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Car size={13} color={Colors.textSecondary} strokeWidth={2} />
            <Text style={styles.metaText} numberOfLines={1}>
              {trip.vehicleName}
            </Text>
          </View>
          {trip.driverDetailsNote ? (
            <View style={styles.metaRow}>
              <User size={13} color={Colors.textSecondary} strokeWidth={2} />
              <Text style={styles.metaText} numberOfLines={1}>
                {trip.driverDetailsNote}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* CTA — full-width, sits below the image/body row. */}
      <Pressable
        onPress={onViewPress}
        accessibilityRole="button"
        accessibilityLabel="View trip"
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
      >
        <Text style={styles.ctaText}>View Trip</Text>
        <ChevronRight
          size={16}
          color={Colors.textOnPrimary}
          strokeWidth={2.4}
        />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },

  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  mainRow: {
    flexDirection: 'row',
    gap: Spacing.md,
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
    justifyContent: 'center',
  },

  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  chipDay: { backgroundColor: '#DCFCE7' },
  chipText: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  chipTextDay: { color: Colors.success },

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    ...Shadows.xs,
  },
  ctaText: {
    ...Typography.body,
    color: Colors.textOnPrimary,
    fontWeight: '800',
    fontSize: 14,
  },
  pressed: { opacity: 0.85 },
});
