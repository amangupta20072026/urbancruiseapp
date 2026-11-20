/**
 * ------------------------------------------------------------------
 * UpcomingTripCard
 * ------------------------------------------------------------------
 * Shows the customer's next trip below the "Upcoming Trip" section
 * header. Green design, laid out for a portrait phone:
 *
 *   ┌▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀┐ ← green stripe
 *   │ [📅 12 May 2026]          [Trip ID: TRP-2026-0847 ⧉] │
 *   │ [✓ CONFIRMED] [✈ One Way]                            │
 *   │ Delhi → Agra                                         │
 *   │ 📅 12 May 2026 – 15 May 2026 | ◷ 5 Days             │
 *   │ ┌──────────────────────────────────────────────────┐ │
 *   │ │ 🚗 Toyota Innova  │  👥   │   📍    │    ⏱       │ │
 *   │ │    White · UP16.. │ 2 Pax │ ≈233 km │ ≈4 hr 30   │ │
 *   │ └──────────────────────────────────────────────────┘ │
 *   │ ┌────────────────────────┐ │ 📅 Driver Reporting   │
 *   │ │ (👤) │ Driver Assigned ✓│ │    12 May 2026,       │
 *   │ │      │ Amit Kumar       │ │    1:30 PM            │
 *   │ │      │ 📞 +91 98765…    │ │                       │
 *   │ └────────────────────────┘ │                       │
 *   │ 📍 Pickup: Delhi (2:30 PM…) │ 📍 Drop: Agra (…)      │
 *   │ [            View Trip  →                         ]  │
 *   └──────────────────────────────────────────────────────┘
 *
 * TOP ROWS
 *   Always two rows, on every phone width:
 *     row 1 — travel date (left) · Trip ID + copy (right)
 *     row 2 — status · trip type (One Way / Round Trip / Pickup & Drop)
 *   The trip type pill uses the shared icon + label from
 *   quotations/tripTypeOptions.ts, same as the Home quotation card.
 *
 * NARROW SCREENS
 *   - Row 1 wraps the Trip ID pill under the date if both don't fit.
 *   - Stat columns share the width equally; long values wrap to two
 *     centred lines. The vehicle name and colour/plate wrap to two
 *     lines at most, then end with "…".
 *   - Pickup and Drop sit side by side and each wraps inside its own
 *     half.
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
 *     is shown in the left driver box instead of the driver.
 *   - When only one side of the driver row exists (driver box OR
 *     reporting time), it takes the full width and no divider shows.
 *
 * TAPS
 *   Only "View Trip" opens the trip. The copy icon copies the trip
 *   number and flashes a ✓ for 1.5 s (same pattern as the quotation
 *   card).
 *
 * The driver avatar is an icon until a real image arrives.
 * `vehicleImageUrl` is still on the type but this design no longer
 * shows a vehicle image.
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
  Route,
  Timer,
  User,
  Users,
} from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { getTripTypeOption } from '@features/customer/quotations/tripTypeOptions';
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
/* Small pieces                                                       */
/* ------------------------------------------------------------------ */

/** One equal-width column in the vehicle panel: icon above value. */
const StatColumn: React.FC<{
  icon: React.ReactNode;
  value: string;
  label: string;
}> = ({ icon, value, label }) => (
  <>
    <View style={styles.statDivider} />
    <View style={styles.statCol} accessible accessibilityLabel={label}>
      {icon}
      <Text style={styles.statValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  </>
);

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export const UpcomingTripCard: React.FC<Props> = ({ trip, onViewPress }) => {
  const statusColor = UPCOMING_STATUS_COLOR[trip.status];
  const isConfirmed = trip.status === 'confirmed';
  const tripType = getTripTypeOption(trip.tripType);
  const TripIcon = tripType.Icon;

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

  /* -------- Driver row parts -------- */
  const hasDriverBox = Boolean(trip.driver) || Boolean(trip.driverDetailsNote);
  const hasReporting = Boolean(trip.driverReportingAt);

  return (
    <View style={styles.card}>
      {/* Green stripe along the top edge. */}
      <View style={styles.stripe} />

      <View style={styles.inner}>
        {/* ── Row 1: date · trip ID ─────────────────────────── */}
        <View style={styles.pillRow}>
          <View style={[styles.pill, styles.pillDate]}>
            <Calendar size={14} color={Colors.primaryDark} strokeWidth={2.2} />
            <Text style={[styles.pillText, styles.pillTextDate]}>
              {fmtDate(trip.scheduledAt)}
            </Text>
          </View>

          <View style={[styles.pill, styles.pillId]}>
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

        {/* ── Row 2: status · trip type ─────────────────────── */}
        <View style={styles.statusRow}>
          <View style={[styles.pill, { backgroundColor: statusColor.bg }]}>
            {isConfirmed ? (
              <Check size={13} color={statusColor.fg} strokeWidth={3} />
            ) : null}
            <Text style={[styles.pillText, { color: statusColor.fg }]}>
              {UPCOMING_STATUS_LABEL[trip.status]}
            </Text>
          </View>
          <View
            style={[styles.pill, styles.pillTripType]}
            accessible
            accessibilityLabel={`Trip type ${tripType.label}`}
          >
            <TripIcon
              size={13}
              color={Colors.textSecondary}
              strokeWidth={2.2}
            />
            <Text style={[styles.pillText, styles.pillTextTripType]}>
              {tripType.label}
            </Text>
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
          <ArrowRight size={24} color={Colors.primaryDark} strokeWidth={2.6} />
          <Text style={styles.city} numberOfLines={1}>
            {trip.toCity}
          </Text>
        </View>

        {/* ── Date range | days ─────────────────────────────── */}
        <View style={styles.rangeRow}>
          <View style={styles.inline}>
            <Calendar size={15} color={Colors.textSecondary} strokeWidth={2} />
            <Text style={styles.rangeText}>{dateRange}</Text>
          </View>
          <View style={styles.rangeDivider} />
          <View style={styles.inline}>
            <Clock size={15} color={Colors.textSecondary} strokeWidth={2} />
            <Text style={styles.rangeText}>{days}</Text>
          </View>
        </View>

        {/* ── Vehicle panel: vehicle | pax | km | time ──────── */}
        <View style={styles.vehiclePanel}>
          <View style={styles.vehicleCol}>
            <Car size={24} color={Colors.primaryDark} strokeWidth={2} />
            <View style={styles.flexShrink}>
              <Text style={styles.vehicleName} numberOfLines={2}>
                {trip.vehicleName}
              </Text>
              {vehicleDetail ? (
                <Text style={styles.subText} numberOfLines={2}>
                  {vehicleDetail}
                </Text>
              ) : null}
            </View>
          </View>

          <StatColumn
            icon={
              <Users size={18} color={Colors.primaryDark} strokeWidth={2} />
            }
            value={passengers}
            label={passengers}
          />
          {distance ? (
            <StatColumn
              icon={
                <Route size={18} color={Colors.primaryDark} strokeWidth={2} />
              }
              value={distance}
              label={`Distance ${distance}`}
            />
          ) : null}
          {duration ? (
            <StatColumn
              icon={
                <Timer size={18} color={Colors.primaryDark} strokeWidth={2} />
              }
              value={duration}
              label={`Drive time ${duration}`}
            />
          ) : null}
        </View>

        {/* ── Driver row: driver box | reporting ────────────── */}
        {hasDriverBox || hasReporting ? (
          <View style={styles.driverRow}>
            {hasDriverBox ? (
              <View style={styles.driverBox}>
                {trip.driver ? (
                  <>
                    <View style={styles.avatar}>
                      <User
                        size={28}
                        color={Colors.primaryDark}
                        strokeWidth={1.8}
                      />
                    </View>
                    <View style={styles.boxRule} />
                    <View style={styles.flexShrink}>
                      <View style={styles.inline}>
                        <Text style={styles.greenLabel} numberOfLines={1}>
                          Driver Assigned
                        </Text>
                        <CheckCircle2
                          size={15}
                          color={Colors.primaryDark}
                          strokeWidth={2.4}
                        />
                      </View>
                      <Text style={styles.driverName} numberOfLines={1}>
                        {trip.driver.name}
                      </Text>
                      <View style={styles.inline}>
                        <Phone
                          size={13}
                          color={Colors.textPrimary}
                          strokeWidth={2}
                        />
                        <Text style={styles.driverPhone} numberOfLines={1}>
                          {trip.driver.phone}
                        </Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.avatar}>
                      <User
                        size={28}
                        color={Colors.textSecondary}
                        strokeWidth={1.8}
                      />
                    </View>
                    <Text style={[styles.subText, styles.flexShrink]}>
                      {trip.driverDetailsNote}
                    </Text>
                  </>
                )}
              </View>
            ) : null}

            {hasDriverBox && hasReporting ? (
              <View style={styles.driverDivider} />
            ) : null}

            {trip.driverReportingAt ? (
              <View style={styles.reportingCol}>
                <CalendarCheck
                  size={26}
                  color={Colors.primaryDark}
                  strokeWidth={2}
                />
                <View style={styles.flexShrink}>
                  <Text style={styles.greenLabel}>Driver Reporting</Text>
                  <Text style={styles.reportingText}>
                    {fmtDate(trip.driverReportingAt)},{' '}
                    {fmtTime(trip.driverReportingAt)}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── Pickup | Drop ─────────────────────────────────── */}
        <View style={styles.stopsRow}>
          <View style={styles.stopCol}>
            <MapPin size={16} color={Colors.primaryDark} strokeWidth={2.4} />
            <Text style={[styles.stopText, styles.flexShrink]}>
              <Text style={styles.stopLabel}>Pickup: </Text>
              {trip.fromCity} ({fmtTime(trip.scheduledAt)},{' '}
              {fmtDate(trip.scheduledAt)})
            </Text>
          </View>
          <View style={styles.stopDivider} />
          <View style={styles.stopCol}>
            <MapPin size={16} color={Colors.primaryDark} strokeWidth={2.4} />
            <Text style={[styles.stopText, styles.flexShrink]}>
              <Text style={styles.stopLabel}>Drop: </Text>
              {trip.toCity}
              {trip.expectedDropAt
                ? ` (Expected: ${fmtTime(trip.expectedDropAt)})`
                : ''}
            </Text>
          </View>
        </View>

        {/* ── CTA (full width) ──────────────────────────────── */}
        <Pressable
          onPress={onViewPress}
          accessibilityRole="button"
          accessibilityLabel={`View trip, ${trip.fromCity} to ${trip.toCity}`}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>View Trip</Text>
          <ArrowRight
            size={20}
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
    gap: Spacing.sm + 4,
  },
  pressed: { opacity: 0.85 },
  flexShrink: { flexShrink: 1 },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  /* Top pill row */
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
    marginTop: -(Spacing.xs + 2),
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  pillDate: { backgroundColor: Colors.primaryTint },
  pillId: {
    flexShrink: 1,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  pillText: {
    ...Typography.caption,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  pillTextDate: { color: Colors.primaryDark, letterSpacing: 0 },
  pillTripType: { backgroundColor: Colors.surfaceMuted },
  pillTextTripType: { color: Colors.textSecondary, letterSpacing: 0 },
  idText: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.textPrimary,
    flexShrink: 1,
  },

  /* Route + range */
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
  },
  city: {
    ...Typography.h1,
    flexShrink: 1,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm + 2,
  },
  rangeDivider: {
    width: 1,
    height: 18,
    backgroundColor: Colors.border,
  },
  rangeText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
  },

  /* Vehicle panel */
  vehiclePanel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.greenWash,
  },
  vehicleCol: {
    flex: 1.6,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingRight: Spacing.xs,
  },
  vehicleName: {
    ...Typography.bodySmall,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 2,
    backgroundColor: Colors.greenWashBorder,
  },
  statCol: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 4,
  },
  statValue: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },

  /* Driver row */
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  driverBox: {
    flex: 1.35,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm + 2,
    borderRadius: Radius.md,
    backgroundColor: Colors.greenWash,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.greenWashBorder,
  },
  boxRule: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: Colors.greenWashBorder,
  },
  driverDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: Spacing.sm,
    backgroundColor: Colors.border,
  },
  reportingCol: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  greenLabel: {
    ...Typography.bodySmall,
    fontWeight: '800',
    color: Colors.primaryDark,
    flexShrink: 1,
  },
  driverName: {
    ...Typography.body,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  driverPhone: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  reportingText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },

  /* Pickup | Drop */
  stopsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  stopCol: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  stopDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: Colors.border,
  },
  stopText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  stopLabel: {
    fontWeight: '800',
    color: Colors.textPrimary,
  },

  /* CTA */
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm + 2,
    paddingVertical: Spacing.md - 2,
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.lg,
  },
  ctaText: {
    ...Typography.body,
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textOnPrimary,
  },
});
