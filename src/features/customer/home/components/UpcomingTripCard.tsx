/**
 * ------------------------------------------------------------------
 * UpcomingTripCard
 * ------------------------------------------------------------------
 * Shows the customer's next trip below the "Upcoming Trip" section
 * header. Green design, laid out for a portrait phone:
 *
 *   ┌▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀┐ ← green stripe
 *   │ ┌──────┐ [📅 12 May 2026]        [✓ CONFIRMED]     │
 *   │ │ car  │ [Trip ID: TRP-2026-0847 ⧉]                │
 *   │ └──────┘ Delhi → Agra                              │
 *   │          📅 12 May 2026 – 15 May 2026 | ◷ 5 Days   │
 *   │ ┌────────────────────────────────────────────────┐ │
 *   │ │ 🚗 Toyota Innova Crysta                        │ │
 *   │ │    White · UP16AB1234                          │ │
 *   │ │ 👥 2 Passengers | ≈ 233 km | ≈ 4 hr 30 min     │ │
 *   │ └────────────────────────────────────────────────┘ │
 *   │ ┌────────────────────────────────────────────────┐ │
 *   │ │ (👤) Driver Assigned ✓                         │ │
 *   │ │      Amit Kumar · 📞 +91 98765 43210           │ │
 *   │ │ ────────────────────────────────────────────── │ │
 *   │ │ 📅 Driver Available                            │ │
 *   │ │    Reporting: 12 May 2026, 1:30 PM             │ │
 *   │ └────────────────────────────────────────────────┘ │
 *   │ 📍 Pickup: Delhi (2:30 PM, 12 May 2026)            │
 *   │ 📍 Drop: Agra (Expected: 7:00 PM)                  │
 *   │                                    [View Trip  →]  │
 *   └────────────────────────────────────────────────────┘
 *
 * DATA RULES
 *   - Everything shown is sent by the backend; nothing is computed
 *     here. `durationDays` is the billed day count, not counted from
 *     the dates (same rule as the quotation card).
 *   - Every optional field (vehicle colour / plate, distance, drive
 *     time, driver, reporting time, expected drop) hides its own
 *     item when absent — the card never prints a placeholder such as
 *     "≈ 0 km". A panel with nothing to show is not rendered.
 *   - Until a driver is assigned, `driverDetailsNote` (when present)
 *     is shown in place of the driver block.
 *
 * TAPS
 *   Only "View Trip" opens the trip. The copy icon copies the trip
 *   number and flashes a ✓ for 1.5 s (same pattern as the quotation
 *   card).
 *
 * The vehicle "image" is a placeholder tile (car icon on light green)
 * until real assets arrive. `vehicleImageUrl` on the type already
 * carries the value; swap the tile for `<Image source={...}>` then.
 * The driver avatar is an icon for the same reason.
 * ------------------------------------------------------------------ */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  ArrowRight,
  Calendar,
  CalendarCheck,
  Car,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  MapPin,
  Phone,
  Timer,
  User,
  Users,
} from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import {
  UPCOMING_STATUS_COLOR,
  UPCOMING_STATUS_LABEL,
  type UpcomingTrip,
} from '../types';
import { fmtDistanceKm, fmtEstimatedDuration } from '../utils/tripFormat';

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

const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export const UpcomingTripCard: React.FC<Props> = ({ trip, onViewPress }) => {
  const statusColor = UPCOMING_STATUS_COLOR[trip.status];
  const isConfirmed = trip.status === 'confirmed';

  const dateRange = `${fmtDate(trip.scheduledAt)} – ${fmtDate(
    trip.travelEndDate,
  )}`;
  const days = plural(trip.durationDays, 'Day', 'Days');
  const passengers = plural(trip.passengerCount, 'Passenger', 'Passengers');

  const vehicleDetail =
    [trip.vehicleColor, trip.vehicleRegNo].filter(Boolean).join(' · ') || null;
  const distance = fmtDistanceKm(trip.distanceKm);
  const duration = fmtEstimatedDuration(trip.estimatedDurationMinutes);

  /* -------- Copy trip number -------- */
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    [],
  );

  const onCopy = useCallback(() => {
    Clipboard.setString(trip.tripNumber);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 1500);
  }, [trip.tripNumber]);

  const hasDriverPanel =
    Boolean(trip.driver) ||
    Boolean(trip.driverDetailsNote) ||
    Boolean(trip.driverReportingAt);

  return (
    <View style={styles.card}>
      {/* Green stripe along the top edge. */}
      <View style={styles.stripe} />

      <View style={styles.inner}>
        {/* ── Header: tile + date/status/id/route/range ─────── */}
        <View style={styles.header}>
          <View style={styles.imageWrap}>
            <View style={styles.imageDisc}>
              <Car size={30} color={Colors.primaryDark} strokeWidth={1.8} />
            </View>
          </View>

          <View style={styles.headerBody}>
            {/* Date pill (left) + status pill (right). Wraps on very
                narrow screens instead of overlapping. */}
            <View style={styles.badgeRow}>
              <View style={[styles.chip, styles.chipDate]}>
                <Calendar
                  size={12}
                  color={Colors.primaryDark}
                  strokeWidth={2.4}
                />
                <Text style={[styles.chipText, styles.chipTextDate]}>
                  {fmtDate(trip.scheduledAt)}
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

            {/* Trip ID + copy */}
            <View style={styles.idPill}>
              <Text style={styles.idText} numberOfLines={1}>
                Trip ID: {trip.tripNumber}
              </Text>
              <Pressable
                onPress={onCopy}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={
                  copied ? 'Trip ID copied' : `Copy trip ID ${trip.tripNumber}`
                }
                style={({ pressed }) => pressed && styles.pressed}
              >
                {copied ? (
                  <Check size={14} color={Colors.primaryDark} strokeWidth={3} />
                ) : (
                  <Copy size={14} color={Colors.textTertiary} strokeWidth={2} />
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── Route ─────────────────────────────────────────── */}
        <View
          style={styles.routeRow}
          accessible
          accessibilityLabel={`${trip.fromCity} to ${trip.toCity}`}
        >
          <Text style={styles.city} numberOfLines={1}>
            {trip.fromCity}
          </Text>
          <ArrowRight size={20} color={Colors.primaryDark} strokeWidth={2.4} />
          <Text style={styles.city} numberOfLines={1}>
            {trip.toCity}
          </Text>
        </View>

        {/* ── Date range | days ─────────────────────────────── */}
        <View style={styles.rangeRow}>
          <View style={styles.inline}>
            <Calendar size={14} color={Colors.textSecondary} strokeWidth={2} />
            <Text style={styles.rangeText}>{dateRange}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.inline}>
            <Clock size={14} color={Colors.textSecondary} strokeWidth={2} />
            <Text style={styles.rangeText}>{days}</Text>
          </View>
        </View>

        {/* ── Vehicle + trip stats panel ────────────────────── */}
        <View style={styles.panel}>
          <View style={styles.vehicleRow}>
            <Car size={20} color={Colors.primaryDark} strokeWidth={2} />
            <View style={styles.flexShrink}>
              <Text style={styles.vehicleName} numberOfLines={1}>
                {trip.vehicleName}
              </Text>
              {vehicleDetail ? (
                <Text style={styles.subText} numberOfLines={1}>
                  {vehicleDetail}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Users size={16} color={Colors.primaryDark} strokeWidth={2} />
              <Text style={styles.statStrong}>{passengers}</Text>
            </View>
            {distance ? (
              <>
                <View style={styles.divider} />
                <View style={styles.stat}>
                  <MapPin
                    size={16}
                    color={Colors.primaryDark}
                    strokeWidth={2}
                  />
                  <View>
                    <Text style={styles.statStrong}>{distance}</Text>
                    <Text style={styles.subText}>(One Way)</Text>
                  </View>
                </View>
              </>
            ) : null}
            {duration ? (
              <>
                <View style={styles.divider} />
                <View style={styles.stat}>
                  <Timer size={16} color={Colors.primaryDark} strokeWidth={2} />
                  <View>
                    <Text style={styles.statStrong}>{duration}</Text>
                    <Text style={styles.subText}>(Estimated)</Text>
                  </View>
                </View>
              </>
            ) : null}
          </View>
        </View>

        {/* ── Driver panel ──────────────────────────────────── */}
        {hasDriverPanel ? (
          <View style={styles.panel}>
            {trip.driver ? (
              <View style={styles.driverRow}>
                <View style={styles.avatar}>
                  <User size={22} color={Colors.primaryDark} strokeWidth={2} />
                </View>
                <View style={styles.flexShrink}>
                  <View style={styles.inline}>
                    <Text style={styles.driverLabel}>Driver Assigned</Text>
                    <CheckCircle2
                      size={15}
                      color={Colors.success}
                      strokeWidth={2.4}
                    />
                  </View>
                  <Text style={styles.driverName} numberOfLines={1}>
                    {trip.driver.name}
                  </Text>
                  <View style={styles.inline}>
                    <Phone
                      size={13}
                      color={Colors.textSecondary}
                      strokeWidth={2}
                    />
                    <Text style={styles.driverPhone}>{trip.driver.phone}</Text>
                  </View>
                </View>
              </View>
            ) : trip.driverDetailsNote ? (
              <View style={styles.driverRow}>
                <User size={14} color={Colors.textSecondary} strokeWidth={2} />
                <Text style={[styles.subText, styles.flexShrink]}>
                  {trip.driverDetailsNote}
                </Text>
              </View>
            ) : null}

            {trip.driverReportingAt ? (
              <>
                {trip.driver || trip.driverDetailsNote ? (
                  <View style={styles.panelRule} />
                ) : null}
                <View style={styles.driverRow}>
                  <CalendarCheck
                    size={22}
                    color={Colors.primaryDark}
                    strokeWidth={2}
                  />
                  <View style={styles.flexShrink}>
                    <Text style={styles.driverLabel}>Driver Available</Text>
                    <Text style={styles.subText}>
                      Reporting: {fmtDate(trip.driverReportingAt)},{' '}
                      {fmtTime(trip.driverReportingAt)}
                    </Text>
                  </View>
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        {/* ── Pickup / drop ─────────────────────────────────── */}
        <View style={styles.stopsBlock}>
          <View style={styles.stopRow}>
            <MapPin size={16} color={Colors.primaryDark} strokeWidth={2.2} />
            <Text style={[styles.stopText, styles.flexShrink]}>
              <Text style={styles.stopLabel}>Pickup: </Text>
              {trip.fromCity} ({fmtTime(trip.scheduledAt)},{' '}
              {fmtDate(trip.scheduledAt)})
            </Text>
          </View>
          <View style={styles.stopRow}>
            <MapPin size={16} color={Colors.primaryDark} strokeWidth={2.2} />
            <Text style={[styles.stopText, styles.flexShrink]}>
              <Text style={styles.stopLabel}>Drop: </Text>
              {trip.toCity}
              {trip.expectedDropAt
                ? ` (Expected: ${fmtTime(trip.expectedDropAt)})`
                : ''}
            </Text>
          </View>
        </View>

        {/* ── CTA ───────────────────────────────────────────── */}
        <Pressable
          onPress={onViewPress}
          accessibilityRole="button"
          accessibilityLabel={`View trip, ${trip.fromCity} to ${trip.toCity}`}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>View Trip</Text>
          <ArrowRight
            size={18}
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
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.greenWashBorder,
    overflow: 'hidden',
    ...Shadows.xs,
  },
  stripe: {
    height: 5,
    backgroundColor: Colors.primary,
  },
  inner: {
    padding: Spacing.md,
    gap: Spacing.sm + 2,
  },
  pressed: { opacity: 0.85 },
  flexShrink: { flexShrink: 1 },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  imageWrap: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryTint,
  },
  imageDisc: {
    width: 52,
    height: 52,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.greenWash,
  },
  headerBody: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.sm,
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
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  chipDate: { backgroundColor: Colors.primaryTint },
  chipText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  chipTextDate: { color: Colors.primaryDark, letterSpacing: 0 },
  idPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  idText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    flexShrink: 1,
  },

  /* Route + range */
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  city: {
    ...Typography.h2,
    flexShrink: 1,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  rangeText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
  },

  /* Panels */
  panel: {
    padding: Spacing.sm + 2,
    gap: Spacing.sm + 2,
    borderRadius: Radius.md,
    backgroundColor: Colors.greenWash,
  },
  panelRule: {
    height: 1,
    backgroundColor: Colors.greenWashBorder,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  vehicleName: {
    ...Typography.body,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  subText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: Spacing.sm,
    columnGap: Spacing.sm,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statStrong: {
    ...Typography.bodySmall,
    fontWeight: '800',
    color: Colors.textPrimary,
  },

  /* Driver */
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryTint,
  },
  driverLabel: {
    ...Typography.bodySmall,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  driverName: {
    ...Typography.body,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  driverPhone: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
  },

  /* Stops */
  stopsBlock: {
    gap: Spacing.xs + 2,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  stopText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  stopLabel: {
    fontWeight: '800',
    color: Colors.textPrimary,
  },

  /* CTA */
  cta: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.lg,
  },
  ctaText: {
    ...Typography.body,
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textOnPrimary,
  },
});
