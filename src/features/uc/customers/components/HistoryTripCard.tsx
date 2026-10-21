/**
 * ------------------------------------------------------------------
 * HistoryTripCard
 * ------------------------------------------------------------------
 * One row of a customer's trip history. The whole card is tinted in
 * the trip's status tone (TRIP_STATUS_TONE): blue upcoming, green
 * completed, red cancelled, orange in progress, amber no-show.
 *
 *   ┌────────────────────────────────────────────────────────┐
 *   │ (◷ Upcoming) (⇆ Pickup & Drop)      BKG-2611-735510 ⧉ │
 *   │                                                        │
 *   │ Udaipur → Chandigarh                         ₹2,702.00 │
 *   │ 📅 03 Nov 2026  ◷ 10:30 AM  👥 3 Passengers  Total Amount│
 *   │ ────────────────────────────────────────────────────── │
 *   │   ●──────────○──────────○──────────○                    │
 *   │ Booked   Confirmed  Trip Starts  Completed              │
 *   │ ┌────────────────────────────────────────────────────┐ │
 *   │ │                  👁 View Details                    │ │
 *   │ └────────────────────────────────────────────────────┘ │
 *   └────────────────────────────────────────────────────────┘
 *
 * Behaviour:
 *   - Copy icon puts the booking ref on the clipboard and flashes a
 *     check for 1.5s.
 *   - View Details shows the "Coming soon" toast
 *     (`uc.bookingDetail`) until a UC booking-detail screen exists.
 *     When it lands, swap `onViewDetails` for a navigate() call.
 *
 * FlashList notes:
 *   - Memoised on `trip` (the parent's page flattening keeps refs
 *     stable).
 *   - FlashList RECYCLES row components, so local state survives a
 *     prop change. The copied flag therefore stores WHICH ref was
 *     copied, not a boolean — a recycled row showing another trip
 *     can never inherit a stale check mark.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { format } from 'date-fns';
import {
  ArrowRight,
  Calendar,
  Car,
  Check,
  CircleCheck,
  CircleX,
  Clock,
  Copy,
  Eye,
  UserX,
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
import { notifyComingSoon } from '@services/comingSoon';
// Direct file import (not the quotations index) so the UC bundle
// doesn't evaluate the customer quotation screens.
import { getTripTypeOption } from '@features/customer/quotations/tripTypeOptions';

import {
  TRIP_STATUS_LABEL,
  TRIP_STATUS_TONE,
  type Trip,
  type TripStatus,
} from '../types';
import { buildTripTimeline } from '../utils/tripTimeline';
import { TripProgressTracker } from './TripProgressTracker';

type Props = {
  trip: Trip;
};

/* ------------------------------------------------------------------ */
/* Static maps + formatters                                           */
/* ------------------------------------------------------------------ */

const STATUS_ICON: Readonly<Record<TripStatus, LucideIcon>> = {
  upcoming: Clock,
  in_progress: Car,
  completed: CircleCheck,
  cancelled: CircleX,
  no_show: UserX,
};

const COPIED_FLASH_MS = 1500;

/** "03 Nov 2026" — device local time, same as the previous card. */
const fmtDate = (iso: string): string => format(new Date(iso), 'dd MMM yyyy');

/** "10:30 AM" */
const fmtTime = (iso: string): string => format(new Date(iso), 'hh:mm a');

const fmtPassengers = (n: number): string =>
  `${n} ${n === 1 ? 'Passenger' : 'Passengers'}`;

/** No trip detail screen yet — module-level so rows share one fn. */
const onViewDetails = (): void => {
  notifyComingSoon('uc.bookingDetail');
};

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

const HistoryTripCardImpl: React.FC<Props> = ({ trip }) => {
  const tone = TRIP_STATUS_TONE[trip.status];
  const StatusIcon = STATUS_ICON[trip.status];
  const statusLabel = TRIP_STATUS_LABEL[trip.status];
  const { Icon: TripTypeIcon, label: tripTypeLabel } = getTripTypeOption(
    trip.tripType,
  );
  const timeline = React.useMemo(
    () => buildTripTimeline(trip.status, trip.progressStep),
    [trip.status, trip.progressStep],
  );

  /* -------- Copy booking ref -------- */
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copied = copiedRef === trip.bookingRef;

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    [],
  );

  const onCopyRef = useCallback(() => {
    Clipboard.setString(trip.bookingRef);
    setCopiedRef(trip.bookingRef);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(
      () => setCopiedRef(null),
      COPIED_FLASH_MS,
    );
  }, [trip.bookingRef]);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: tone.wash, borderColor: tone.border },
      ]}
    >
      {/* ---------- Row 1: status + trip type | booking ref ---------- */}
      <View style={styles.headerRow}>
        <View style={styles.tagsRow}>
          <View
            style={[styles.statusPill, { backgroundColor: tone.solid }]}
            accessible
            accessibilityLabel={`Status: ${statusLabel}`}
          >
            <StatusIcon
              size={14}
              color={Colors.textInverse}
              strokeWidth={2.4}
            />
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>

          <View
            style={styles.typePill}
            accessible
            accessibilityLabel={`Trip type: ${tripTypeLabel}`}
          >
            <TripTypeIcon
              size={13}
              color={Colors.textSecondary}
              strokeWidth={2.2}
            />
            <Text style={styles.typeText}>{tripTypeLabel}</Text>
          </View>
        </View>

        <View style={styles.refRow}>
          <Text style={styles.refText} selectable>
            {trip.bookingRef}
          </Text>
          <Pressable
            onPress={onCopyRef}
            hitSlop={10}
            style={({ pressed }) => pressed && styles.pressed}
            accessibilityRole="button"
            accessibilityLabel={
              copied
                ? `Booking ID ${trip.bookingRef} copied`
                : `Copy booking ID ${trip.bookingRef}`
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

      {/* ---------- Row 2: route + meta | amount ---------- */}
      <View style={styles.bodyRow}>
        <View style={styles.bodyMain}>
          <View
            style={styles.routeRow}
            accessible
            accessibilityLabel={`${trip.fromCity} to ${trip.toCity}`}
          >
            <Text style={styles.routeCity} numberOfLines={1}>
              {trip.fromCity}
            </Text>
            <ArrowRight
              size={20}
              color={Colors.textSecondary}
              strokeWidth={2.2}
            />
            <Text style={styles.routeCity} numberOfLines={1}>
              {trip.toCity}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <MetaItem Icon={Calendar} text={fmtDate(trip.scheduledAt)} />
            <MetaItem Icon={Clock} text={fmtTime(trip.scheduledAt)} />
            <MetaItem Icon={Users} text={fmtPassengers(trip.passengers)} />
          </View>
        </View>

        <View style={styles.amountCol}>
          <Text style={styles.amount} numberOfLines={1}>
            {formatMoney(trip.amount)}
          </Text>
          <Text style={styles.amountLabel}>Total Amount</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* ---------- Row 3: progress tracker ---------- */}
      <TripProgressTracker steps={timeline} color={tone.solid} />

      {/* ---------- Row 4: View Details ---------- */}
      <Pressable
        onPress={onViewDetails}
        style={({ pressed }) => [
          styles.detailsBtn,
          { borderColor: tone.solid },
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`View details for booking ${trip.bookingRef}`}
      >
        <Eye size={18} color={tone.solid} strokeWidth={2.2} />
        <Text style={[styles.detailsText, { color: tone.solid }]}>
          View Details
        </Text>
      </Pressable>
    </View>
  );
};

/* React.memo — trip records are immutable from the row's POV.
 * A referential-equality check on `trip` is enough because the parent
 * flattens pages via useMemo, so refs are stable across renders. */
export const HistoryTripCard = React.memo(HistoryTripCardImpl);
HistoryTripCard.displayName = 'HistoryTripCard';

/* ---------------- Sub-components ---------------- */

const MetaItem: React.FC<{ Icon: LucideIcon; text: string }> = ({
  Icon,
  text,
}) => (
  <View style={styles.metaItem}>
    <Icon size={14} color={Colors.textSecondary} strokeWidth={2} />
    <Text style={styles.metaText} numberOfLines={1}>
      {text}
    </Text>
  </View>
);

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  pressed: {
    opacity: 0.6,
  },

  /* Row 1 */
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: Spacing.sm,
    rowGap: Spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  statusText: {
    ...Typography.label,
    color: Colors.textInverse,
    fontWeight: FontWeight.semiBold,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  typeText: {
    ...Typography.label,
    color: Colors.textSecondary,
  },
  /* `marginLeft: 'auto'` pins the ref to the right edge; on narrow
   * screens the row wraps and the ref drops to its own line instead
   * of being truncated. */
  refRow: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refText: {
    ...Typography.label,
    color: Colors.textSecondary,
  },

  /* Row 2 */
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  bodyMain: {
    flex: 1,
    gap: Spacing.sm,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  routeCity: {
    flexShrink: 1,
    fontSize: FontSize.xxl,
    lineHeight: LineHeight.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.md,
    rowGap: Spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  amountCol: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  amount: {
    fontSize: FontSize.xl,
    lineHeight: LineHeight.xl,
    fontWeight: FontWeight.extraBold,
    color: Colors.textPrimary,
  },
  amountLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },

  /* Row 4 */
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    minHeight: 44,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    backgroundColor: Colors.surface,
  },
  detailsText: {
    ...Typography.subtitle,
    fontWeight: FontWeight.bold,
  },
});
