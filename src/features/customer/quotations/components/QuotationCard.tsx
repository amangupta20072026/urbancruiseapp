/**
 * ------------------------------------------------------------------
 * QuotationCard
 * ------------------------------------------------------------------
 * One row in the Customer Quotations list. Built to match BookingCard
 * (same header, route, meta row and paired outline buttons):
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ [✓ Accepted] [🔁 Round Trip]               Quotation ID  │
 *   │                                     QU-2026-482913  📋   │
 *   │ Delhi → Jaipur                                           │
 *   │ 📅 12 Aug – 15 Aug 2026   🕒 4 Days   👥 3 Passengers     │
 *   │ [ 👁 View Details ]        [ 📅 Book Now ]               │
 *   └──────────────────────────────────────────────────────────┘
 *
 * ROUTE SUMMARY:
 *   Only source → destination is shown; the full itinerary lives on
 *   QuotationDetail. The card shows the first and last stop as-is:
 *     one way      Bangalore → Ooty
 *     round trip   Delhi → Delhi      (via Agra, Jaipur)
 *     pickup/drop  Pune → Pune        (via Mumbai)
 *   The accessibility label still reads every stop. Long city names
 *   wrap instead of truncating.
 *
 * DAYS:
 *   The Days chip shows billed days. Pickup & drop trips also show a
 *   Rest Days chip for the days spent at the destination between
 *   the drop and the pickup (see utils/duration.ts).
 *
 * STATUS drives the pill and the second button:
 *   accepted → Book Now      (green)  → onBookNow
 *   pending  → Need Changes  (blue)   → onNeedChanges
 *   expired  → Request Again (red)    → onRequestAgain
 * View Details (gold) is always present.
 *
 * STATUS also tints the whole card (PILL_STYLE.cardBg / cardBorder):
 * green wash for accepted, amber for pending, red for expired.
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
  BedDouble,
  Calendar,
  CalendarCheck,
  Check,
  Clock,
  Copy,
  Eye,
  PencilLine,
  RotateCw,
  Users,
  XCircle,
} from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { getTripTypeOption } from '../tripTypeOptions';
import { formatDays, formatRestDays, hasRestDays } from '../utils/duration';
import type { CustomerQuotationListItem, QuotationStatus } from '../types';

/* ================================================================
 * Status → visual mappings
 * ================================================================ */

type IconComp = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}>;

type PillStyle = {
  label: string;
  Icon: IconComp;
  fg: string;
  bg: string;
  /**
   * Whole-card wash + border. Deliberately lighter than the pill's
   * `bg` so the pill still stands out, and light enough that the
   * white outline buttons and trip tag read as raised on top.
   */
  cardBg: string;
  cardBorder: string;
};

const PILL_STYLE: Record<QuotationStatus, PillStyle> = {
  pending: {
    label: 'Pending',
    Icon: Clock,
    fg: Colors.warning,
    bg: Colors.warningTint,
    cardBg: '#FFFBEB', // amber wash
    cardBorder: '#FDE9B0',
  },
  accepted: {
    label: 'Accepted',
    Icon: Check,
    fg: Colors.success,
    bg: Colors.successTint,
    cardBg: '#F0FAF3', // green wash
    cardBorder: '#CFEEDB',
  },
  expired: {
    label: 'Expired',
    Icon: XCircle,
    fg: Colors.error,
    bg: Colors.errorTint,
    cardBg: '#FEF6F6', // red wash
    cardBorder: '#FAD5D5',
  },
};

type ActionKey = 'bookNow' | 'needChanges' | 'requestAgain';

type SecondaryAction = {
  key: ActionKey;
  label: string;
  Icon: IconComp;
  color: string;
};

/** Second button per status. Same outline paint as BookingCard. */
const SECONDARY_ACTION: Record<QuotationStatus, SecondaryAction> = {
  accepted: {
    key: 'bookNow',
    label: 'Book Now',
    Icon: CalendarCheck,
    color: Colors.primary,
  },
  pending: {
    key: 'needChanges',
    label: 'Need Changes',
    Icon: PencilLine,
    color: Colors.info,
  },
  expired: {
    key: 'requestAgain',
    label: 'Request Again',
    Icon: RotateCw,
    color: Colors.error,
  },
};

/* ================================================================
 * Route summary
 * ================================================================ */

/**
 * Source → destination for the card: the first and last stop.
 * Round trips and pickup & drop trips end where they started, so
 * they read "X → X". `stops` has length ≥ 2 (see
 * CustomerQuotationListItem).
 */
export function summariseRoute(stops: readonly string[]): {
  from: string;
  to: string;
} {
  const from = stops[0] ?? '';
  return { from, to: stops[stops.length - 1] ?? from };
}

/* ================================================================
 * Formatting helpers
 * ================================================================ */

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

function formatDateFull(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatPassengers(adults: number, children: number): string {
  const total = adults + children;
  return `${total} ${total === 1 ? 'Passenger' : 'Passengers'}`;
}

/* ================================================================
 * Card
 * ================================================================ */

type Props = {
  item: CustomerQuotationListItem;
  onPress: () => void;
  onView: () => void;
  /** Accepted quotations. */
  onBookNow: () => void;
  /** Pending quotations. */
  onNeedChanges: () => void;
  /** Expired quotations. */
  onRequestAgain: () => void;
};

export const QuotationCard: React.FC<Props> = ({
  item,
  onPress,
  onView,
  onBookNow,
  onNeedChanges,
  onRequestAgain,
}) => {
  const pill = PILL_STYLE[item.status];
  const { Icon: PillIcon } = pill;

  const tripType = getTripTypeOption(item.tripType);
  const TripIcon = tripType.Icon;

  const route = summariseRoute(item.stops);

  const secondary = SECONDARY_ACTION[item.status];
  const onSecondary: Record<ActionKey, () => void> = {
    bookNow: onBookNow,
    needChanges: onNeedChanges,
    requestAgain: onRequestAgain,
  };

  /* -------- Copy Quotation ID -------- *
   *
   * Clipboard + flash-checkmark pattern shared with BookingCard.
   * `e.stopPropagation()` stops the tap also firing the card's
   * onPress (which navigates to the detail screen). */
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
      Clipboard.setString(item.quotationNumber);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 1500);
    },
    [item.quotationNumber],
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pill.cardBg, borderColor: pill.cardBorder },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Quotation ${item.quotationNumber}, ${pill.label}, ${
        tripType.label
      }, ${item.stops.join(' to ')}`}
    >
      {/* Row 1 — status pill + trip type (left), quotation id (right) */}
      <View style={styles.headerRow}>
        <View style={styles.tagsRow}>
          <View style={[styles.pill, { backgroundColor: pill.bg }]}>
            <PillIcon size={12} color={pill.fg} strokeWidth={2.5} />
            <Text style={[styles.pillText, { color: pill.fg }]}>
              {pill.label}
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
          <Text style={styles.idLabel}>Quotation ID</Text>
          <View style={styles.idRow}>
            <Text style={styles.idValue}>{item.quotationNumber}</Text>
            <Pressable
              onPress={onCopyId}
              hitSlop={8}
              style={({ pressed }) => [
                styles.copyBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Copy quotation ID ${item.quotationNumber}`}
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

      {/* Row 2 — source → destination */}
      <View style={styles.routeRow}>
        <Text style={styles.routeText}>{route.from}</Text>
        <ArrowRight size={18} color={Colors.textSecondary} strokeWidth={2.5} />
        <Text style={styles.routeText}>{route.to}</Text>
      </View>

      {/* Row 3 — dates · days · passengers */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Calendar size={14} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.metaText}>
            {formatDateShort(item.travelDateStart)} –{' '}
            {formatDateFull(item.travelDateEnd)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Clock size={14} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.metaText}>{formatDays(item.days)}</Text>
        </View>
        {hasRestDays(item.restDays) && (
          <View style={styles.metaItem}>
            <BedDouble size={14} color={Colors.textSecondary} strokeWidth={2} />
            <Text style={styles.metaText}>{formatRestDays(item.restDays)}</Text>
          </View>
        )}
        <View style={styles.metaItem}>
          <Users size={14} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.metaText}>
            {formatPassengers(item.adults, item.children)}
          </Text>
        </View>
      </View>

      {/* Row 4 — actions */}
      <View style={styles.actionsRow}>
        <ActionButton
          label="View Details"
          Icon={Eye}
          color={Colors.secondaryDark}
          onPress={onView}
          accessibilityLabel={`View details of quotation ${item.quotationNumber}`}
        />
        <ActionButton
          label={secondary.label}
          Icon={secondary.Icon}
          color={secondary.color}
          onPress={onSecondary[secondary.key]}
          accessibilityLabel={`${secondary.label}, quotation ${item.quotationNumber}`}
        />
      </View>
    </Pressable>
  );
};

/* ================================================================
 * ActionButton — outline button (white bg, coloured border + text)
 * ================================================================ */

const ActionButton: React.FC<{
  label: string;
  Icon: IconComp;
  color: string;
  onPress: () => void;
  accessibilityLabel: string;
}> = ({ label, Icon, color, onPress, accessibilityLabel }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.actionBtn,
      { borderColor: color },
      pressed && styles.pressed,
    ]}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
  >
    <Icon size={14} color={color} strokeWidth={2.5} />
    <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
  </Pressable>
);

/* ================================================================
 * Styles — values mirror BookingCard so the two lists match
 * ================================================================ */

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 6,
    ...Shadows.xs,
  },

  /* Row 1 — tags + quotation id */
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
  copyBtn: {
    padding: 2,
  },
  idValue: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '700',
    includeFontPadding: false,
  },

  /* Row 2 — route */
  routeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 8,
    rowGap: 2,
  },
  routeText: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 20,
    lineHeight: 24,
    flexShrink: 1,
  },

  /* Row 3 — meta */
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.md,
    rowGap: 4,
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

  /* Row 4 — actions */
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
  },
  actionBtnText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },

  pressed: {
    opacity: 0.85,
  },
});