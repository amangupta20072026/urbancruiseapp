/**
 * ------------------------------------------------------------------
 * UcTripCard — one row on the UC Trips tab (ticket design)
 * ------------------------------------------------------------------
 * One layout for EVERY status (approved "Option 2 · ticket"):
 *
 *   ┌───────────────────────────────────────────────────────┐
 *   │ [status pill] [trip type]          TRP-M-0175-00330 📋 │
 *   │ From                                               To │
 *   │ Udaipur  🚗- - - - - - - - - - - - - - - - - -  Noida │
 *   │ 📅 12 Nov · 04:44 PM                     [in 13 days] │
 *   ├ - - - - - - - - - - - - - - - - - - - - - - - - - - - ┤  ← tear line
 *   │ SUV · 6 Seater                                   (📞) │
 *   │ 🪪 Ramesh Yadav  /  Driver not assigned (amber)        │
 *   │ 👤 Karan Mehta · 4 Passengers         View details ›  │
 *   └───────────────────────────────────────────────────────┘
 *
 * What changes per status:
 *
 *   status     card wash   car on route line      chip
 *   upcoming   green       at the start           "in 13 days" / "in 5h 20m"
 *                                                 / "Pickup time passed"
 *   ongoing    blue        middle (blue)          "1h 20m on road"
 *   completed  grey        end, solid green line  "1,618 km · 26h 10m"
 *   cancelled  red         start (greyed)         "Before / After confirmation"
 *   no_show    amber       start (greyed)         "Trip didn't start"
 *
 * Card wash + border and pill colours are the same values as the UC
 * Bookings card, so a status looks the same on both tabs.
 *
 * Always the same:
 *   - No amount, no vehicle number, no pickup / drop areas.
 *   - Driver line: name, or "Driver not assigned" (amber) on
 *     upcoming / ongoing, or "No driver assigned" (grey) on ended
 *     trips.
 *   - Call button: upcoming / ongoing with a driver AND a phone.
 *   - "View details ›" link; tapping anywhere on the card does the
 *     same.
 *
 * Dashed lines are drawn with small views, not `borderStyle:
 * 'dashed'`, which renders unreliably on one side of a view on
 * Android and iOS.
 *
 * Times ("in 5h 20m", "1h 20m on road") are worked out when the row
 * renders; they refresh on pull-to-refresh or scroll, not every
 * minute.
 *
 * `layout` is still accepted so TripsScreen needn't change.
 *
 * FlashList notes:
 *   - Memoised; the screen keeps `item` refs and handlers stable.
 *   - The copied flag stores WHICH ID was copied, so a recycled row
 *     never shows a stale check mark.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  Calendar,
  Car,
  Check,
  ChevronRight,
  Copy,
  IdCard,
  Phone,
  User,
} from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { toast } from '@services/toast';
import {
  BOOKING_STATUS_VISUAL,
  type BookingStatusVisual,
} from '@shared/bookings';
// Direct file imports (not the feature index) so the UC bundle
// doesn't evaluate other features' screens.
import { getTripTypeOption } from '@features/customer/quotations/tripTypeOptions';
import { UC_BOOKING_STATUS_VISUAL } from '@features/uc/bookings/utils/format';

import type { UcTripListItem, UcTripStatus } from '../types';
import {
  formatPassengers,
  formatTripDate,
  formatTripTime,
} from '../utils/format';

export type UcTripCardLayout = 'wide' | 'compact';

type Props = {
  item: UcTripListItem;
  /** Ignored — kept for TripsScreen compatibility. */
  layout?: UcTripCardLayout;
  onViewDetails: (item: UcTripListItem) => void;
};

const COPIED_FLASH_MS = 1500;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/* ================================================================
 * Status → visual mappings
 * ================================================================ */

type CarPosition = 'start' | 'middle' | 'end';

type StatusStyle = BookingStatusVisual & {
  /** Whole-card wash + border (same values as UcBookingCard). */
  cardBg: string;
  cardBorder: string;
  /** Chip under the route. */
  chipBg: string;
  chipFg: string;
  /** Where the car sits on the route line, and its colour. */
  car: CarPosition;
  carColor: string;
};

const STATUS_STYLE: Readonly<Record<UcTripStatus, StatusStyle>> = {
  upcoming: {
    ...BOOKING_STATUS_VISUAL.upcoming,
    cardBg: '#EAF7EE',
    cardBorder: '#C8EBD3',
    chipBg: Colors.surface,
    chipFg: Colors.primaryDark,
    car: 'start',
    carColor: Colors.primaryDark,
  },
  ongoing: {
    ...BOOKING_STATUS_VISUAL.ongoing,
    cardBg: '#F0F8FE',
    cardBorder: '#CBE6F7',
    chipBg: Colors.surface,
    chipFg: Colors.info,
    car: 'middle',
    carColor: Colors.info,
  },
  completed: {
    ...BOOKING_STATUS_VISUAL.completed,
    cardBg: '#F6F7F9',
    cardBorder: '#E1E4E9',
    chipBg: Colors.surface,
    chipFg: Colors.textSecondary,
    car: 'end',
    carColor: Colors.textSecondary,
  },
  cancelled: {
    ...BOOKING_STATUS_VISUAL.cancelled,
    cardBg: '#FEF6F6',
    cardBorder: '#FAD5D5',
    chipBg: Colors.surface,
    chipFg: Colors.error,
    car: 'start',
    carColor: Colors.textTertiary,
  },
  no_show: {
    ...UC_BOOKING_STATUS_VISUAL.no_show,
    cardBg: '#FFFBEB',
    cardBorder: '#FDE9B0',
    chipBg: Colors.surface,
    chipFg: Colors.pendingDark,
    car: 'start',
    carColor: Colors.textTertiary,
  },
};

/* ================================================================
 * Pure helpers (exported for tests)
 * ================================================================ */

/** 1570 → "26h 10m", 45 → "45m", 120 → "2h". */
export function formatDurationMinutes(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}m`;
  return rest === 0 ? `${h}h` : `${h}h ${rest}m`;
}

/**
 * Text for the chip under the route. `overdue` makes an upcoming
 * chip amber ("Pickup time passed").
 */
export function buildChip(
  item: Pick<
    UcTripListItem,
    | 'status'
    | 'progressStep'
    | 'scheduledAt'
    | 'startedAt'
    | 'distanceKm'
    | 'durationMinutes'
  >,
  nowMs: number,
): { text: string; overdue: boolean } {
  switch (item.status) {
    case 'upcoming': {
      const left = new Date(item.scheduledAt).getTime() - nowMs;
      if (left <= 0) return { text: 'Pickup time passed', overdue: true };
      if (left >= 2 * DAY_MS) {
        return { text: `in ${Math.floor(left / DAY_MS)} days`, overdue: false };
      }
      return {
        text: `in ${formatDurationMinutes(left / MINUTE_MS)}`,
        overdue: false,
      };
    }
    case 'ongoing': {
      const start = new Date(item.startedAt ?? item.scheduledAt).getTime();
      const elapsed = nowMs - start;
      return {
        text:
          elapsed >= MINUTE_MS
            ? `${formatDurationMinutes(elapsed / MINUTE_MS)} on road`
            : 'Just started',
        overdue: false,
      };
    }
    case 'completed': {
      const parts: string[] = [];
      if (item.distanceKm != null) {
        parts.push(`${item.distanceKm.toLocaleString('en-IN')} km`);
      }
      if (item.durationMinutes != null) {
        parts.push(formatDurationMinutes(item.durationMinutes));
      }
      return {
        text: parts.length > 0 ? parts.join(' · ') : 'Trip completed',
        overdue: false,
      };
    }
    case 'cancelled':
      return {
        text:
          item.progressStep === 'confirmed'
            ? 'After confirmation'
            : 'Before confirmation',
        overdue: false,
      };
    case 'no_show':
      return { text: "Trip didn't start", overdue: false };
  }
}

/** "12 Nov · 04:44 PM" */
function formatWhen(iso: string): string {
  const dayMonth = formatTripDate(iso).split(' ').slice(0, 2).join(' ');
  return `${dayMonth} · ${formatTripTime(iso)}`;
}

/** "SUV" + 6 → "SUV · 6 Seater"; unknown seats → just the name. */
function vehicleLine(name: string, seats: number | null | undefined): string {
  return seats && seats > 0 ? `${name} · ${seats} Seater` : name;
}

/**
 * Adds an alpha channel to a 6-digit hex colour ('#4CAF50' + 0.12 →
 * '#4CAF501F'). Any other format is returned unchanged.
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

const UcTripCardImpl: React.FC<Props> = ({ item, onViewDetails }) => {
  const style = STATUS_STYLE[item.status] ?? STATUS_STYLE.upcoming;
  const StatusIcon = style.Icon;

  // Guarded: rows saved in the offline cache by an older app version
  // have no tripType. Those cards simply skip the tag.
  const tripType = item.tripType ? getTripTypeOption(item.tripType) : null;

  const isActive = item.status === 'upcoming' || item.status === 'ongoing';
  const chip = buildChip(item, Date.now());
  const canCall = isActive && !!item.driverName && !!item.driverPhone;
  const driverText = item.driverName
    ? item.driverName
    : isActive
    ? 'Driver not assigned'
    : 'No driver assigned';
  const driverMissingActive = !item.driverName && isActive;

  /* -------- Copy trip ID -------- *
   * `e.stopPropagation()` stops the tap also opening the trip. */
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copied = copiedRef === item.tripRef;

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    [],
  );

  const onCopyRef = useCallback(
    (e: GestureResponderEvent) => {
      e.stopPropagation();
      Clipboard.setString(item.tripRef);
      setCopiedRef(item.tripRef);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(
        () => setCopiedRef(null),
        COPIED_FLASH_MS,
      );
    },
    [item.tripRef],
  );

  /* -------- Call driver -------- */
  const onCallDriver = useCallback(
    (e: GestureResponderEvent) => {
      e.stopPropagation();
      if (!item.driverPhone) return;
      Linking.openURL(`tel:${item.driverPhone}`).catch(() => {
        toast.error("Couldn't start the call", {
          description: 'Please dial from your phone app.',
        });
      });
    },
    [item.driverPhone],
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
      accessibilityLabel={`Trip ${item.tripRef}, ${style.label}, ${
        tripType ? `${tripType.label}, ` : ''
      }from ${item.fromCity} to ${item.toCity}, ${formatWhen(
        item.scheduledAt,
      )}, ${chip.text}, ${vehicleLine(
        item.vehicleName,
        item.seatingCapacity,
      )}, ${driverText}, customer ${item.customerName}`}
    >
      {/* Row 1 — status pill + trip type (left), trip id (right) */}
      <View style={styles.headerRow}>
        <View style={styles.tagsRow}>
          <View style={[styles.pill, { backgroundColor: style.bg }]}>
            <StatusIcon size={12} color={style.fg} strokeWidth={2.5} />
            <Text style={[styles.pillText, { color: style.fg }]}>
              {style.label}
            </Text>
          </View>
          {tripType ? (
            <View style={styles.tripTag}>
              <tripType.Icon
                size={12}
                color={Colors.textSecondary}
                strokeWidth={2.5}
              />
              <Text style={styles.tripTagText}>{tripType.label}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.idRow}>
          <Text style={styles.idValue} selectable>
            {item.tripRef}
          </Text>
          <Pressable
            onPress={onCopyRef}
            hitSlop={8}
            style={({ pressed }) => [styles.copyBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={
              copied
                ? `Trip ID ${item.tripRef} copied`
                : `Copy trip ID ${item.tripRef}`
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

      {/* Row 2 — From  🚗- - - -  To */}
      <View style={styles.routeRow}>
        <View style={styles.cityCol}>
          <Text style={styles.cityLabel}>From</Text>
          <Text style={styles.city} numberOfLines={1}>
            {item.fromCity}
          </Text>
        </View>

        <RouteLine
          position={style.car}
          carColor={style.carColor}
          maskColor={style.cardBg}
          solid={item.status === 'completed'}
        />

        <View style={[styles.cityCol, styles.cityColRight]}>
          <Text style={styles.cityLabel}>To</Text>
          <Text style={[styles.city, styles.cityRight]} numberOfLines={1}>
            {item.toCity}
          </Text>
        </View>
      </View>

      {/* Row 3 — date + time (left), status chip (right) */}
      <View style={styles.whenRow}>
        <View style={styles.whenLeft}>
          <Calendar size={13} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.whenText} numberOfLines={1}>
            {formatWhen(item.scheduledAt)}
          </Text>
        </View>
        <View
          style={[
            styles.chip,
            {
              backgroundColor: style.chipBg,
              borderColor: withAlpha(
                chip.overdue ? Colors.pendingDark : style.chipFg,
                0.25,
              ),
            },
          ]}
        >
          <Text
            style={[
              styles.chipText,
              { color: chip.overdue ? Colors.pendingDark : style.chipFg },
            ]}
            numberOfLines={1}
          >
            {chip.text}
          </Text>
        </View>
      </View>

      {/* Tear line — runs edge to edge */}
      <DashedLine
        color={style.cardBorder}
        style={styles.tearLine}
        thickness={1.5}
      />

      {/* Row 4 — vehicle + driver (left), call (right) */}
      <View style={styles.vehicleRow}>
        <View style={styles.vehicleInfo}>
          <View style={styles.vehicleLine}>
            <Car size={14} color={Colors.textSecondary} strokeWidth={2} />
            <Text style={styles.vehicleText} numberOfLines={1}>
              {vehicleLine(item.vehicleName, item.seatingCapacity)}
            </Text>
          </View>
          <View style={styles.vehicleLine}>
            <IdCard
              size={14}
              color={
                driverMissingActive ? Colors.pendingDark : Colors.textSecondary
              }
              strokeWidth={2}
            />
            <Text
              style={[
                styles.driverText,
                driverMissingActive && styles.driverMissing,
              ]}
              numberOfLines={1}
            >
              {driverText}
            </Text>
          </View>
        </View>

        {canCall ? (
          <Pressable
            onPress={onCallDriver}
            hitSlop={6}
            android_ripple={{
              color: withAlpha(Colors.primary, 0.2),
              borderless: true,
            }}
            style={({ pressed }) => [
              styles.callBtn,
              pressed && styles.callBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Call driver ${item.driverName ?? ''}`}
          >
            <Phone size={16} color={Colors.primary} strokeWidth={2.5} />
          </Pressable>
        ) : null}
      </View>

      {/* Row 5 — customer (left), View details (right) */}
      <View style={styles.footerRow}>
        <View style={styles.customerRow}>
          <User size={13} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.customerText} numberOfLines={1}>
            {`${item.customerName} · ${formatPassengers(item.passengers)}`}
          </Text>
        </View>
        <Pressable
          onPress={handleViewDetails}
          hitSlop={8}
          android_ripple={{
            color: withAlpha(Colors.primary, 0.2),
            foreground: true,
          }}
          style={({ pressed }) => [
            styles.detailsLink,
            pressed && styles.detailsLinkPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`View details for trip ${item.tripRef}`}
        >
          <Text style={styles.detailsText}>View details</Text>
          <ChevronRight
            size={15}
            color={Colors.primaryDark}
            strokeWidth={2.5}
          />
        </Pressable>
      </View>
    </Pressable>
  );
};

export const UcTripCard = React.memo(UcTripCardImpl);
UcTripCard.displayName = 'UcTripCard';

/* ================================================================
 * Sub-components
 * ================================================================ */

const DASH = 5;
const DASH_GAP = 4;
/** Enough dashes for the widest phone; extra ones are clipped. */
const DASH_COUNT = 90;

/** A horizontal dashed line that fills its width. */
const DashedLine: React.FC<{
  color: string;
  thickness?: number;
  style?: object;
}> = ({ color, thickness = 1.5, style }) => (
  <View style={[styles.dashedRow, { height: thickness }, style]}>
    {Array.from({ length: DASH_COUNT }, (_, i) => (
      <View
        key={i}
        style={{
          width: DASH,
          height: thickness,
          marginRight: DASH_GAP,
          backgroundColor: color,
          borderRadius: thickness,
        }}
      />
    ))}
  </View>
);

/**
 * The line between the two cities with a car on it. `solid` draws a
 * filled green line (completed trips).
 */
const RouteLine: React.FC<{
  position: CarPosition;
  carColor: string;
  maskColor: string;
  solid: boolean;
}> = ({ position, carColor, maskColor, solid }) => (
  <View style={styles.routeLineWrap}>
    {solid ? (
      <View style={styles.solidLine} />
    ) : (
      <DashedLine color={Colors.textTertiary} thickness={1.5} />
    )}
    <View
      style={[
        styles.carWrap,
        { backgroundColor: maskColor },
        position === 'start' && styles.carStart,
        position === 'middle' && styles.carMiddle,
        position === 'end' && styles.carEnd,
      ]}
    >
      <Car size={16} color={carColor} strokeWidth={2.2} />
    </View>
  </View>
);

/* ================================================================
 * Styles
 * ================================================================ */

const CAR_BOX = 24;

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    gap: 10,
    ...Shadows.xs,
  },
  pressed: {
    opacity: 0.85,
  },

  /* Row 1 — tags + trip id */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  idValue: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
    includeFontPadding: false,
  },
  copyBtn: {
    padding: 2,
  },

  /* Row 2 — route */
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  cityCol: {
    maxWidth: '38%',
  },
  cityColRight: {
    alignItems: 'flex-end',
  },
  cityLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    includeFontPadding: false,
  },
  city: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 19,
    lineHeight: 24,
  },
  cityRight: {
    textAlign: 'right',
  },
  routeLineWrap: {
    flex: 1,
    height: CAR_BOX,
    justifyContent: 'center',
    // Same height as a city line, so the route line sits on the
    // middle of the city names (the row aligns to the bottom).
    marginHorizontal: Spacing.sm,
  },
  solidLine: {
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.primary,
  },
  carWrap: {
    position: 'absolute',
    width: CAR_BOX,
    height: CAR_BOX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carStart: {
    left: 0,
  },
  carMiddle: {
    left: '50%',
    marginLeft: -CAR_BOX / 2,
  },
  carEnd: {
    right: 0,
  },

  /* Row 3 — when + chip */
  whenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  whenLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  whenText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '500',
    flexShrink: 1,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  chipText: {
    ...Typography.caption,
    fontWeight: '700',
    includeFontPadding: false,
  },

  /* Tear line */
  dashedRow: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  tearLine: {
    // Run from card edge to card edge.
    marginHorizontal: -Spacing.md,
  },

  /* Row 4 — vehicle + driver */
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  vehicleInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  vehicleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehicleText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '700',
    flexShrink: 1,
  },
  driverText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '500',
    flexShrink: 1,
  },
  driverMissing: {
    color: Colors.pendingDark,
    fontWeight: '600',
  },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.circle,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtnPressed: {
    backgroundColor: Colors.primaryTint,
    transform: [{ scale: 0.94 }],
  },

  /* Row 5 — customer + View details */
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  customerRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  customerText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    flexShrink: 1,
    includeFontPadding: false,
  },
  detailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingLeft: Spacing.sm,
    paddingRight: 4,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  detailsLinkPressed: {
    backgroundColor: withAlpha(Colors.primary, 0.12),
  },
  detailsText: {
    ...Typography.bodySmall,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
});
