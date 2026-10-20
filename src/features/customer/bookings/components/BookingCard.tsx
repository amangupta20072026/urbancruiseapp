/**
 * ------------------------------------------------------------------
 * BookingCard
 * ------------------------------------------------------------------
 * One row in the Customer Bookings list. Composition:
 *
 *   ┌───────────────────────────────────────────────────────┐
 *   │ [status pill] [trip type]                  Booking ID │
 *   │ ┌────────┐ Delhi  →  Jaipur         BK-2026-001234 📋 │
 *   │ │  🚌   │  📅 15 Sep  🕐 09:00 AM  👥 20 Passengers  │
 *   │ │ image │  Tempo Traveller               ₹18,500      │
 *   │ └────────┘ 17 Seater | AC              Total Amount   │
 *   │ ─────────────────────────────────────────────────── │
 *   │  (upcoming only) BookingProgressTracker              │
 *   │ [           View Details           ]                 │
 *   └───────────────────────────────────────────────────────┘
 *
 * Trip type badge — the same One Way / Round Trip / Pickup & Drop
 * tag as QuotationCard (icon + label from `getTripTypeOption`), shown
 * next to the status pill. Round trips and pickup & drop trips read
 * "X → X" in the route row, also matching QuotationCard.
 *
 * Status drives:
 *   1. status pill (colour + label + optional icon)
 *   2. vehicle image tile background tint
 *   3. bottom action buttons (which ones + their colours)
 *   4. whether the progress tracker renders (upcoming only)
 *   5. the outer card background (upcoming = primaryTint hero-card)
 *
 * Vehicle imagery — the mockup renders a small photo of the vehicle
 * in a tinted square. Real photos aren't in-repo, so this card
 * falls back to a lucide glyph inside the tinted tile using the
 * vehicle-type → icon mapping. When photo assets ship, swap the
 * <Icon /> for an <Image source={vehiclePhoto(item.vehicleType)} />
 * — the tile size / tint stays.
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
  Calendar,
  Check,
  Clock,
  Copy,
  Eye,
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
 * The whole-card wash + border stay here: only this card uses them.
 */
type StatusStyle = BookingStatusVisual & {
  /**
   * Whole-card wash + border, one per status (same approach as
   * QuotationCard). Lighter than the pill's `bg` so the pill still
   * stands out and the white outline buttons read as raised.
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** ₹18,500 — Indian grouping. */
function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
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

  /* -------- Copy Booking ID -------- *
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
        { backgroundColor: style.cardBg, borderColor: style.cardBorder },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Booking ${item.bookingNumber}, ${style.label}, ${tripType.label}, ${item.from} to ${item.to}`}
    >
      {/* Row 1 — status pill + trip type (left), booking id (right) */}
      <View style={styles.headerRow}>
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

      {/* Row 2 — route (flex-1, full width) + amount (right) */}
      <View style={styles.routeAmountRow}>
        <View style={styles.routeCol}>
          <Text style={styles.routeText} numberOfLines={1}>
            {item.from}
          </Text>
          <ArrowRight
            size={18}
            color={Colors.textSecondary}
            strokeWidth={2.5}
          />
          <Text style={styles.routeText} numberOfLines={1}>
            {item.to}
          </Text>
        </View>
        <View style={styles.amountCol}>
          <Text style={styles.amount}>{formatRupees(item.totalAmount)}</Text>
          <Text style={styles.amountLabel}>Total Amount</Text>
        </View>
      </View>

      {/* Row 3 — inline meta (date · time · pax). With no image tile
          eating horizontal space, these fit on one line on any
          phone width; `flexWrap` is kept as a safety net for very
          narrow devices / long localised numbers. */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Calendar size={14} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.metaText}>{formatDate(item.travelDate)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Clock size={14} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.metaText}>{item.pickupTime}</Text>
        </View>
        <View style={styles.metaItem}>
          <Users size={14} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.metaText}>{item.passengers} Passengers</Text>
        </View>
      </View>

      {/* Row 4 — vehicle on a single line */}
      <Text style={styles.vehicleText}>
        <Text style={styles.vehicleName}>
          {item.vehicleModel ?? item.vehicleType}
        </Text>
        <Text style={styles.vehicleSub}>
          {(() => {
            const bits = [
              item.seater ? `${item.seater} Seater` : item.vehicleType,
            ].filter(Boolean);
            return bits.length > 0 ? `  ·  ${bits.join(' | ')}` : '';
          })()}
        </Text>
      </Text>

      {/* Progress tracker — upcoming only */}
      {isUpcoming ? (
        <>
          <View style={styles.trackerDivider} />
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
    </Pressable>
  );
};

/* ================================================================
 * Action-row renderer — one branch per status
 * ================================================================ *
 * Kept in a function (not inline JSX) because the branching gets
 * noisy and this keeps the card body readable.
 */

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
 * ================================================================ *
 * Keeps callers declarative and centralises the paint. If a variant
 * grows past this file's needs, promote to a shared Button.
 */

type ActionVariant =
  | 'primary' // solid green (Modify Booking)
  | 'outline' // white with green border (View Details on Upcoming)
  | 'outlineNeutral' // white with grey border
  | 'secondary' // white with gold border + text (View Details on Ongoing / Completed / Cancelled)
  | 'info' // white with blue border, blue text (Track Vehicle)
  | 'successOutline' // white with green border + text (Book Again, Completed)
  | 'dangerOutline'; // white with red border + text (Book Again, Cancelled)

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
  // secondaryDark (not secondary) for both border and text: the lighter
  // gold is too faint as text on white.
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
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 6,
    ...Shadows.xs,
  },

  /* Row 1 — pill + booking id */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
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
  /* Status pill + trip type tag. flex: 1 lets the pair wrap onto a
   * second line on narrow phones instead of squeezing the booking id.
   * Tag styles mirror QuotationCard so the two badges look identical. */
  tagsRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
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
  copyBtn: {
    padding: 2,
  },
  idValue: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '700',
    includeFontPadding: false,
  },

  /* Row 2 — route + amount */
  routeAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  routeCol: {
    flex: 1,
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

  /* Tracker divider — appears above the tracker in upcoming cards. */
  trackerDivider: {
    height: 1,
    backgroundColor: Colors.primary + '22',
    marginTop: 2,
  },

  /* Bottom actions */
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
