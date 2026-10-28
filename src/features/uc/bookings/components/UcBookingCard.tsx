/**
 * ------------------------------------------------------------------
 * UcBookingCard — one row on the UC Bookings tab
 * ------------------------------------------------------------------
 * WIDE layout (window >= 440dp, matches the approved design 1:1):
 *
 *   (● Ongoing)                                  BKG-2611-467128 ⧉
 *                                                    (🚗 Round Trip)
 *   Aarav Sharma     │ Delhi → Jaipur              │   ₹7,850.00
 *   📞 +91 ***** 43210│ 📅 06 Nov 2026  ◷ 09:30 AM  │  Total Amount
 *   🏢 Corporate      │ 👥 4 Passengers             │ [View Details ›]
 *                    │ 🚗 Innova Crysta (7 Seater) │
 *   ┄ ✓ ━━━━ ✓ ━━━━ (🚗) ┄┄┄┄ ○ ┄
 *
 * COMPACT layout (most phones, 360–430dp): the amount column would
 * squeeze the route to "Del… → Jai…", so it moves to its own row:
 *
 *   Aarav Sharma     │ Delhi → Jaipur
 *   …                │ …
 *   ₹7,850.00                              [View Details ›]
 *   Total Amount
 *
 * Header: row 1 = status pill (left) + booking ref (right); row 2 =
 * trip type pill on the right, on the light grey backgroundSecondary.
 *
 * Behaviour:
 *   - Phone is shown MASKED (maskPhone), like every other UC surface
 *     (customer summary card, directory). Display only.
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
  Building2,
  Calendar,
  Car,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Phone,
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
import { maskPhone } from '@shared/utils';
// Direct file imports (not feature index files) so the UC bundle
// doesn't evaluate other features' screens.
import { getTripTypeOption } from '@features/customer/quotations/tripTypeOptions';
import { CUSTOMER_CATEGORY_LABEL } from '@features/uc/customers/types';

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
  layout: UcBookingCardLayout;
  onViewDetails: (item: UcBookingListItem) => void;
};

const COPIED_FLASH_MS = 1500;

const UcBookingCardImpl: React.FC<Props> = ({
  item,
  layout,
  onViewDetails,
}) => {
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

  /* -------- Pieces -------- */

  const customerCol = (
    <View style={styles.customerCol}>
      <Text style={styles.customerName} numberOfLines={1}>
        {item.customerName}
      </Text>
      <MetaItem Icon={Phone} text={maskPhone(item.customerPhone)} />
      <MetaItem
        Icon={Building2}
        text={CUSTOMER_CATEGORY_LABEL[item.customerCategory]}
      />
    </View>
  );

  const tripCol = (
    <View style={styles.tripCol}>
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
      <View style={styles.dateRow}>
        <MetaItem Icon={Calendar} text={formatBookingDate(item.scheduledAt)} />
        <MetaItem Icon={Clock} text={formatBookingTime(item.scheduledAt)} />
      </View>
      <MetaItem Icon={Users} text={formatPassengers(item.passengers)} />
      <MetaItem
        Icon={Car}
        text={formatVehicle(item.vehicleName, item.seatingCapacity)}
      />
    </View>
  );

  const amountBlock = (
    <View style={layout === 'wide' ? styles.amountWide : styles.amountCompact}>
      <Text style={styles.amount} numberOfLines={1}>
        {amount}
      </Text>
      <Text style={styles.amountLabel}>Total Amount</Text>
    </View>
  );

  const detailsButton = (
    <Pressable
      onPress={handleViewDetails}
      style={({ pressed }) => [styles.detailsBtn, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`View details for booking ${item.bookingRef}`}
    >
      <Text style={styles.detailsText}>View Details</Text>
      <ChevronRight size={18} color={Colors.primaryDark} strokeWidth={2.4} />
    </Pressable>
  );

  /* -------- Render -------- */

  return (
    <View style={styles.card}>
      {/* Header: [status | booking ref] then [trip type] on the right */}
      <View style={styles.header}>
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

        <View
          style={styles.typePill}
          accessible
          accessibilityLabel={`Trip type: ${tripTypeLabel}`}
        >
          <Car size={15} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.typeText}>{tripTypeLabel}</Text>
        </View>
      </View>

      {/* Row 2: body */}
      {layout === 'wide' ? (
        <View style={styles.bodyRow}>
          {customerCol}
          <View style={styles.vDivider} />
          {tripCol}
          <View style={styles.vDivider} />
          <View style={styles.amountCol}>
            {amountBlock}
            {detailsButton}
          </View>
        </View>
      ) : (
        <>
          <View style={styles.bodyRow}>
            {customerCol}
            <View style={styles.vDivider} />
            {tripCol}
          </View>
          <View style={styles.footerRow}>
            {amountBlock}
            {detailsButton}
          </View>
        </>
      )}

      {/* Row 3: progress */}
      <BookingProgressTracker steps={timeline} color={visual.fg} />
    </View>
  );
};

export const UcBookingCard = React.memo(UcBookingCardImpl);
UcBookingCard.displayName = 'UcBookingCard';

/* ---------------- Sub-components ---------------- */

const MetaItem: React.FC<{ Icon: LucideIcon; text: string }> = ({
  Icon,
  text,
}) => (
  <View style={styles.metaItem}>
    <Icon size={15} color={Colors.textSecondary} strokeWidth={2} />
    <Text style={styles.metaText} numberOfLines={1}>
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
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.lg,
    ...Shadows.xs,
  },
  pressed: {
    opacity: 0.6,
  },

  /* Header */
  header: {
    gap: Spacing.sm,
  },
  /* Status left, ref pinned right by `marginLeft: 'auto'`. On a very
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
    paddingVertical: 6,
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
  /* Right-aligned. The border keeps the light grey pill visible on
   * the white card (#F8F9FA alone is almost the same as white). */
  typePill: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
  },
  typeText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },

  /* Row 2 */
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.md,
  },
  vDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  customerCol: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.sm,
  },
  customerName: {
    fontSize: FontSize.xl,
    lineHeight: LineHeight.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  tripCol: {
    flex: 1.4,
    minWidth: 0,
    gap: Spacing.sm,
  },
  routeRow: {
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
  dateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.md,
    rowGap: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  metaText: {
    ...Typography.body,
    color: Colors.textSecondary,
    flexShrink: 1,
  },

  /* Amount — wide: own column; compact: footer row */
  amountCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  amountWide: {
    alignItems: 'flex-end',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  amountCompact: {
    flexShrink: 1,
  },
  amount: {
    fontSize: FontSize.xxl,
    lineHeight: LineHeight.xl,
    fontWeight: FontWeight.extraBold,
    color: Colors.textPrimary,
  },
  amountLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },

  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 44,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryTint,
  },
  detailsText: {
    ...Typography.body,
    color: Colors.primaryDark,
    fontWeight: FontWeight.bold,
  },
});
