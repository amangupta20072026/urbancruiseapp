/**
 * ------------------------------------------------------------------
 * BookingCard
 * ------------------------------------------------------------------
 * One row in the Customer Bookings list (mode 'booking'), or one trip
 * on a booking's trips list (mode 'trip'). Two-tone card: a status-
 * tinted header band over a white body.
 *
 *   ┌───────────────────────────────────────────────────────┐
 *   │ [status pill] [trip type]    │          Booking ID    │  ← tinted band
 *   │                              │     BK-2026-001248  📋 │
 *   ├───────────────────────────────────────────────────────┤
 *   │ 📅 09 Nov 2026 – 12 Nov 2026 │ 📅 4 Days │  ₹30,000    │
 *   │ ───────────────────────────────────────── Total Amount │
 *   │ 📍 Mumbai  →  📍 Pune                                  │
 *   │ ───────────────────────────────────────────────────── │
 *   │ 👥 17 Passengers │ 🚌 Force Urbania (16 Seater)        │
 *   │ ───────────────────────────────────────────────────── │
 *   │  (upcoming only) BookingProgressTracker                │
 *   │ ───────────────────────────────────────────────────── │
 *   │ (2+ trips only) [+1 more trip]   Tap to see all 2 trips│
 *   │ [           View Details           ]                   │
 *   └───────────────────────────────────────────────────────┘
 *
 * MODES
 *   booking — the Bookings list. Shows the booking's FIRST trip (the
 *             `trip` prop), the Booking ID and the booking's full
 *             amount. With more than one trip it adds the "+N more
 *             trip" row and the main button reads "View All Trips".
 *   trip    — BookingTripsScreen. Shows one trip: a numbered badge,
 *             the Trip ID instead of the Booking ID, and no amount
 *             (the amount belongs to the booking).
 *
 * What the card shows, and where it comes from:
 *   status, trip type   trip.status, trip.tripType
 *   booking / trip id   mode.bookingNumber / trip.tripNumber (tap the
 *                       icon to copy)
 *   dates + days        trip.travelDate – trip.endDate, and the
 *                       inclusive day count (utils/tripDates), the
 *                       same count Booking Details shows
 *   cities              from → to; with ONE city between them when a
 *                       trip starts and ends in the same city
 *                       (utils/route, trip.viaCity)
 *   passengers, vehicle trip.passengers, trip.vehicleModel ??
 *                       trip.vehicleType, trip.seater
 *   price               mode.totalAmount (booking mode only)
 *
 * The pickup date and time are not on the card (they are on Booking
 * Details).
 *
 * Status drives:
 *   1. status pill (colour + label + icon)
 *   2. the header band + card border tint
 *   3. bottom action buttons (which ones + their colours)
 *   4. whether the progress tracker renders (upcoming only)
 * ------------------------------------------------------------------
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ArrowRight,
  Bus,
  Calendar,
  Check,
  Copy,
  Eye,
  MapPin,
  Navigation,
  RotateCw,
  Route,
  Users,
} from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { getTripTypeOption } from '@features/customer/quotations';
import {
  BOOKING_STATUS_VISUAL,
  type BookingStatusVisual,
} from '@shared/bookings';
import type { BookingStatus, CustomerBookingTrip } from '../types';
import { getRouteCities } from '../utils/route';
import {
  formatCardDate,
  formatTripDays,
  tripDayCount,
} from '../utils/tripDates';
import { BookingProgressTracker } from './BookingProgressTracker';

/* ================================================================
 * Status → visual mappings
 * ================================================================ */

type IconComp = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}>;

/**
 * Pill label, icon and colours come from BOOKING_STATUS_VISUAL
 * (features/shared/bookings), shared with every booking surface.
 * The header-band tint + card border stay here: only this card uses them.
 */
type StatusStyle = BookingStatusVisual & {
  /**
   * Header-band tint + card border, one per status. Lighter than the
   * pill's `bg` so the pill still stands out against the band; the
   * body below the band is always white.
   */
  cardBg: string;
  cardBorder: string;
  /**
   * Solid fill of the trip-number circle (trip mode), with white text.
   * Not the pill's `fg`: for Upcoming that is white (white text on a
   * green pill), which would draw a white number on a white circle.
   */
  badgeBg: string;
};

const STATUS_STYLE: Record<BookingStatus, StatusStyle> = {
  upcoming: {
    ...BOOKING_STATUS_VISUAL.upcoming,
    cardBg: '#EAF7EE', // green hero (unchanged)
    cardBorder: '#C8EBD3',
    badgeBg: Colors.primaryDark,
  },
  ongoing: {
    ...BOOKING_STATUS_VISUAL.ongoing,
    cardBg: '#F0F8FE', // blue wash
    cardBorder: '#CBE6F7',
    badgeBg: Colors.info,
  },
  completed: {
    ...BOOKING_STATUS_VISUAL.completed,
    // Neutral slate rather than green: Upcoming already owns the green
    // wash, and two green cards side by side are hard to tell apart.
    cardBg: '#F6F7F9',
    cardBorder: '#E1E4E9',
    badgeBg: Colors.primary,
  },
  cancelled: {
    ...BOOKING_STATUS_VISUAL.cancelled,
    cardBg: '#FEF6F6', // red wash (same as expired quotations)
    cardBorder: '#FAD5D5',
    badgeBg: Colors.error,
  },
};

/* ================================================================
 * Formatting helpers
 * ================================================================ */

/** ₹18,500 — Indian grouping. */
function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/** "1 Passenger" / "17 Passengers". */
function formatPassengers(n: number): string {
  return `${n} ${n === 1 ? 'Passenger' : 'Passengers'}`;
}

/**
 * Dynamically calculates the font size for the whole route row to ensure
 * it fits on one single line without wrapping or truncating (...).
 */
function getRouteFontSize(cities: readonly string[]): number {
  // Calculate total characters. We add ~4 chars per arrow/space gap between cities.
  const totalChars = cities.join('').length + (cities.length - 1) * 4;

  if (totalChars <= 15) return 24; // Very short (e.g., "Pune -> Mumbai")
  if (totalChars <= 22) return 20; // Standard (e.g., "Bengaluru -> Mysuru")
  if (totalChars <= 28) return 18; // Medium (e.g., "Mumbai -> Pune -> Mumbai")
  if (totalChars <= 34) return 16; // Long (e.g., "Mumbai -> Trimbakeshwar -> Mumbai")
  return 14; // Very long
}

/* ================================================================
 * Card
 * ================================================================ */

/** What the card is showing — see MODES in the header comment. */
export type BookingCardMode =
  | {
      kind: 'booking';
      bookingNumber: string;
      /** Full booking amount (all trips). */
      totalAmount: number;
      /** Number of trips in the booking (1 or more). */
      tripCount: number;
    }
  | {
      kind: 'trip';
      /** 1-based position of this trip in its booking. */
      position: number;
    };

type Props = {
  /** The trip to show. In booking mode: the booking's first trip. */
  trip: CustomerBookingTrip;
  mode: BookingCardMode;
  onPress: () => void;
  onViewDetails: () => void;
  onModifyBooking: () => void;
  onTrackVehicle: () => void;
  onBookAgain: () => void;
};

export const BookingCard: React.FC<Props> = ({
  trip: item,
  mode,
  onPress,
  onViewDetails,
  onModifyBooking,
  onTrackVehicle,
  onBookAgain,
}) => {
  const style = STATUS_STYLE[item.status];

  const tripType = getTripTypeOption(item.tripType);
  const TripIcon = tripType.Icon;
  const isUpcoming = item.status === 'upcoming';

  const cities = getRouteCities(item);
  const routeFontSize = getRouteFontSize(cities);

  const startDate = formatCardDate(item.travelDate);
  const endDate = formatCardDate(item.endDate);
  const days = formatTripDays(tripDayCount(item.travelDate, item.endDate));
  const vehicleName = item.vehicleModel ?? item.vehicleType;

  const isBooking = mode.kind === 'booking';
  const idLabel = isBooking ? 'Booking ID' : 'Trip ID';
  const idValue = isBooking ? mode.bookingNumber : item.tripNumber;
  /** Trips after the first (booking mode only); 0 hides the row. */
  const moreTrips = isBooking ? Math.max(0, mode.tripCount - 1) : 0;
  const viewLabel = moreTrips > 0 ? 'View All Trips' : 'View Details';

  /* -------- Copy Booking ID / Trip ID --------
   *
   * Same Clipboard + flash-checkmark pattern as QuotationCard.
   * `e.stopPropagation()` stops the tap from also firing the card's
   * own onPress, which would open the booking. */
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    [],
  );

  const onCopyId = useCallback(
    (e: GestureResponderEvent) => {
      e.stopPropagation();
      Clipboard.setString(idValue);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 1500);
    },
    [idValue],
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderColor: style.cardBorder },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${
        isBooking ? `Booking ${idValue}` : `Trip ${mode.position}, ${idValue}`
      }, ${style.label}, ${tripType.label}, ${cities.join(
        ' to ',
      )}, ${startDate} to ${endDate}, ${days}${
        moreTrips > 0 ? `, ${moreTrips + 1} trips` : ''
      }`}
    >
      {/* Inner view clips the tinted band to the rounded corners; the
          Pressable itself can't (overflow would also clip its shadow
          on iOS). */}
      <View style={styles.clip}>
        {/* Header band — (trip no.) status pill + trip type | id */}
        <View style={[styles.header, { backgroundColor: style.cardBg }]}>
          <View style={styles.tagsRow}>
            {mode.kind === 'trip' ? (
              <View style={[styles.tripNo, { backgroundColor: style.badgeBg }]}>
                <Text style={styles.tripNoText}>{mode.position}</Text>
              </View>
            ) : null}
            <View style={[styles.pill, { backgroundColor: style.bg }]}>
              <style.Icon size={12} color={style.fg} strokeWidth={2.5} />
              <Text style={[styles.pillText, { color: style.fg }]}>
                {style.label}
              </Text>
            </View>
            <View style={styles.tripTag}>
              <TripIcon
                size={12}
                color={Colors.textSecondary}
                strokeWidth={2.5}
              />
              <Text style={styles.tripTagText}>{tripType.label}</Text>
            </View>
          </View>
          <View
            style={[
              styles.headerDivider,
              { backgroundColor: style.cardBorder },
            ]}
          />
          <View style={styles.idBlock}>
            <Text style={styles.idLabel}>{idLabel}</Text>
            <View style={styles.idRow}>
              <Text style={styles.idValue}>{idValue}</Text>
              <Pressable
                onPress={onCopyId}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.copyBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Copy ${idLabel} ${idValue}`}
              >
                {copied ? (
                  <Check size={13} color={Colors.success} strokeWidth={2.5} />
                ) : (
                  <Copy size={13} color={Colors.textTertiary} strokeWidth={2} />
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>
          {/* Dates | days | price (booking mode only). */}
          <View style={styles.summaryRow}>
            <View style={styles.dateCell}>
              <Calendar
                size={16}
                color={Colors.textSecondary}
                strokeWidth={2}
              />
              <Text style={styles.dateText}>
                {startDate} – {endDate}
              </Text>
            </View>
            <View style={styles.vDivider} />
            <View style={styles.daysCell}>
              <Calendar
                size={16}
                color={Colors.textSecondary}
                strokeWidth={2}
              />
              <Text style={styles.daysText}>{days}</Text>
            </View>
            {isBooking ? (
              <>
                <View style={styles.vDivider} />
                <View style={styles.amountCol}>
                  <Text style={styles.amount}>
                    {formatRupees(mode.totalAmount)}
                  </Text>
                  <Text style={styles.amountLabel}>Total Amount</Text>
                </View>
              </>
            ) : null}
          </View>

          <View style={styles.hDivider} />

          {/* Cities — forced onto a single line with dynamic font sizing */}
          <View style={styles.routeRow}>
            {cities.map((city, i) => (
              <View key={`${i}-${city}`} style={styles.cityItem}>
                {i > 0 ? (
                  <ArrowRight
                    size={routeFontSize - 2} // Scale arrow slightly with text
                    color={Colors.textSecondary}
                    strokeWidth={2.5}
                  />
                ) : (
                  <MapPin
                    size={routeFontSize - 2}
                    color={Colors.primary}
                    strokeWidth={2.2}
                  />
                )}
                <Text
                  style={[
                    styles.cityText,
                    {
                      fontSize: routeFontSize,
                      lineHeight: routeFontSize * 1.2,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {city}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.hDivider} />

          {/* Passengers | vehicle */}
          <View style={styles.infoRow}>
            <View style={styles.paxCell}>
              <Users size={16} color={Colors.textSecondary} strokeWidth={2} />
              <Text style={styles.infoText}>
                {formatPassengers(item.passengers)}
              </Text>
            </View>
            <View style={styles.vDivider} />
            <View style={styles.vehicleCell}>
              <Bus size={16} color={Colors.textSecondary} strokeWidth={2} />
              <Text style={styles.infoText}>
                <Text style={styles.vehicleName}>{vehicleName}</Text>
                {item.seater ? (
                  <Text style={styles.vehicleSeater}>
                    {' '}
                    ({item.seater} Seater)
                  </Text>
                ) : null}
              </Text>
            </View>
          </View>

          {/* Progress tracker — upcoming only */}
          {isUpcoming ? (
            <>
              <View style={styles.hDivider} />
              <BookingProgressTracker currentStep={item.progressStep} />
            </>
          ) : null}

          {/* More trips — booking mode, 2+ trips only */}
          {moreTrips > 0 ? (
            <>
              <View style={styles.hDivider} />
              <View style={styles.moreTripsRow}>
                <View style={styles.moreTripsPill}>
                  <Route size={12} color={Colors.royal} strokeWidth={2.5} />
                  <Text style={styles.moreTripsPillText}>
                    +{moreTrips} more {moreTrips === 1 ? 'trip' : 'trips'}
                  </Text>
                </View>
                <Text style={styles.moreTripsHint}>
                  Tap to see all {moreTrips + 1} trips
                </Text>
              </View>
            </>
          ) : null}

          {/* Bottom actions — status-specific pairing */}
          <View style={styles.actionsRow}>
            {renderActions({
              status: item.status,
              viewLabel,
              onViewDetails,
              onModifyBooking,
              onTrackVehicle,
              onBookAgain,
            })}
          </View>
        </View>
      </View>
    </Pressable>
  );
};

/* ================================================================
 * Action-row renderer — one branch per status
 * ================================================================ */

function renderActions(a: {
  status: BookingStatus;
  /** "View Details", or "View All Trips" for a booking with 2+ trips. */
  viewLabel: string;
  onViewDetails: () => void;
  onModifyBooking: () => void;
  onTrackVehicle: () => void;
  onBookAgain: () => void;
}): React.ReactNode {
  switch (a.status) {
    case 'upcoming':
      return (
        <ActionButton
          label={a.viewLabel}
          variant="outline"
          LeadingIcon={Eye}
          onPress={a.onViewDetails}
        />
      );
    case 'ongoing':
      return (
        <>
          <ActionButton
            label="Track Vehicle"
            variant="info"
            LeadingIcon={Navigation}
            onPress={a.onTrackVehicle}
          />
          <ActionButton
            label={a.viewLabel}
            variant="secondary"
            LeadingIcon={Eye}
            onPress={a.onViewDetails}
          />
        </>
      );
    case 'completed':
      return (
        <>
          <ActionButton
            label={a.viewLabel}
            variant="secondary"
            LeadingIcon={Eye}
            onPress={a.onViewDetails}
          />
          <ActionButton
            label="Book Again"
            variant="successOutline"
            LeadingIcon={RotateCw}
            onPress={a.onBookAgain}
          />
        </>
      );
    case 'cancelled':
      return (
        <>
          <ActionButton
            label={a.viewLabel}
            variant="secondary"
            LeadingIcon={Eye}
            onPress={a.onViewDetails}
          />
          <ActionButton
            label="Book Again"
            variant="dangerOutline"
            LeadingIcon={RotateCw}
            onPress={a.onBookAgain}
          />
        </>
      );
  }
}

/* ================================================================
 * ActionButton — small variant-driven button
 * ================================================================ */

type ActionVariant =
  | 'primary'
  | 'outline'
  | 'outlineNeutral'
  | 'secondary'
  | 'info'
  | 'successOutline'
  | 'dangerOutline';

const ActionButton: React.FC<{
  label: string;
  variant: ActionVariant;
  LeadingIcon?: IconComp;
  onPress: () => void;
}> = ({ label, variant, LeadingIcon, onPress }) => {
  const paint = VARIANT[variant];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        {
          backgroundColor: paint.bg,
          borderColor: paint.border,
        },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
    >
      {LeadingIcon ? (
        <LeadingIcon size={14} color={paint.text} strokeWidth={2.5} />
      ) : null}
      <Text style={[styles.actionBtnText, { color: paint.text }]}>{label}</Text>
    </Pressable>
  );
};

const VARIANT: Record<
  ActionVariant,
  { bg: string; border: string; text: string }
> = {
  primary: {
    bg: Colors.primary,
    border: Colors.primary,
    text: Colors.textOnPrimary,
  },
  outline: {
    bg: Colors.surface,
    border: Colors.primary,
    text: Colors.primary,
  },
  outlineNeutral: {
    bg: Colors.surface,
    border: Colors.border,
    text: Colors.textPrimary,
  },
  secondary: {
    bg: Colors.surface,
    border: Colors.secondaryDark,
    text: Colors.secondaryDark,
  },
  info: {
    bg: Colors.surface,
    border: Colors.info,
    text: Colors.info,
  },
  successOutline: {
    bg: Colors.surface,
    border: Colors.primary,
    text: Colors.primary,
  },
  dangerOutline: {
    bg: Colors.surface,
    border: Colors.error,
    text: Colors.error,
  },
};

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    backgroundColor: Colors.surface,
    ...Shadows.xs,
  },
  clip: {
    borderRadius: Radius.lg - 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  tagsRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  pillText: {
    ...Typography.caption,
    fontWeight: '700',
    includeFontPadding: false,
  },
  tripNo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripNoText: {
    ...Typography.caption,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    color: Colors.textOnPrimary,
    includeFontPadding: false,
  },
  tripTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tripTagText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
    includeFontPadding: false,
  },
  headerDivider: {
    width: 1,
    alignSelf: 'stretch',
  },
  idBlock: {
    alignItems: 'flex-end',
    gap: 1,
  },
  idLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    includeFontPadding: false,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  copyBtn: {
    padding: 2,
  },
  idValue: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '700',
    includeFontPadding: false,
  },
  body: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  hDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  vDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dateCell: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '500',
    flexShrink: 1,
    includeFontPadding: false,
  },
  daysCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  daysText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '700',
    includeFontPadding: false,
  },
  amountCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  amount: {
    ...Typography.subtitle,
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 20,
    lineHeight: 24,
  },
  amountLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    includeFontPadding: false,
  },

  /* Cities */
  routeRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap', // Forces single line
    alignItems: 'center',
    columnGap: 6, // Slightly tighter gap
  },
  cityItem: {
    // Removed flexShrink so it doesn't try to truncate internally
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cityText: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
    // fontSize and lineHeight are overridden dynamically
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  paxCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehicleCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  vehicleName: {
    fontWeight: '700',
  },
  vehicleSeater: {
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  /* More trips */
  moreTripsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  moreTripsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: Colors.royalTint,
  },
  moreTripsPillText: {
    ...Typography.caption,
    color: Colors.royal,
    fontWeight: '700',
    includeFontPadding: false,
  },
  moreTripsHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
    includeFontPadding: false,
  },

  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 2,
  },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtnText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
