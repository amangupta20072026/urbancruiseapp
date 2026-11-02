/**
 * ------------------------------------------------------------------
 * UcTripCard — one row on the UC Trips tab
 * ------------------------------------------------------------------
 * One layout for EVERY status:
 *
 *   ┃┌─────────────────────────────────────────────────────┐
 *   ┃│ [● Ongoing] [⇆ One Way]                     Trip ID │
 *   ┃│                                   TRP-A-0211-00111 📋│
 *   ┃│ 📍 Goa  - - - - - 🚗 - - - - -  📍 Chandigarh        │
 *   ┃│ 📅 15 Nov 2026  │  🕑 02:28 AM                       │
 *   ┃│ [photo] │ Sedan · 4 Seater                     (📞) │
 *   ┃│         │ 👤 Ravi Shankar / Driver not assigned     │
 *   ┃│ 👥 Amit Verma · 4 Passengers       [View details ›] │
 *   ┃└─────────────────────────────────────────────────────┘
 *    ↑ left edge in the status colour
 *
 * Status colours — all from `@theme` Colors. Each status uses ONE
 * accent for the left edge, the solid pill and the city pins, with
 * white pill text. Every pair passes WCAG AA for small text:
 *
 *   status     accent                     white text on it   car
 *   upcoming   primaryDark  #2E7D32       5.13:1             start
 *   ongoing    completed    #2563EB       5.17:1             middle
 *   completed  textSecondary #6B7280      4.83:1             end, solid line
 *   cancelled  error        #DC2626       4.83:1             start (grey)
 *   no_show    pendingDark  #B45309       5.02:1             start (grey)
 *
 * Ongoing uses `Colors.completed` (blue) to match the approved
 * design. `Colors.info` (#0288D1) was not used: white text on it is
 * 3.86:1 and fails AA. `Colors.ongoing` (#C2410C) is orange, not the
 * blue in the design. To change a status colour, edit STATUS_STYLE
 * only.
 *
 * Compact sizing ("Option B"): 8dp between rows, 18dp city names,
 * 56×36 vehicle photo with no box around the vehicle row, 12dp date
 * and time text.
 *
 * Header row matches UcBookingCard's header 1:1 (pill sizes, "Trip
 * ID" label, bold id) so status, trip type and id fit on ONE row.
 * On very narrow screens / large system font, the trip type wraps
 * under the status pill instead of being clipped (same as
 * UcBookingCard).
 *
 * Always the same:
 *   - No amount, no vehicle number, no pickup / drop areas.
 *   - Vehicle photo: `vehicleImageUrl` (https only), else the bundled
 *     placeholder. A URL that fails to load also falls back.
 *   - Driver line: name, or "Driver not assigned" (amber) on
 *     upcoming / ongoing, or "No driver assigned" (grey) on ended
 *     trips.
 *   - Call button: upcoming / ongoing with a driver AND a phone.
 *   - "View details ›" button; tapping anywhere on the card does the
 *     same.
 *
 * Dashed lines are drawn with small views, not `borderStyle:
 * 'dashed'`, which renders unreliably on one side of a view on
 * Android and iOS.
 *
 * `layout` is still accepted so TripsScreen needn't change.
 *
 * FlashList notes:
 *   - Memoised; the screen keeps `item` refs and handlers stable.
 *   - The copied flag stores WHICH ID was copied, and the failed-
 *     image flag stores WHICH URL failed, so a recycled row never
 *     shows another row's state.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  Image,
  type ImageSourcePropType,
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
  CircleUserRound,
  Clock,
  Copy,
  type LucideProps,
  MapPin,
  Phone,
  User,
  Users,
} from 'lucide-react-native';

import {
  Colors,
  FontSize,
  FontWeight,
  LineHeight,
  Radius,
  Shadows,
  Spacing,
  Typography,
} from '@theme';
import { toast } from '@services/toast';
import { BOOKING_STATUS_VISUAL } from '@shared/bookings';
// Direct file imports (not the feature index) so the UC bundle
// doesn't evaluate other features' screens.
import { getTripTypeOption } from '@features/customer/quotations/tripTypeOptions';
import { UC_BOOKING_STATUS_VISUAL } from '@features/uc/bookings/utils/format';
import type { FilterChipPalette } from '@features/uc/customers/components/HistoryFilterChips';

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

// Same placeholder the customer VehicleDetailsCard uses until real
// vehicle photos come from the backend.
const PLACEHOLDER_VEHICLE_IMG: ImageSourcePropType = require('@assets/images/service-car.png');

/* ================================================================
 * Status → visual mapping
 * ================================================================ */

type CarPosition = 'start' | 'middle' | 'end';

type StatusStyle = {
  label: string;
  Icon: React.ComponentType<LucideProps>;
  /** Left edge, solid pill background and city pins. */
  accent: string;
  /** Pill text + icon on `accent`. */
  onAccent: string;
  /** Where the car sits on the route line, and its colour. */
  car: CarPosition;
  carColor: string;
};

const STATUS_STYLE: Readonly<Record<UcTripStatus, StatusStyle>> = {
  upcoming: {
    label: BOOKING_STATUS_VISUAL.upcoming.label,
    Icon: BOOKING_STATUS_VISUAL.upcoming.Icon,
    accent: Colors.primaryDark,
    onAccent: Colors.textOnPrimary,
    car: 'start',
    carColor: Colors.primaryDark,
  },
  ongoing: {
    label: BOOKING_STATUS_VISUAL.ongoing.label,
    Icon: BOOKING_STATUS_VISUAL.ongoing.Icon,
    accent: Colors.completed,
    onAccent: Colors.textOnPrimary,
    car: 'middle',
    carColor: Colors.completed,
  },
  completed: {
    label: BOOKING_STATUS_VISUAL.completed.label,
    Icon: BOOKING_STATUS_VISUAL.completed.Icon,
    accent: Colors.textSecondary,
    onAccent: Colors.textOnPrimary,
    car: 'end',
    carColor: Colors.textSecondary,
  },
  cancelled: {
    label: BOOKING_STATUS_VISUAL.cancelled.label,
    Icon: BOOKING_STATUS_VISUAL.cancelled.Icon,
    accent: Colors.error,
    onAccent: Colors.textOnPrimary,
    car: 'start',
    carColor: Colors.textTertiary,
  },
  no_show: {
    label: UC_BOOKING_STATUS_VISUAL.no_show.label,
    Icon: UC_BOOKING_STATUS_VISUAL.no_show.Icon,
    accent: Colors.pendingDark,
    onAccent: Colors.textOnPrimary,
    car: 'start',
    carColor: Colors.textTertiary,
  },
};

/**
 * Status filter chip colours for the Trips tab. Each status `solid`
 * is read from STATUS_STYLE above, so the chips always match these
 * cards. "All" has no card: royal purple, same as the other screens.
 */
export const UC_TRIP_CHIP_PALETTE: FilterChipPalette = Object.freeze({
  all: { solid: Colors.royal, tint: Colors.royalTint },
  upcoming: { solid: STATUS_STYLE.upcoming.accent, tint: Colors.primaryTint },
  ongoing: { solid: STATUS_STYLE.ongoing.accent, tint: Colors.completedTint },
  completed: {
    solid: STATUS_STYLE.completed.accent,
    tint: Colors.backgroundTertiary,
  },
  cancelled: { solid: STATUS_STYLE.cancelled.accent, tint: Colors.errorTint },
});

/* ================================================================
 * Pure helpers (exported for tests)
 * ================================================================ */

/** "SUV" + 6 → "SUV · 6 Seater"; unknown seats → just the name. */
export function vehicleLine(
  name: string,
  seats: number | null | undefined,
): string {
  return seats && seats > 0 ? `${name} · ${seats} Seater` : name;
}

/**
 * Returns the URL only if it is a non-empty https URL; otherwise
 * null (the card then shows the placeholder). Plain http is refused:
 * Android blocks cleartext traffic by default and iOS ATS does too.
 */
export function safeImageUrl(url: string | null | undefined): string | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  return /^https:\/\/\S+$/i.test(trimmed) ? trimmed : null;
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
  const canCall = isActive && !!item.driverName && !!item.driverPhone;
  const driverText = item.driverName
    ? item.driverName
    : isActive
    ? 'Driver not assigned'
    : 'No driver assigned';
  const driverMissingActive = !item.driverName && isActive;

  const dateText = formatTripDate(item.scheduledAt);
  const timeText = formatTripTime(item.scheduledAt);
  const vehicleText = vehicleLine(item.vehicleName, item.seatingCapacity);

  /* -------- Vehicle photo -------- *
   * Falls back to the placeholder if the URL is missing, not https,
   * or fails to load. Stores the failed URL (not a boolean) so a
   * recycled row with a different URL tries again. */
  const imageUrl = safeImageUrl(item.vehicleImageUrl);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const showRemoteImage = imageUrl !== null && imageUrl !== failedImageUrl;
  const vehicleImageSource: ImageSourcePropType = showRemoteImage
    ? { uri: imageUrl }
    : PLACEHOLDER_VEHICLE_IMG;
  const onImageError = useCallback(() => {
    if (imageUrl) setFailedImageUrl(imageUrl);
  }, [imageUrl]);

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
        { borderLeftColor: style.accent },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Trip ID ${item.tripRef}, ${style.label}, ${
        tripType ? `${tripType.label}, ` : ''
      }from ${item.fromCity} to ${
        item.toCity
      }, ${dateText} at ${timeText}, ${vehicleText}, ${driverText}, customer ${
        item.customerName
      }, ${formatPassengers(item.passengers)}`}
    >
      {/* Row 1 — status pill + trip type (left), trip id (right).
          Same sizes as the UcBookingCard header. */}
      <View style={styles.headerRow}>
        <View style={styles.tagsRow}>
          <View style={[styles.pill, { backgroundColor: style.accent }]}>
            <StatusIcon size={12} color={style.onAccent} strokeWidth={2.5} />
            <Text style={[styles.pillText, { color: style.onAccent }]}>
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

        <View style={styles.idBlock}>
          <Text style={styles.idLabel}>Trip ID</Text>
          <View style={styles.idRow}>
            <Text style={styles.idValue} selectable>
              {item.tripRef}
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
                  ? `Trip ID ${item.tripRef} copied`
                  : `Copy trip ID ${item.tripRef}`
              }
            >
              {copied ? (
                <Check size={13} color={Colors.success} strokeWidth={2.5} />
              ) : (
                <Copy size={13} color={Colors.textSecondary} strokeWidth={2} />
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {/* Row 2 — 📍 From  - - 🚗 - -  📍 To */}
      <View style={styles.routeRow}>
        <View style={styles.cityGroup}>
          <CityPin color={style.accent} />
          <Text style={styles.city} numberOfLines={1}>
            {item.fromCity}
          </Text>
        </View>

        <RouteLine
          position={style.car}
          carColor={style.carColor}
          solid={item.status === 'completed'}
        />

        <View style={[styles.cityGroup, styles.cityGroupRight]}>
          <CityPin color={style.accent} />
          <Text style={styles.city} numberOfLines={1}>
            {item.toCity}
          </Text>
        </View>
      </View>

      {/* Row 3 — 📅 date │ 🕑 time */}
      <View style={styles.whenRow}>
        <View style={styles.whenItem}>
          <Calendar size={14} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.whenText} numberOfLines={1}>
            {dateText}
          </Text>
        </View>
        <View style={styles.whenDivider} />
        <View style={styles.whenItem}>
          <Clock size={14} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.whenText} numberOfLines={1}>
            {timeText}
          </Text>
        </View>
      </View>

      {/* Row 4 — vehicle row: photo │ vehicle + driver, call */}
      <View style={styles.vehicleRow}>
        <Image
          source={vehicleImageSource}
          onError={showRemoteImage ? onImageError : undefined}
          style={styles.vehicleImage}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessible={false}
        />
        <View style={styles.vehicleDivider} />

        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleText} numberOfLines={1}>
            {vehicleText}
          </Text>
          <View style={styles.driverLine}>
            {driverMissingActive ? (
              <CircleUserRound
                size={15}
                color={Colors.pendingDark}
                strokeWidth={2.2}
              />
            ) : (
              <User size={15} color={Colors.textSecondary} strokeWidth={2} />
            )}
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
            <Phone size={18} color={Colors.primary} strokeWidth={2.2} />
          </Pressable>
        ) : null}
      </View>

      {/* Row 5 — customer (left), View details (right) */}
      <View style={styles.footerRow}>
        <View style={styles.customerRow}>
          <Users size={16} color={Colors.textSecondary} strokeWidth={2} />
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
            styles.detailsBtn,
            pressed && styles.detailsBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`View details for trip ${item.tripRef}`}
        >
          <Text style={styles.detailsText}>View details</Text>
          <ChevronRight
            size={16}
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

/**
 * Solid pin with a white centre. The outline is drawn in the card
 * colour (`surface`) so only the filled shape shows; the inner
 * circle's stroke then reads as the white dot.
 */
const CityPin: React.FC<{ color: string }> = ({ color }) => (
  <MapPin size={16} color={Colors.surface} fill={color} strokeWidth={2} />
);

const DASH = 5;
const DASH_GAP = 4;
/** Enough dashes for the widest phone; extra ones are clipped. */
const DASH_COUNT = 60;

/** A horizontal dashed line that fills its width. */
const DashedLine: React.FC<{ color: string; thickness?: number }> = ({
  color,
  thickness = 1.5,
}) => (
  <View style={[styles.dashedRow, { height: thickness }]}>
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
 * filled green line (completed trips). The car sits on a `surface`
 * box so the line doesn't show through it.
 */
const RouteLine: React.FC<{
  position: CarPosition;
  carColor: string;
  solid: boolean;
}> = ({ position, carColor, solid }) => (
  <View style={styles.routeLineWrap}>
    {solid ? (
      <View style={styles.solidLine} />
    ) : (
      <DashedLine color={Colors.textTertiary} thickness={1.5} />
    )}
    <View
      style={[
        styles.carWrap,
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
const ACCENT_EDGE = 4;
const VEHICLE_IMG_W = 56;
const VEHICLE_IMG_H = 36;
const CALL_BTN = 40;

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: ACCENT_EDGE,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  pressed: {
    opacity: 0.85,
  },

  /* Row 1 — tags (left) + trip id (right). Values match the
     UcBookingCard header so both cards look the same. */
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
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  pillText: {
    ...Typography.caption,
    fontWeight: FontWeight.bold,
    includeFontPadding: false,
  },
  tripTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tripTagText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: FontWeight.semiBold,
    includeFontPadding: false,
  },
  idBlock: {
    alignItems: 'flex-end',
    gap: 1,
  },
  idLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
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
    fontWeight: FontWeight.bold,
    includeFontPadding: false,
  },
  copyBtn: {
    padding: Spacing.xxs,
  },

  /* Row 2 — route */
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cityGroup: {
    maxWidth: '40%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  cityGroupRight: {
    justifyContent: 'flex-end',
  },
  city: {
    ...Typography.title,
    fontSize: FontSize.xl,
    lineHeight: LineHeight.lg,
    fontWeight: FontWeight.extraBold,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  routeLineWrap: {
    flex: 1,
    height: CAR_BOX,
    justifyContent: 'center',
    marginHorizontal: Spacing.sm,
  },
  solidLine: {
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.primary,
  },
  dashedRow: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  carWrap: {
    position: 'absolute',
    width: CAR_BOX,
    height: CAR_BOX,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
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

  /* Row 3 — date │ time */
  whenRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  whenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexShrink: 1,
  },
  whenDivider: {
    width: 1,
    height: LineHeight.sm,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  whenText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: FontWeight.semiBold,
    flexShrink: 1,
  },

  /* Row 4 — vehicle row (no box around it) */
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  vehicleImage: {
    width: VEHICLE_IMG_W,
    height: VEHICLE_IMG_H,
  },
  vehicleDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: Colors.border,
  },
  vehicleInfo: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xs,
  },
  vehicleText: {
    ...Typography.body,
    lineHeight: LineHeight.sm,
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
  },
  driverLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + Spacing.xxs,
  },
  driverText: {
    ...Typography.body,
    lineHeight: LineHeight.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
    flexShrink: 1,
  },
  driverMissing: {
    color: Colors.pendingDark,
    fontWeight: FontWeight.semiBold,
  },
  callBtn: {
    width: CALL_BTN,
    height: CALL_BTN,
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
    gap: Spacing.xs + Spacing.xxs,
  },
  customerText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
    flexShrink: 1,
    includeFontPadding: false,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryTint,
    overflow: 'hidden',
  },
  detailsBtnPressed: {
    backgroundColor: withAlpha(Colors.primary, 0.2),
  },
  detailsText: {
    ...Typography.bodySmall,
    color: Colors.primaryDark,
    fontWeight: FontWeight.bold,
    includeFontPadding: false,
  },
});
