/**
 * ------------------------------------------------------------------
 * BookingCard
 * ------------------------------------------------------------------
 * One row in the Customer Bookings list. Two-tone card: a status-
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
 *   │ [           View Details           ]                   │
 *   └───────────────────────────────────────────────────────┘
 *
 * What the card shows, and where it comes from:
 *   status, trip type   item.status, item.tripType
 *   booking id          item.bookingNumber (tap the icon to copy)
 *   dates + days        item.travelDate – item.endDate, and the
 *                       inclusive day count (utils/tripDates), the
 *                       same count Booking Details shows
 *   cities              from → to; with ONE city between them when a
 *                       trip starts and ends in the same city
 *                       (utils/route, item.viaCity)
 *   passengers, vehicle item.passengers, item.vehicleModel ??
 *                       item.vehicleType, item.seater
 *   price               item.totalAmount
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
  Users,
} from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { getTripTypeOption } from '@features/customer/quotations';
import {
  BOOKING_STATUS_VISUAL,
  type BookingStatusVisual,
} from '@shared/bookings';
import type { BookingStatus, CustomerBookingListItem } from '../types';
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
};

const STATUS_STYLE: Record<BookingStatus, StatusStyle> = {
  upcoming: {
    ...BOOKING_STATUS_VISUAL.upcoming,
    cardBg: '#EAF7EE', // green hero (unchanged)
    cardBorder: '#C8EBD3',
  },
  ongoing: {
    ...BOOKING_STATUS_VISUAL.ongoing,
    cardBg: '#F0F8FE', // blue wash
    cardBorder: '#CBE6F7',
  },
  completed: {
    ...BOOKING_STATUS_VISUAL.completed,
    // Neutral slate rather than green: Upcoming already owns the green
    // wash, and two green cards side by side are hard to tell apart.
    cardBg: '#F6F7F9',
    cardBorder: '#E1E4E9',
  },
  cancelled: {
    ...BOOKING_STATUS_VISUAL.cancelled,
    cardBg: '#FEF6F6', // red wash (same as expired quotations)
    cardBorder: '#FAD5D5',
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

type Props = {
  item: CustomerBookingListItem;
  onPress: () => void;
  onViewDetails: () => void;
  onModifyBooking: () => void;
  onTrackVehicle: () => void;
  onBookAgain: () => void;
};

export const BookingCard: React.FC<Props> = ({
  item,
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

  /* -------- Copy Booking ID --------
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
      Clipboard.setString(item.bookingNumber);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 1500);
    },
    [item.bookingNumber],
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
      accessibilityLabel={`Booking ${item.bookingNumber}, ${style.label}, ${
        tripType.label
      }, ${cities.join(' to ')}, ${startDate} to ${endDate}, ${days}`}
    >
      {/* Inner view clips the tinted band to the rounded corners; the
          Pressable itself can't (overflow would also clip its shadow
          on iOS). */}
      <View style={styles.clip}>
        {/* Header band — status pill + trip type | booking id */}
        <View style={[styles.header, { backgroundColor: style.cardBg }]}>
          <View style={styles.tagsRow}>
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
            <Text style={styles.idLabel}>Booking ID</Text>
            <View style={styles.idRow}>
              <Text style={styles.idValue}>{item.bookingNumber}</Text>
              <Pressable
                onPress={onCopyId}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.copyBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Copy booking ID ${item.bookingNumber}`}
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
          {/* Dates | days | price. */}
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
            <View style={styles.vDivider} />
            <View style={styles.amountCol}>
              <Text style={styles.amount}>
                {formatRupees(item.totalAmount)}
              </Text>
              <Text style={styles.amountLabel}>Total Amount</Text>
            </View>
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

          {/* Bottom actions — status-specific pairing */}
          <View style={styles.actionsRow}>
            {renderActions({
              status: item.status,
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
  onViewDetails: () => void;
  onModifyBooking: () => void;
  onTrackVehicle: () => void;
  onBookAgain: () => void;
}): React.ReactNode {
  switch (a.status) {
    case 'upcoming':
      return (
        <ActionButton
          label="View Details"
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
            label="View Details"
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
            label="View Details"
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
            label="View Details"
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
