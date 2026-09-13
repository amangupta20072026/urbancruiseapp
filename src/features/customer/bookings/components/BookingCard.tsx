/**
 * ------------------------------------------------------------------
 * BookingCard
 * ------------------------------------------------------------------
 * One row in the Customer Bookings list. Composition:
 *
 *   ┌───────────────────────────────────────────────────────┐
 *   │ [status pill]                              Booking ID │
 *   │ ┌────────┐ Delhi  →  Jaipur                BK-… -00123│
 *   │ │  🚌   │  📅 15 Sep  🕐 09:00 AM  👥 20 Passengers  │
 *   │ │ image │  Tempo Traveller               ₹18,500      │
 *   │ └────────┘ 17 Seater | AC              Total Amount   │
 *   │ ─────────────────────────────────────────────────── │
 *   │  (upcoming only) BookingProgressTracker              │
 *   │ [ View Details ]   [ Modify Booking ]                │
 *   └───────────────────────────────────────────────────────┘
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

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ArrowRight,
  Calendar,
  Check,
  Clock,
  ExternalLink,
  Navigation,
  RotateCw,
  Users,
} from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
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

type StatusStyle = {
  label: string;
  Icon: IconComp | null; // null → pill text only, no glyph
  fg: string;
  bg: string;
  /** Outer card background tint (upcoming = green hero look). */
  cardBg: string;
};

const STATUS_STYLE: Record<BookingStatus, StatusStyle> = {
  upcoming: {
    label: 'Upcoming',
    Icon: null,
    fg: Colors.primary,
    bg: Colors.primaryTint,
    cardBg: '#EAF7EE', // slightly deeper than primaryTint — matches mockup hero
  },
  ongoing: {
    label: 'Ongoing',
    Icon: null,
    fg: Colors.info,
    bg: Colors.infoTint,
    cardBg: Colors.surface,
  },
  completed: {
    label: 'Completed',
    Icon: Check,
    fg: Colors.primary,
    bg: Colors.primaryTint,
    cardBg: Colors.surface,
  },
  cancelled: {
    label: 'Cancelled',
    Icon: Clock,
    fg: Colors.error,
    bg: Colors.errorTint,
    cardBg: Colors.surface,
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

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
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
  const isUpcoming = item.status === 'upcoming';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: style.cardBg },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Booking ${item.bookingNumber}, ${style.label}`}
    >
      {/* Row 1 — status pill (left) + booking id block (right) */}
      <View style={styles.headerRow}>
        <View style={[styles.pill, { backgroundColor: style.bg }]}>
          {style.Icon ? (
            <style.Icon size={12} color={style.fg} strokeWidth={2.5} />
          ) : null}
          <Text style={[styles.pillText, { color: style.fg }]}>
            {style.label}
          </Text>
        </View>
        <View style={styles.idBlock}>
          <Text style={styles.idLabel}>Booking ID</Text>
          <Text style={styles.idValue}>{item.bookingNumber}</Text>
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
              item.hasAC ? 'AC' : null,
            ].filter(Boolean);
            return bits.length > 0 ? `  ·  ${bits.join(' | ')}` : '';
          })()}
        </Text>
      </Text>

      {/* Progress tracker — upcoming only */}
      {isUpcoming ? (
        <>
          <View style={styles.trackerDivider} />
          <BookingProgressTracker
            currentStep={item.progressStep}
            subLabels={{
              booked: formatDateShort(item.bookedDate),
              confirmed: item.progressNote ?? undefined,
              started: formatDateShort(item.travelDate),
            }}
          />
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
        <>
          <ActionButton
            label="View Details"
            variant="outline"
            onPress={a.onViewDetails}
          />
          <ActionButton
            label="Modify Booking"
            variant="primary"
            onPress={a.onModifyBooking}
          />
        </>
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
            variant="outlineNeutral"
            onPress={a.onViewDetails}
          />
        </>
      );
    case 'completed':
      return (
        <>
          <ActionButton
            label="View Details"
            variant="outlineNeutral"
            onPress={a.onViewDetails}
          />
          <ActionButton
            label="Book Again"
            variant="successSoft"
            LeadingIcon={ExternalLink}
            onPress={a.onBookAgain}
          />
        </>
      );
    case 'cancelled':
      return (
        <>
          <ActionButton
            label="View Details"
            variant="outlineNeutral"
            onPress={a.onViewDetails}
          />
          <ActionButton
            label="Book Again"
            variant="dangerSoft"
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
  | 'outlineNeutral' // white with grey border (View Details elsewhere)
  | 'info' // white with blue border, blue text (Track Vehicle)
  | 'successSoft' // green tint bg with green text (Book Again, Completed)
  | 'dangerSoft'; // red tint bg with red text (Book Again, Cancelled)

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
  info: {
    bg: Colors.surface,
    border: Colors.info,
    text: Colors.info,
  },
  successSoft: {
    bg: Colors.primaryTint,
    border: Colors.primaryTint,
    text: Colors.primary,
  },
  dangerSoft: {
    bg: Colors.errorTint,
    border: Colors.errorTint,
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
