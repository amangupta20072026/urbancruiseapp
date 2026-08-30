/**
 * ------------------------------------------------------------------
 * HistoryTripCard
 * ------------------------------------------------------------------
 * One row of trip history. Optimised for FlashList — memoised with a
 * strict prop comparator (React.memo), no anonymous inline closures.
 *
 * Layout (portrait phone):
 *
 *   ┌────────────────────────────────────────────────────────┐
 *   │  ● Completed · BKG-2508-482913           ★ 4.5         │
 *   │                                                        │
 *   │  Mumbai (BKC)                                          │
 *   │       ↓                                                │
 *   │  Pune (Koregaon Park)                                  │
 *   │                                                        │
 *   │  🚗 Sedan · MH-01-AB-1234 · Rakesh Yadav               │
 *   │  📅 22 Aug 2026 · 148 km · 3h 20m                       │
 *   │                                                        │
 *   │  ₹ 4,850  · Paid                                       │
 *   └────────────────────────────────────────────────────────┘
 *
 * Behaviour:
 *   - Not tappable in v1 (no trip-detail screen yet). If/when we
 *     add one, wrap the outer View in a Pressable and pipe onPress
 *     through props — no other structural change needed.
 *   - Distance / duration / driver are hidden per-status (see the
 *     `visibleFields` block below).
 * ------------------------------------------------------------------ */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Calendar,
  Car,
  MapPin,
  Star,
  User as UserIcon,
} from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { formatMoney } from '@app-types/currency';

import {
  TRIP_PAYMENT_LABEL,
  TRIP_STATUS_COLOR,
  TRIP_STATUS_LABEL,
  type Trip,
} from '../types';

type Props = {
  trip: Trip;
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

const fmtDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

const fmtDistance = (km: number): string => `${km} km`;

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

const HistoryTripCardImpl: React.FC<Props> = ({ trip }) => {
  const statusColor = TRIP_STATUS_COLOR[trip.status];

  /* Which meta lines to show — driven by status. `upcoming` trips
   * usually don't have driver/vehicle assigned yet; `cancelled` /
   * `no_show` have no drive metrics. This avoids rendering hollow
   * "N/A" fields. */
  const showDriveMetrics =
    trip.status === 'completed' || trip.status === 'in_progress';
  const showVehicleDetails = trip.status !== 'upcoming';

  return (
    <View style={styles.card}>
      {/* ---------- Header row: status + booking ref (+ rating) ---------- */}
      <View style={styles.headerRow}>
        <View style={[styles.statusChip, { backgroundColor: statusColor.bg }]}>
          <View
            style={[styles.statusDot, { backgroundColor: statusColor.fg }]}
          />
          <Text style={[styles.statusText, { color: statusColor.fg }]}>
            {TRIP_STATUS_LABEL[trip.status]}
          </Text>
        </View>
        <Text style={styles.bookingRef} numberOfLines={1}>
          {trip.bookingRef}
        </Text>

        {typeof trip.rating === 'number' ? (
          <View style={styles.ratingWrap}>
            <Star
              size={13}
              color={Colors.warning}
              fill={Colors.warning}
              strokeWidth={0}
            />
            <Text style={styles.ratingText}>{trip.rating.toFixed(1)}</Text>
          </View>
        ) : null}
      </View>

      {/* ---------- Route ---------- */}
      <View style={styles.routeWrap}>
        <RouteLine city={trip.fromCity} location={trip.fromLocation} isOrigin />
        <View style={styles.routeConnector}>
          <View style={styles.routeConnectorLine} />
        </View>
        <RouteLine city={trip.toCity} location={trip.toLocation} />
      </View>

      {/* ---------- Meta: vehicle + drive metrics ---------- */}
      {showVehicleDetails ? (
        <View style={styles.metaRow}>
          <Car size={13} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.metaText} numberOfLines={1}>
            {[trip.vehicleType, trip.vehicleNumber].filter(Boolean).join(' · ')}
          </Text>
        </View>
      ) : null}

      {trip.driverName ? (
        <View style={styles.metaRow}>
          <UserIcon size={13} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.metaText} numberOfLines={1}>
            {trip.driverName}
          </Text>
        </View>
      ) : null}

      <View style={styles.metaRow}>
        <Calendar size={13} color={Colors.textSecondary} strokeWidth={2} />
        <Text style={styles.metaText} numberOfLines={1}>
          {fmtDate(trip.scheduledAt)}
          {showDriveMetrics && trip.distanceKm !== null
            ? ` · ${fmtDistance(trip.distanceKm)}`
            : ''}
          {showDriveMetrics && trip.durationMinutes !== null
            ? ` · ${fmtDuration(trip.durationMinutes)}`
            : ''}
        </Text>
      </View>

      {/* ---------- Footer: amount + payment status ---------- */}
      <View style={styles.footerRow}>
        <Text style={styles.amount}>{formatMoney(trip.amount)}</Text>
        <View style={styles.footerSep} />
        <Text style={styles.paymentText}>
          {TRIP_PAYMENT_LABEL[trip.paymentStatus]}
        </Text>
      </View>
    </View>
  );
};

/* React.memo — trip records are immutable from the row's POV.
 * A referential-equality check on `trip` is enough because the parent
 * flattens pages via useMemo, so refs are stable across renders. */
export const HistoryTripCard = React.memo(HistoryTripCardImpl);
HistoryTripCard.displayName = 'HistoryTripCard';

/* ---------------- Sub-components ---------------- */

const RouteLine: React.FC<{
  city: string;
  location?: string;
  isOrigin?: boolean;
}> = ({ city, location, isOrigin }) => (
  <View style={styles.routeLine}>
    <View
      style={[
        styles.routePin,
        isOrigin ? styles.routePinOrigin : styles.routePinDest,
      ]}
    >
      <MapPin size={11} color={Colors.textInverse} strokeWidth={2.4} />
    </View>
    <Text style={styles.routeCity} numberOfLines={1}>
      {city}
      {location ? (
        <Text style={styles.routeLocation}>{` · ${location}`}</Text>
      ) : null}
    </Text>
  </View>
);

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.xs,
  },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  bookingRef: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
    fontSize: 11,
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },

  /* Route */
  routeWrap: {
    marginVertical: Spacing.sm,
    gap: 2,
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  routePin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routePinOrigin: {
    backgroundColor: Colors.success,
  },
  routePinDest: {
    backgroundColor: Colors.error,
  },
  routeConnector: {
    marginLeft: 11 - 1, // half of pin - half of line width, so line sits on pin centre
    height: 12,
    alignItems: 'flex-start',
  },
  routeConnectorLine: {
    width: 2,
    height: 12,
    backgroundColor: Colors.border,
    borderRadius: 1,
  },
  routeCity: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  routeLocation: {
    color: Colors.textSecondary,
    fontWeight: '400',
  },

  /* Meta */
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flex: 1,
  },

  /* Footer */
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  amount: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  footerSep: {
    width: 1,
    height: 12,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  paymentText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
