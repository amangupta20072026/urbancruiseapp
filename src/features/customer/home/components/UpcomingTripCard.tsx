/**
 * ------------------------------------------------------------------
 * UpcomingTripCard
 * ------------------------------------------------------------------
 * Shows the customer's next trip below the "Upcoming Trip" section
 * header. Gold-accented design ("B"):
 *
 *   ┌▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀┐ ← gold stripe
 *   │ ┌──────────┐ [TOMORROW]            [✓ CONFIRMED]   │
 *   │ │ vehicle  │ Delhi → Agra                          │
 *   │ │  photo   │ 🕐 2:30 PM · 12 May 2026              │
 *   │ │          │ 🚗 Toyota Innova Crysta               │
 *   │ └──────────┘ 👤 Driver details available tomorrow   │
 *   │                                      [View Trip ›] │
 *   └────────────────────────────────────────────────────┘
 *
 * COLOURS (brand palette)
 *   Gold (Colors.secondary) for the top stripe and the soft border;
 *   deep gold (Colors.secondaryDark) for the route arrow and the
 *   time / vehicle icons; the day pill is dark amber text on a light
 *   gold tint. The action stays brand green — green means "go" across
 *   the app. The status pill keeps its own colours
 *   (UPCOMING_STATUS_COLOR: confirmed green, pending amber, in
 *   progress blue); confirmed also gets a ✓.
 *
 * The vehicle "image" is a placeholder tile (car icon on light gold)
 * until real assets arrive. `vehicleImageUrl` on the type already
 * carries the value; swap the tile for `<Image source={...}>` then.
 *
 * The day pill is calendar-day-relative ("TODAY" / "TOMORROW" /
 * formatted date beyond that) — see `fmtRelativeDay` below. The
 * driver row only renders when `driverDetailsNote` is set, and shows
 * the full note (it wraps rather than being cut).
 * ------------------------------------------------------------------ */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ArrowRight,
  Car,
  Check,
  ChevronRight,
  Clock,
  User,
} from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import {
  UPCOMING_STATUS_COLOR,
  UPCOMING_STATUS_LABEL,
  type UpcomingTrip,
} from '../types';

/* Gold accents — brand gold family (Colors.secondary*). The tint and
 * pill pair are local: nothing else in the app uses these exact
 * shades. Day-pill text on its tint is ~6.4:1 (WCAG AA). */
const GOLD = Colors.secondary; // #F9A825 — stripe
const GOLD_DEEP = Colors.secondaryDark; // #F57F17 — arrow + icons
const GOLD_BORDER = '#F3E2B3';
const GOLD_TINT = '#FEF7DD'; // photo placeholder background
const DAY_PILL_BG = '#FEF3C7';
const DAY_PILL_FG = '#92400E';

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
  const isConfirmed = trip.status === 'confirmed';

  return (
    <View style={styles.card}>
      {/* Gold stripe along the top edge. */}
      <View style={styles.stripe} />

      <View style={styles.inner}>
        {/* Vehicle photo placeholder — see file header. */}
        <View style={styles.imageWrap}>
          <Car size={36} color={GOLD_DEEP} strokeWidth={1.6} />
        </View>

        <View style={styles.body}>
          {/* Day pill (left) + status pill (right). Wraps on very
              narrow screens instead of overlapping. */}
          <View style={styles.badgeRow}>
            <View style={[styles.chip, styles.chipDay]}>
              <Text style={[styles.chipText, styles.chipTextDay]}>
                {fmtRelativeDay(trip.scheduledAt)}
              </Text>
            </View>
            <View style={[styles.chip, { backgroundColor: statusColor.bg }]}>
              {isConfirmed ? (
                <Check size={11} color={statusColor.fg} strokeWidth={3} />
              ) : null}
              <Text style={[styles.chipText, { color: statusColor.fg }]}>
                {UPCOMING_STATUS_LABEL[trip.status]}
              </Text>
            </View>
          </View>

          {/* Route */}
          <View style={styles.routeRow}>
            <Text style={styles.city} numberOfLines={1}>
              {trip.fromCity}
            </Text>
            <ArrowRight size={16} color={GOLD_DEEP} strokeWidth={2.4} />
            <Text style={styles.city} numberOfLines={1}>
              {trip.toCity}
            </Text>
          </View>

          {/* Time · date, vehicle */}
          <View style={styles.metaRow}>
            <Clock size={13} color={GOLD_DEEP} strokeWidth={2.2} />
            <Text style={styles.metaText} numberOfLines={1}>
              {fmtTime(trip.scheduledAt)} · {fmtDate(trip.scheduledAt)}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Car size={13} color={GOLD_DEEP} strokeWidth={2.2} />
            <Text style={styles.metaText} numberOfLines={1}>
              {trip.vehicleName}
            </Text>
          </View>

          {/* Driver note — full text, grey; only when present. */}
          {trip.driverDetailsNote ? (
            <View style={[styles.metaRow, styles.driverRow]}>
              <User
                size={13}
                color={Colors.textSecondary}
                strokeWidth={2}
                style={styles.driverIcon}
              />
              <Text style={styles.driverText}>{trip.driverDetailsNote}</Text>
            </View>
          ) : null}

          {/* Compact green action, bottom right. */}
          <Pressable
            onPress={onViewPress}
            accessibilityRole="button"
            accessibilityLabel={`View trip, ${trip.fromCity} to ${trip.toCity}`}
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          >
            <Text style={styles.ctaText}>View Trip</Text>
            <ChevronRight
              size={15}
              color={Colors.textOnPrimary}
              strokeWidth={2.4}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    overflow: 'hidden',
    ...Shadows.xs,
  },
  stripe: {
    height: 5,
    backgroundColor: GOLD,
  },
  inner: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },

  imageWrap: {
    width: 96,
    height: 96,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GOLD_TINT,
  },

  body: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },

  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.xs + 2,
  },
  chipDay: { backgroundColor: DAY_PILL_BG },
  chipText: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  chipTextDay: { color: DAY_PILL_FG },

  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.xs,
  },
  city: {
    ...Typography.body,
    flexShrink: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '800',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  driverRow: {
    alignItems: 'flex-start',
  },
  driverIcon: {
    marginTop: 3,
  },
  driverText: {
    ...Typography.caption,
    flex: 1,
    lineHeight: 17,
    color: Colors.textSecondary,
  },

  cta: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: Spacing.xs,
    paddingVertical: 7,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm + 2,
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.md,
  },
  ctaText: {
    ...Typography.label,
    color: Colors.textOnPrimary,
    fontWeight: '800',
  },
  pressed: { opacity: 0.85 },
});
