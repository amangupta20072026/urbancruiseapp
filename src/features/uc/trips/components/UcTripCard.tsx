/**
 * ------------------------------------------------------------------
 * UcTripCard — one row on the UC Trips tab
 * ------------------------------------------------------------------
 * The whole card is washed in the trip's status tone (UC_TRIP_TONE).
 *
 * WIDE layout (window >= 440dp, matches the approved design 1:1):
 *
 *   (● Ongoing)                              TRP-…-00012 ⧉
 *   Delhi → Jaipur
 *   📅 06 Nov 2026     │ 🚗 Innova Crysta │   ₹7,850.00
 *   ◷ 09:30 AM         │ 👤 Aarav Sharma  │  Total Amount
 *   👥 4 Passengers    │                  │
 *   ✓ ━━━━ ✓ ━━━━ ◉ ┄┄┄┄ ○
 *   [            👁 View Details            ]
 *
 * COMPACT layout (most phones, 360–430dp): a third column would
 * squeeze the vehicle and customer to "Inno…" / "Aara…", so the
 * amount moves to its own row under the two columns:
 *
 *   📅 06 Nov 2026     │ 🚗 Innova Crysta
 *   …                  │ 👤 Aarav Sharma
 *   Total Amount                          ₹7,850.00
 *
 * Behaviour:
 *   - The person row is the CUSTOMER (confirmed product decision).
 *   - Copy icon puts the trip ID on the clipboard and flashes a
 *     check for 1.5s.
 *   - View Details → `onViewDetails(item)`.
 *
 * FlashList notes:
 *   - Memoised; the screen keeps `item` refs and handlers stable.
 *   - FlashList RECYCLES rows, so the copied flag stores WHICH ID was
 *     copied, not a boolean — a recycled row can never inherit a
 *     stale check mark.
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
  Clock,
  Copy,
  Eye,
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
  Spacing,
  Typography,
} from '@theme';
import { formatMoney } from '@app-types/currency';
// Shared with UC Bookings — same tracker, Trips-design options below.
import { BookingProgressTracker } from '@features/uc/bookings/components/BookingProgressTracker';

import type { UcTripListItem } from '../types';
import { buildTripTimeline } from '../utils/tripTimeline';
import {
  UC_TRIP_TONE,
  formatPassengers,
  formatTripDate,
  formatTripTime,
} from '../utils/format';

export type UcTripCardLayout = 'wide' | 'compact';

type Props = {
  item: UcTripListItem;
  layout: UcTripCardLayout;
  onViewDetails: (item: UcTripListItem) => void;
};

const COPIED_FLASH_MS = 1500;

const UcTripCardImpl: React.FC<Props> = ({ item, layout, onViewDetails }) => {
  const tone = UC_TRIP_TONE[item.status];
  const amount = formatMoney(item.amount);
  const timeline = useMemo(
    () => buildTripTimeline(item.status, item.progressStep),
    [item.status, item.progressStep],
  );

  /* -------- Copy trip ID -------- */
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copied = copiedRef === item.tripRef;

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    [],
  );

  const onCopyRef = useCallback(() => {
    Clipboard.setString(item.tripRef);
    setCopiedRef(item.tripRef);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(
      () => setCopiedRef(null),
      COPIED_FLASH_MS,
    );
  }, [item.tripRef]);

  const handleViewDetails = useCallback(
    () => onViewDetails(item),
    [onViewDetails, item],
  );

  /* -------- Pieces -------- */

  const scheduleCol = (
    <View style={styles.scheduleCol}>
      <MetaItem Icon={Calendar} text={formatTripDate(item.scheduledAt)} />
      <MetaItem Icon={Clock} text={formatTripTime(item.scheduledAt)} />
      <MetaItem Icon={Users} text={formatPassengers(item.passengers)} />
    </View>
  );

  const peopleCol = (
    <View style={styles.peopleCol}>
      <MetaItem Icon={Car} text={item.vehicleName} />
      <MetaItem Icon={User} text={item.customerName} />
    </View>
  );

  /* -------- Render -------- */

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: tone.wash, borderColor: tone.border },
      ]}
    >
      {/* Row 1: status | trip ID */}
      <View style={styles.headerRow}>
        <View
          style={[styles.statusPill, { backgroundColor: tone.bg }]}
          accessible
          accessibilityLabel={`Status: ${tone.label}`}
        >
          <View style={[styles.statusDot, { backgroundColor: tone.fg }]} />
          <Text style={[styles.statusText, { color: tone.fg }]}>
            {tone.label}
          </Text>
        </View>

        <View style={styles.refRow}>
          <Text style={styles.refText} selectable>
            {item.tripRef}
          </Text>
          <Pressable
            onPress={onCopyRef}
            hitSlop={10}
            style={({ pressed }) => pressed && styles.pressed}
            accessibilityRole="button"
            accessibilityLabel={
              copied
                ? `Trip ID ${item.tripRef} copied`
                : `Copy trip ID ${item.tripRef}`
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

      {/* Row 2: route */}
      <View
        style={styles.routeRow}
        accessible
        accessibilityLabel={`${item.fromCity} to ${item.toCity}`}
      >
        <Text style={styles.routeCity} numberOfLines={1}>
          {item.fromCity}
        </Text>
        <ArrowRight size={20} color={Colors.textPrimary} strokeWidth={2.2} />
        <Text style={styles.routeCity} numberOfLines={1}>
          {item.toCity}
        </Text>
      </View>

      {/* Row 3: details */}
      {layout === 'wide' ? (
        <View style={styles.bodyRow}>
          {scheduleCol}
          <View style={styles.vDivider} />
          {peopleCol}
          <View style={styles.vDivider} />
          <View style={styles.amountCol}>
            <Text style={styles.amount} numberOfLines={1}>
              {amount}
            </Text>
            <Text style={styles.amountLabel}>Total Amount</Text>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.bodyRow}>
            {scheduleCol}
            <View style={styles.vDivider} />
            {peopleCol}
          </View>
          <View
            style={styles.amountRow}
            accessible
            accessibilityLabel={`Total amount ${amount}`}
          >
            <Text style={styles.amountLabel}>Total Amount</Text>
            <Text style={styles.amount} numberOfLines={1}>
              {amount}
            </Text>
          </View>
        </>
      )}

      {/* Row 4: progress */}
      <BookingProgressTracker
        steps={timeline}
        color={tone.fg}
        startedMarker="dot"
        edgeStubs={false}
        accessibilityPrefix="Trip progress"
      />

      {/* Row 5: View Details */}
      <Pressable
        onPress={handleViewDetails}
        style={({ pressed }) => [styles.detailsBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`View details for trip ${item.tripRef}`}
      >
        <Eye size={20} color={Colors.primaryDark} strokeWidth={2.2} />
        <Text style={styles.detailsText}>View Details</Text>
      </Pressable>
    </View>
  );
};

export const UcTripCard = React.memo(UcTripCardImpl);
UcTripCard.displayName = 'UcTripCard';

/* ---------------- Sub-components ---------------- */

const MetaItem: React.FC<{ Icon: LucideIcon; text: string }> = ({
  Icon,
  text,
}) => (
  <View style={styles.metaItem}>
    <Icon size={16} color={Colors.textSecondary} strokeWidth={2} />
    <Text style={styles.metaText} numberOfLines={1}>
      {text}
    </Text>
  </View>
);

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  pressed: {
    opacity: 0.6,
  },

  /* Row 1 — ref pinned right; wraps (never truncates) when narrow. */
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
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: Radius.circle,
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

  /* Row 2 */
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  routeCity: {
    flexShrink: 1,
    fontSize: FontSize.h5,
    lineHeight: LineHeight.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },

  /* Row 3 */
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.md,
  },
  vDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  scheduleCol: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.sm,
  },
  peopleCol: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minWidth: 0,
  },
  metaText: {
    ...Typography.body,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
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

  /* Row 5 */
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primaryDark,
    backgroundColor: Colors.surface,
  },
  detailsText: {
    ...Typography.subtitle,
    color: Colors.primaryDark,
    fontWeight: FontWeight.bold,
  },
});
