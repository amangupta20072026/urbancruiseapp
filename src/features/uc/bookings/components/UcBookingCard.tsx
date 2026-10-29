/**
 * ------------------------------------------------------------------
 * UcBookingCard — one row on the UC Bookings tab
 * ------------------------------------------------------------------
 * Compact layout (same on every screen width):
 *
 *   (● Ongoing)                              BKG-2611-467128 ⧉
 *   Delhi → Jaipur                              (Round Trip)
 *   📅 06 Nov 2026   ◷ 09:30 AM   👥 4 Passengers
 *   🚗 Innova Crysta (7 Seater)                  ₹7,850.00
 *   👤 Aarav Sharma                        [View Details ›]
 *   ┄ ✓ ━━━━ ✓ ━━━━ (🚗) ┄┄┄┄ ○ ┄
 *
 * `layout` is still accepted so BookingsScreen needn't change, but
 * the card no longer switches layouts.
 *
 * Behaviour:
 *   - The person row is the CUSTOMER. Phone / category are on the
 *     booking details screen, not on the list card.
 *   - Copy icon puts the booking ref on the clipboard and flashes a
 *     check for 1.5s.
 *   - View Details → `onViewDetails(item)`.
 *
 * FlashList notes:
 *   - Memoised; the screen keeps `item` refs and handlers stable.
 *   - FlashList RECYCLES rows, so the copied flag stores WHICH ref
 *     was copied, not a boolean — a recycled row can never inherit a
 *     stale check mark (same pattern as HistoryTripCard).
 * ------------------------------------------------------------------
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  ArrowRight,
  Calendar,
  Car,
  Check,
  ChevronRight,
  Clock,
  Copy,
  User,
  Users,
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
import { formatMoney } from '@app-types/currency';
// Direct file import (not the feature index) so the UC bundle
// doesn't evaluate other features' screens.
import { getTripTypeOption } from '@features/customer/quotations/tripTypeOptions';

import type { UcBookingListItem } from '../types';
import { buildBookingTimeline } from '../utils/bookingTimeline';
import {
  UC_BOOKING_STATUS_VISUAL,
  formatBookingDate,
  formatBookingTime,
  formatPassengers,
  formatVehicle,
} from '../utils/format';
import { BookingProgressTracker } from './BookingProgressTracker';

export type UcBookingCardLayout = 'wide' | 'compact';

type Props = {
  item: UcBookingListItem;
  /** Ignored — kept for BookingsScreen compatibility. */
  layout?: UcBookingCardLayout;
  onViewDetails: (item: UcBookingListItem) => void;
};

const COPIED_FLASH_MS = 1500;

const UcBookingCardImpl: React.FC<Props> = ({ item, onViewDetails }) => {
  const visual = UC_BOOKING_STATUS_VISUAL[item.status];
  const StatusIcon = visual.Icon;
  const tripTypeLabel = getTripTypeOption(item.tripType).label;
  const amount = formatMoney(item.amount);
  const timeline = useMemo(
    () => buildBookingTimeline(item.status, item.progressStep),
    [item.status, item.progressStep],
  );

  /* -------- Copy booking ref -------- */
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copied = copiedRef === item.bookingRef;

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    [],
  );

  const onCopyRef = useCallback(() => {
    Clipboard.setString(item.bookingRef);
    setCopiedRef(item.bookingRef);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(
      () => setCopiedRef(null),
      COPIED_FLASH_MS,
    );
  }, [item.bookingRef]);

  const handleViewDetails = useCallback(
    () => onViewDetails(item),
    [onViewDetails, item],
  );

  /* -------- Render -------- */

  return (
    <View style={styles.card}>
      {/* Row 1: status | booking ref */}
      <View style={styles.headerRow}>
        <View
          style={[styles.statusPill, { backgroundColor: visual.bg }]}
          accessible
          accessibilityLabel={`Status: ${visual.label}`}
        >
          <StatusIcon size={16} color={visual.fg} strokeWidth={2.4} />
          <Text style={[styles.statusText, { color: visual.fg }]}>
            {visual.label}
          </Text>
        </View>

        <View style={styles.refRow}>
          <Text style={styles.refText} selectable>
            {item.bookingRef}
          </Text>
          <Pressable
            onPress={onCopyRef}
            hitSlop={10}
            style={({ pressed }) => pressed && styles.pressed}
            accessibilityRole="button"
            accessibilityLabel={
              copied
                ? `Booking ID ${item.bookingRef} copied`
                : `Copy booking ID ${item.bookingRef}`
            }
          >
            {copied ? (
              <Check size={16} color={Colors.success} strokeWidth={2.5} />
            ) : (
              <Copy size={16} color={Colors.textSecondary} strokeWidth={2} />
            )}
          </Pressable>
        </View>
      </View>

      {/* Row 2: route | trip type */}
      <View style={styles.routeLine}>
        <View
          style={styles.routeRow}
          accessible
          accessibilityLabel={`${item.fromCity} to ${item.toCity}`}
        >
          <Text style={styles.routeCity} numberOfLines={1}>
            {item.fromCity}
          </Text>
          <ArrowRight size={18} color={Colors.textPrimary} strokeWidth={2.2} />
          <Text style={styles.routeCity} numberOfLines={1}>
            {item.toCity}
          </Text>
        </View>
        <View
          style={styles.typePill}
          accessible
          accessibilityLabel={`Trip type: ${tripTypeLabel}`}
        >
          <Text style={styles.typeText} numberOfLines={1}>
            {tripTypeLabel}
          </Text>
        </View>
      </View>

      {/* Line 1: date · time · passengers */}
      <View style={styles.inlineRow}>
        <MetaItem Icon={Calendar} text={formatBookingDate(item.scheduledAt)} />
        <MetaItem Icon={Clock} text={formatBookingTime(item.scheduledAt)} />
        <MetaItem Icon={Users} text={formatPassengers(item.passengers)} />
      </View>

      {/* Line 2: vehicle + amount */}
      <View
        style={styles.splitRow}
        accessible
        accessibilityLabel={`${formatVehicle(
          item.vehicleName,
          item.seatingCapacity,
        )}, total amount ${amount}`}
      >
        <View style={styles.leftSlot}>
          <MetaItem
            Icon={Car}
            text={formatVehicle(item.vehicleName, item.seatingCapacity)}
          />
        </View>
        <Text style={styles.amount} numberOfLines={1}>
          {amount}
        </Text>
      </View>

      {/* Line 3: customer + View Details */}
      <View style={styles.splitRow}>
        <View style={styles.leftSlot}>
          <MetaItem Icon={User} text={item.customerName} bold />
        </View>
        <Pressable
          onPress={handleViewDetails}
          hitSlop={4}
          style={({ pressed }) => [
            styles.detailsBtn,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`View details for booking ${item.bookingRef}`}
        >
          <Text style={styles.detailsText}>View Details</Text>
          <ChevronRight
            size={16}
            color={Colors.primaryDark}
            strokeWidth={2.4}
          />
        </Pressable>
      </View>

      {/* Row 3: progress */}
      <BookingProgressTracker steps={timeline} color={visual.fg} />
    </View>
  );
};

export const UcBookingCard = React.memo(UcBookingCardImpl);
UcBookingCard.displayName = 'UcBookingCard';

/* ---------------- Sub-components ---------------- */

const MetaItem: React.FC<{
  Icon: LucideIcon;
  text: string;
  bold?: boolean;
}> = ({ Icon, text, bold }) => (
  <View style={styles.metaItem}>
    <Icon size={15} color={Colors.textSecondary} strokeWidth={2} />
    <Text
      style={[styles.metaText, bold && styles.metaTextBold]}
      numberOfLines={1}
    >
      {text}
    </Text>
  </View>
);

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    ...Shadows.xs,
  },
  pressed: {
    opacity: 0.6,
  },

  /* Row 1 — ref pinned right by `marginLeft: 'auto'`. On a very
   * narrow screen the ref wraps to its own line instead of being
   * truncated (a truncated ref can't be read back to a customer). */
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: Spacing.sm,
    rowGap: Spacing.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  statusText: {
    ...Typography.body,
    fontWeight: FontWeight.semiBold,
  },
  refRow: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },

  /* Row 2 — route left, trip-type pill right */
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  routeRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  routeCity: {
    flexShrink: 1,
    fontSize: FontSize.xl,
    lineHeight: LineHeight.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  /* The border keeps the light grey pill visible on the white card
   * (#F8F9FA alone is almost the same as white). */
  typePill: {
    flexShrink: 0,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
  },
  typeText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },

  /* Detail lines */
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: Spacing.md,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  leftSlot: {
    flex: 1,
    minWidth: 0,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  metaText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  metaTextBold: {
    fontWeight: FontWeight.bold,
  },
  amount: {
    fontSize: FontSize.xl,
    lineHeight: LineHeight.xl,
    fontWeight: FontWeight.extraBold,
    color: Colors.textPrimary,
  },

  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 36,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryTint,
  },
  detailsText: {
    ...Typography.bodySmall,
    color: Colors.primaryDark,
    fontWeight: FontWeight.bold,
  },
});
