/**
 * ------------------------------------------------------------------
 * UcQuotationCard — one row on the UC Quotations tab ("Option A")
 * ------------------------------------------------------------------
 * Same family as UcBookingCard / UcTripCard (status edge, solid pill,
 * trip-type tag, ID block), with content borrowed from the customer
 * QuotationCard (trip-type tag, Quotation ID + copy, date · days,
 * View details):
 *
 *   ┃┌─────────────────────────────────────────────────────┐
 *   ┃│ [✓ Accepted] [✈ One Way]               Quotation ID │
 *   ┃│                                   QU-2026-563698 📋 │
 *   ┃│ Delhi → Agra                                        │
 *   ┃│ 📅 08 Nov 2026 - 08 Nov 2026   🕒 1 Day             │
 *   ┃│ 🚌 Force Traveller · 13 Seater                      │
 *   ┃│ ─────────────────────────────────────────────────── │
 *   ┃│ (RS) Rahul Sharma                 ⋮ [View details ›]│
 *   ┃│      +91 98765 43210                                │
 *   ┃└─────────────────────────────────────────────────────┘
 *    ↑ left edge in the status colour
 *
 * Status colours (all `@theme` Colors). One accent per status for the
 * left edge and the solid pill, with white pill text — every pair
 * passes WCAG AA for small text:
 *
 *   accepted  primaryDark   #2E7D32   5.13:1
 *   sent      completed     #2563EB   5.17:1
 *   draft     textSecondary #6B7280   4.83:1
 *   rejected  error         #DC2626   4.83:1
 *
 * STATUS_TONE (tinted pills) is left unchanged for the actions sheet.
 *
 * Nothing is truncated except the customer name (one line): the
 * route wraps, the meta line wraps, the ID never shrinks.
 *
 * Meta line:
 *   - Dates: server start → server end ("08 Nov 2026 - 09 Nov 2026");
 *     a one-day trip repeats the date. Nothing is derived from `days`.
 *   - Days: kept as its own item ("1 Day", "2 Days").
 *   - Vehicle: "Force Traveller · 13 Seater", or the name only when
 *     the seat count is unknown. The icon still follows serviceType;
 *     the service-type label is not shown.
 * No price is shown on the card.
 *
 * Touch targets (each stops the tap reaching the card):
 *   - Card / "View details" → onPress
 *   - ⋮                       → onMore (actions sheet)
 *   - Copy icon               → copies the quotation number
 *
 * FlashList: memoised; the copied flag stores WHICH number was
 * copied, so a recycled row never shows another row's "copied" tick.
 * ------------------------------------------------------------------
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  Bus,
  Calendar,
  Car,
  Check,
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock,
  Copy,
  EllipsisVertical,
  FileText,
  MapPin,
  Plane,
  RefreshCw,
  Send,
  TrainFront,
  type LucideIcon,
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
import { avatarColorFor, initials } from '@shared/utils';

import {
  UC_QUOTATION_STATUS_LABEL,
  type UcQuotationListItem,
  type UcQuotationStatus,
  type UcServiceType,
  type UcTripType,
} from '../types';
import {
  formatDayMonthYear,
  formatDays,
  formatRoute,
  formatTravelDateRange,
  formatTripType,
  formatVehicle,
} from '../utils/format';

type Props = {
  item: UcQuotationListItem;
  onPress: (item: UcQuotationListItem) => void;
  onMore: (item: UcQuotationListItem) => void;
};

const COPIED_FLASH_MS = 1500;

/* ================================================================
 * Visual mappings
 * ================================================================ */

/** Left edge + solid pill background; pill text is white. */
const STATUS_STYLE: Readonly<
  Record<UcQuotationStatus, { accent: string; Icon: LucideIcon }>
> = {
  accepted: { accent: Colors.primaryDark, Icon: CircleCheck },
  sent: { accent: Colors.completed, Icon: Send },
  draft: { accent: Colors.textSecondary, Icon: FileText },
  rejected: { accent: Colors.error, Icon: CircleX },
};

/** Same icons as the customer trip-type options; Local has none there. */
const TRIP_TYPE_ICON: Readonly<Record<UcTripType, LucideIcon>> = {
  one_way: Plane,
  round_trip: RefreshCw,
  local: MapPin,
};

const SERVICE_ICON: Readonly<Record<UcServiceType, LucideIcon>> = {
  car_rental: Car,
  bus_rental: Bus,
  tempo_traveller: Bus,
  rail_rental: TrainFront,
};

/* ================================================================
 * Card
 * ================================================================ */

const UcQuotationCardBase: React.FC<Props> = ({ item, onPress, onMore }) => {
  const status = STATUS_STYLE[item.status] ?? STATUS_STYLE.draft;
  const StatusIcon = status.Icon;
  const TripIcon = TRIP_TYPE_ICON[item.tripType] ?? MapPin;
  const ServiceIcon = SERVICE_ICON[item.serviceType] ?? Car;

  const statusLabel = UC_QUOTATION_STATUS_LABEL[item.status];
  const tripTypeLabel = formatTripType(item);
  const route = formatRoute(item);
  const dateText = formatTravelDateRange(item);
  const dateA11y = `${formatDayMonthYear(
    item.travelDateStart,
  )} to ${formatDayMonthYear(item.travelDateEnd)}`;
  const daysText = formatDays(item.days);
  const vehicleText = formatVehicle(item);
  const avatar = avatarColorFor(item.customerId);

  /* -------- Copy quotation number -------- */
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copied = copiedRef === item.quotationNumber;

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    [],
  );

  const onCopy = useCallback(
    (e: GestureResponderEvent) => {
      e.stopPropagation();
      Clipboard.setString(item.quotationNumber);
      setCopiedRef(item.quotationNumber);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(
        () => setCopiedRef(null),
        COPIED_FLASH_MS,
      );
    },
    [item.quotationNumber],
  );

  /* -------- Navigation -------- */
  const handlePress = useCallback(() => onPress(item), [onPress, item]);

  const handleMore = useCallback(
    (e: GestureResponderEvent) => {
      e.stopPropagation();
      onMore(item);
    },
    [onMore, item],
  );

  const handleViewDetails = useCallback(
    (e: GestureResponderEvent) => {
      e.stopPropagation();
      onPress(item);
    },
    [onPress, item],
  );

  /* -------- Render -------- */

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        { borderLeftColor: status.accent },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Quotation ${item.quotationNumber}, ${statusLabel}, ${tripTypeLabel}, ${route}, ${dateA11y}, ${daysText}, ${vehicleText}, customer ${item.customerName}`}
    >
      {/* Row 1 — status + trip type (left), quotation id (right) */}
      <View style={styles.headerRow}>
        <View style={styles.tagsRow}>
          <View style={[styles.pill, { backgroundColor: status.accent }]}>
            <StatusIcon
              size={12}
              color={Colors.textOnPrimary}
              strokeWidth={2.5}
            />
            <Text style={styles.pillText}>{statusLabel}</Text>
          </View>
          <View style={styles.tripTag}>
            <TripIcon
              size={12}
              color={Colors.textSecondary}
              strokeWidth={2.5}
            />
            <Text style={styles.tripTagText}>{tripTypeLabel}</Text>
          </View>
        </View>

        <View style={styles.idBlock}>
          <Text style={styles.idLabel}>Quotation ID</Text>
          <View style={styles.idRow}>
            <Text style={styles.idValue} selectable>
              {item.quotationNumber}
            </Text>
            <Pressable
              onPress={onCopy}
              hitSlop={8}
              style={({ pressed }) => [
                styles.copyBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                copied
                  ? `Quotation ID ${item.quotationNumber} copied`
                  : `Copy quotation ID ${item.quotationNumber}`
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

      {/* Row 2 — route (wraps) */}
      <Text style={styles.route}>{route}</Text>

      {/* Row 3 — date range · days · vehicle (wraps on narrow phones) */}
      <View style={styles.metaRow}>
        <MetaItem Icon={Calendar} text={dateText} />
        <MetaItem Icon={Clock} text={daysText} />
        <MetaItem Icon={ServiceIcon} text={vehicleText} />
      </View>

      <View style={styles.divider} />

      {/* Row 4 — customer (left), ⋮ + View details (right) */}
      <View style={styles.footerRow}>
        <View style={styles.customer}>
          <View style={[styles.avatar, { backgroundColor: avatar.bg }]}>
            <Text style={[styles.avatarText, { color: avatar.fg }]}>
              {initials(item.customerName)}
            </Text>
          </View>
          <View style={styles.customerText}>
            <Text style={styles.customerName} numberOfLines={1}>
              {item.customerName}
            </Text>
            <Text style={styles.customerPhone}>{item.customerPhone}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={handleMore}
            hitSlop={10}
            style={({ pressed }) => [
              styles.moreBtn,
              pressed && styles.morePressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`More actions for ${item.quotationNumber}`}
          >
            <EllipsisVertical
              size={20}
              color={Colors.iconSecondary}
              strokeWidth={2}
            />
          </Pressable>
          <Pressable
            onPress={handleViewDetails}
            hitSlop={8}
            style={({ pressed }) => [
              styles.detailsBtn,
              pressed && styles.detailsBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`View details for quotation ${item.quotationNumber}`}
          >
            <Text style={styles.detailsText}>View details</Text>
            <ChevronRight
              size={16}
              color={Colors.primaryDark}
              strokeWidth={2.5}
            />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
};

export const UcQuotationCard = memo(UcQuotationCardBase);
UcQuotationCard.displayName = 'UcQuotationCard';

/* ================================================================
 * Meta item
 * ================================================================ */

const MetaItem: React.FC<{ Icon: LucideIcon; text: string }> = ({
  Icon,
  text,
}) => (
  <View style={styles.metaItem}>
    <Icon size={14} color={Colors.textSecondary} strokeWidth={2} />
    <Text style={styles.metaText}>{text}</Text>
  </View>
);

/* ================================================================
 * Styles
 * ================================================================ */

const ACCENT_EDGE = 4;
const AVATAR = 32;
const MORE_BTN = 28;

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

  /* Row 1 — tags + id (same sizes as UcBookingCard / UcTripCard) */
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
    color: Colors.textOnPrimary,
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
  route: {
    ...Typography.title,
    fontSize: FontSize.xl,
    lineHeight: LineHeight.lg,
    fontWeight: FontWeight.extraBold,
    color: Colors.textPrimary,
  },

  /* Row 3 — meta */
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: Spacing.md,
    rowGap: Spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: FontWeight.medium,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },

  /* Row 4 — customer + actions */
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  customer: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.bodySmall,
    fontWeight: FontWeight.extraBold,
    includeFontPadding: false,
  },
  customerText: {
    flex: 1,
    minWidth: 0,
  },
  customerName: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
  },
  customerPhone: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  moreBtn: {
    width: MORE_BTN,
    height: MORE_BTN,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  morePressed: {
    backgroundColor: Colors.surfaceMuted,
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
  },
  detailsBtnPressed: {
    opacity: 0.8,
  },
  detailsText: {
    ...Typography.bodySmall,
    color: Colors.primaryDark,
    fontWeight: FontWeight.bold,
    includeFontPadding: false,
  },
});
