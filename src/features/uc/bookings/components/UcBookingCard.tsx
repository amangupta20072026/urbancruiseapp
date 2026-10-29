/**
 * ------------------------------------------------------------------
 * UcBookingCard — one row on the UC Bookings tab
 * ------------------------------------------------------------------
 * Styled to match the Customer BookingCard
 * (features/customer/bookings/components/BookingCard.tsx), so a
 * booking looks the same to staff and to customers:
 *
 *   ┌───────────────────────────────────────────────────────┐
 *   │ [status pill] [trip type]                  Booking ID │
 *   │                                    BKG-2611-314687 📋 │
 *   │ Indore → Kolkata                         ₹12,740      │
 *   │                                         Total Amount  │
 *   │ 📅 12 Nov 2026   🕐 02:39 PM   👥 1 Passenger           │
 *   │ Luxury Sedan · 4 Seater                               │
 *   │ 👤 Priya Malhotra                         (UC only)   │
 *   │ ───────────────────────────────────────────────────── │
 *   │  Booked ✓── Confirmed ●── Trip Starts ○── Completed ○ │
 *   │ [              👁 View Details               ]        │
 *   └───────────────────────────────────────────────────────┘
 *
 * Same as the customer card:
 *   - Status pill colours come from the shared BOOKING_STATUS_VISUAL,
 *     and the whole card is tinted per status (same wash colours).
 *   - The trip type tag uses the same icon + label.
 *   - The progress tracker looks the same as the customer one
 *     (UcBookingCardTracker), but is shown on EVERY status so staff
 *     can see where each booking is, or where it stopped (red ✕).
 *   - View Details is a full-width outline button: green on upcoming
 *     cards, gold on every other status.
 *   - Tapping anywhere on the card also opens the booking.
 *
 * Different from the customer card:
 *   - A customer-name row (staff see every customer's bookings).
 *   - `no_show` status (UC only): amber pill and amber card wash.
 *   - Only one action (View Details). Customer-only actions such as
 *     Book Again and Track Vehicle are not shown here.
 *   - View Details has a ripple + tint press feedback, so a tap is
 *     clearly visible.
 *
 * `layout` is still accepted so BookingsScreen needn't change, but
 * the card has one layout for every screen width.
 *
 * FlashList notes:
 *   - Memoised; the screen keeps `item` refs and handlers stable.
 *   - FlashList RECYCLES rows, so the copied flag stores WHICH ref
 *     was copied, not a boolean — a recycled row can never inherit a
 *     stale check mark.
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
import Clipboard from '@react-native-clipboard/clipboard';
import {
  ArrowRight,
  Calendar,
  Check,
  Clock,
  Copy,
  Eye,
  User,
  Users,
} from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { formatMoney, moneyToRupees, type Money } from '@app-types/currency';
import {
  BOOKING_STATUS_VISUAL,
  type BookingStatusVisual,
} from '@shared/bookings';
// Direct file imports (not the feature index) so the UC bundle
// doesn't evaluate other features' screens.
import { getTripTypeOption } from '@features/customer/quotations/tripTypeOptions';

import type { UcBookingListItem, UcBookingStatus } from '../types';
import {
  UC_BOOKING_STATUS_VISUAL,
  formatBookingDate,
  formatBookingTime,
  formatPassengers,
} from '../utils/format';
import { UcBookingCardTracker } from './UcBookingCardTracker';

export type UcBookingCardLayout = 'wide' | 'compact';

type Props = {
  item: UcBookingListItem;
  /** Ignored — kept for BookingsScreen compatibility. */
  layout?: UcBookingCardLayout;
  onViewDetails: (item: UcBookingListItem) => void;
};

const COPIED_FLASH_MS = 1500;

/* ================================================================
 * Status → visual mappings (same values as the customer card)
 * ================================================================ */

type StatusStyle = BookingStatusVisual & {
  /** Whole-card wash + border. Lighter than the pill's `bg`. */
  cardBg: string;
  cardBorder: string;
};

const STATUS_STYLE: Readonly<Record<UcBookingStatus, StatusStyle>> = {
  upcoming: {
    ...BOOKING_STATUS_VISUAL.upcoming,
    cardBg: '#EAF7EE', // green
    cardBorder: '#C8EBD3',
  },
  ongoing: {
    ...BOOKING_STATUS_VISUAL.ongoing,
    cardBg: '#F0F8FE', // blue
    cardBorder: '#CBE6F7',
  },
  completed: {
    ...BOOKING_STATUS_VISUAL.completed,
    cardBg: '#F6F7F9', // neutral slate
    cardBorder: '#E1E4E9',
  },
  cancelled: {
    ...BOOKING_STATUS_VISUAL.cancelled,
    cardBg: '#FEF6F6', // red
    cardBorder: '#FAD5D5',
  },
  // UC only. Pill keeps the existing UC "No show" look; the wash is
  // the amber used for pending quotations.
  no_show: {
    ...UC_BOOKING_STATUS_VISUAL.no_show,
    cardBg: '#FFFBEB',
    cardBorder: '#FDE9B0',
  },
};

/* ================================================================
 * Formatting helpers
 * ================================================================ */

/**
 * "₹12,740" when there are no paise (as on the customer card),
 * "₹12,740.50" otherwise, so no amount is ever rounded.
 */
function formatAmount(m: Money): string {
  const rupees = moneyToRupees(m);
  return Number.isInteger(rupees)
    ? `₹${rupees.toLocaleString('en-IN')}`
    : formatMoney(m);
}

/** "Luxury Sedan · 4 Seater", or just the name when seats unknown. */
function formatVehicleLine(
  name: string,
  seatingCapacity: number | null,
): { name: string; sub: string } {
  return {
    name,
    sub:
      seatingCapacity && seatingCapacity > 0
        ? `  ·  ${seatingCapacity} Seater`
        : '',
  };
}

/**
 * Adds an alpha channel to a 6-digit hex colour ('#F57F17' + 0.12 →
 * '#F57F171F'). Any other format is returned unchanged.
 */
function withAlpha(hex: string, alpha: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

/* ================================================================
 * Card
 * ================================================================ */

const UcBookingCardImpl: React.FC<Props> = ({ item, onViewDetails }) => {
  const style = STATUS_STYLE[item.status] ?? STATUS_STYLE.upcoming;
  const StatusIcon = style.Icon;

  const tripType = getTripTypeOption(item.tripType);
  const TripIcon = tripType.Icon;

  const isUpcoming = item.status === 'upcoming';
  const amount = formatAmount(item.amount);
  const vehicle = formatVehicleLine(item.vehicleName, item.seatingCapacity);

  /* -------- Copy booking ref -------- *
   * `e.stopPropagation()` stops the tap also opening the booking. */
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copied = copiedRef === item.bookingRef;

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    [],
  );

  const onCopyRef = useCallback(
    (e: GestureResponderEvent) => {
      e.stopPropagation();
      Clipboard.setString(item.bookingRef);
      setCopiedRef(item.bookingRef);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(
        () => setCopiedRef(null),
        COPIED_FLASH_MS,
      );
    },
    [item.bookingRef],
  );

  const handleViewDetails = useCallback(
    () => onViewDetails(item),
    [onViewDetails, item],
  );

  /* -------- Render -------- */

  return (
    <Pressable
      onPress={handleViewDetails}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: style.cardBg, borderColor: style.cardBorder },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Booking ${item.bookingRef}, ${style.label}, ${tripType.label}, ${item.fromCity} to ${item.toCity}, customer ${item.customerName}, total ${amount}`}
    >
      {/* Row 1 — status pill + trip type (left), booking id (right) */}
      <View style={styles.headerRow}>
        <View style={styles.tagsRow}>
          <View style={[styles.pill, { backgroundColor: style.bg }]}>
            <StatusIcon size={12} color={style.fg} strokeWidth={2.5} />
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

        <View style={styles.idBlock}>
          <Text style={styles.idLabel}>Booking ID</Text>
          <View style={styles.idRow}>
            <Text style={styles.idValue} selectable>
              {item.bookingRef}
            </Text>
            <Pressable
              onPress={onCopyRef}
              hitSlop={8}
              style={({ pressed }) => [
                styles.copyBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                copied
                  ? `Booking ID ${item.bookingRef} copied`
                  : `Copy booking ID ${item.bookingRef}`
              }
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

      {/* Row 2 — route (left) + amount (right) */}
      <View style={styles.routeAmountRow}>
        <View style={styles.routeCol}>
          <Text style={styles.routeText} numberOfLines={1}>
            {item.fromCity}
          </Text>
          <ArrowRight
            size={18}
            color={Colors.textSecondary}
            strokeWidth={2.5}
          />
          <Text style={styles.routeText} numberOfLines={1}>
            {item.toCity}
          </Text>
        </View>
        <View style={styles.amountCol}>
          <Text style={styles.amount} numberOfLines={1}>
            {amount}
          </Text>
          <Text style={styles.amountLabel}>Total Amount</Text>
        </View>
      </View>

      {/* Row 3 — date · time · passengers */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Calendar size={14} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.metaText}>
            {formatBookingDate(item.scheduledAt)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Clock size={14} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.metaText}>
            {formatBookingTime(item.scheduledAt)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Users size={14} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.metaText}>
            {formatPassengers(item.passengers)}
          </Text>
        </View>
      </View>

      {/* Row 4 — vehicle on a single line */}
      <Text style={styles.vehicleText} numberOfLines={1}>
        <Text style={styles.vehicleName}>{vehicle.name}</Text>
        <Text style={styles.vehicleSub}>{vehicle.sub}</Text>
      </Text>

      {/* Row 5 — customer (UC only) */}
      <View style={styles.customerRow}>
        <User size={14} color={Colors.textSecondary} strokeWidth={2} />
        <Text style={styles.customerText} numberOfLines={1}>
          {item.customerName}
        </Text>
      </View>

      {/* Progress tracker — every status */}
      <View style={styles.trackerDivider} />
      <UcBookingCardTracker
        status={item.status}
        progressStep={item.progressStep}
      />

      {/* View Details — green on upcoming, gold otherwise */}
      <View style={styles.actionsRow}>
        <ActionButton
          label="View Details"
          color={isUpcoming ? Colors.primary : Colors.secondaryDark}
          onPress={handleViewDetails}
          accessibilityLabel={`View details for booking ${item.bookingRef}`}
        />
      </View>
    </Pressable>
  );
};

export const UcBookingCard = React.memo(UcBookingCardImpl);
UcBookingCard.displayName = 'UcBookingCard';

/* ================================================================
 * ActionButton — outline button (white bg, coloured border + text)
 * ================================================================
 * Press feedback: Android ripple in the button colour (keeps going
 * after the finger lifts, so a quick tap still shows), plus a light
 * tint and a slight shrink while held, on both platforms.
 */

const ActionButton: React.FC<{
  label: string;
  color: string;
  onPress: () => void;
  accessibilityLabel: string;
}> = ({ label, color, onPress, accessibilityLabel }) => (
  <Pressable
    onPress={onPress}
    android_ripple={{ color: withAlpha(color, 0.2), foreground: true }}
    style={({ pressed }) => [
      styles.actionBtn,
      { borderColor: color },
      pressed && [
        styles.actionBtnPressed,
        { backgroundColor: withAlpha(color, 0.12) },
      ],
    ]}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
  >
    <Eye size={14} color={color} strokeWidth={2.5} />
    <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
  </Pressable>
);

/* ================================================================
 * Styles — values mirror the customer BookingCard
 * ================================================================ */

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.sm,
    gap: 6,
    ...Shadows.xs,
  },
  pressed: {
    opacity: 0.85,
  },

  /* Row 1 — tags + booking id */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
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
  idValue: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '700',
    includeFontPadding: false,
  },
  copyBtn: {
    padding: 2,
  },

  /* Row 2 — route + amount */
  routeAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  routeCol: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeText: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 20,
    lineHeight: 24,
    flexShrink: 1,
  },
  amountCol: {
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

  /* Row 3 — inline meta */
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  metaItem: {
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

  /* Row 4 — vehicle */
  vehicleText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
  },
  vehicleName: {
    fontWeight: '700',
  },
  vehicleSub: {
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  /* Row 5 — customer */
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  customerText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '600',
    flexShrink: 1,
  },

  /* Divider above the tracker */
  trackerDivider: {
    height: 1,
    backgroundColor: Colors.primary + '22',
    marginTop: 2,
  },

  /* Bottom action */
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
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    // Keeps the Android ripple inside the rounded corners.
    overflow: 'hidden',
  },
  actionBtnPressed: {
    transform: [{ scale: 0.97 }],
  },
  actionBtnText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
});
