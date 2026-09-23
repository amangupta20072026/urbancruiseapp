/**
 * ------------------------------------------------------------------
 * QuotationCard
 * ------------------------------------------------------------------
 * One row in the Customer Quotations list. Composition:
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ ┌─────┐  Quotation QU10257           ┌──────────────────┐    │
 *   │ │ 📄 │  Delhi → Agra → Jaipur → Delhi│ ✓ Accepted        │   │
 *   │ └─────┘  📅 12 Aug – 15 Aug 2026     │ ₹35,200           │   │
 *   │          (3 Nights / 4 Days)         │                   │   │
 *   │          👥 2 Adults, 1 Child        │ [ 👁 View ]       │   │
 *   │          Created on 10 Aug 2026      └───────────────────┘   │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * The status drives THREE things:
 *   1. leading document icon glyph + colour   (KIND_STYLE map)
 *   2. status pill copy + icon + colour       (PILL_STYLE map)
 *   3. the "View" button is always present    (unlike the older
 *      request card where it was gated on ready) — every quotation
 *      in the list is inspectable regardless of state.
 *
 * Kept as its own file (rather than inline in the screen) because
 * QuotationDetail and any future "recent quotations" home widget
 * will want to reuse the same visual — the card is the atomic unit,
 * the screen is the composition.
 *
 * WHY THE THREE-COLUMN LAYOUT:
 *   The prior design stacked route / meta / footer vertically and
 *   pushed price + status onto separate rows. Product wanted the
 *   price and status visible without any scanning, which is why
 *   they now live in a dedicated right rail that stays with the
 *   card even when the middle column wraps. The right rail is
 *   FIXED WIDTH — the middle column takes the rest with `flex: 1`
 *   so long route strings truncate rather than pushing the rail
 *   off-screen on narrow devices.
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
  FileText,
  Users,
  XCircle,
} from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
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
};

const PILL_STYLE: Record<QuotationStatus, PillStyle> = {
  pending: {
    label: 'Pending',
    Icon: Clock,
    fg: Colors.warning,
    bg: Colors.warningTint,
  },
  accepted: {
    label: 'Accepted',
    Icon: Check,
    fg: Colors.success,
    bg: Colors.successTint,
  },
  expired: {
    label: 'Expired',
    Icon: XCircle,
    fg: Colors.error,
    bg: Colors.errorTint,
  },
};

/* ================================================================
 * Formatting helpers
 * ================================================================ */

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

function formatDateFull(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatAmount(rupees: number): string {
  return `₹${rupees.toLocaleString('en-IN')}`;
}

function formatPassengers(adults: number, children: number): string {
  const parts: string[] = [];
  parts.push(`${adults} ${adults === 1 ? 'Adult' : 'Adults'}`);
  if (children > 0) {
    parts.push(`${children} ${children === 1 ? 'Child' : 'Children'}`);
  }
  return parts.join(', ');
}

/* ================================================================
 * Card
 * ================================================================ */

type Props = {
  item: CustomerQuotationListItem;
  onPress: () => void;
  onView: () => void;
};

export const QuotationCard: React.FC<Props> = ({ item, onPress, onView }) => {
  const pill = PILL_STYLE[item.status];
  const { Icon: PillIcon } = pill;

  /* -------- Copy Quotation ID -------- *
   *
   * Mirrors the Clipboard + toast + flash-checkmark pattern used in
   * PaymentDetailSheet. `e.stopPropagation()` is required because the
   * whole card is itself a Pressable (onPress) that navigates to the
   * detail screen — without it, tapping copy would also fire onPress. */
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
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Quotation ${item.quotationNumber}, ${
        pill.label
      }, ${formatAmount(item.amount)}`}
    >
      <View style={styles.iconTile}>
        <FileText size={22} color={Colors.primary} strokeWidth={2} />
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {item.quotationNumber}
          </Text>
          <Pressable
            onPress={onCopyId}
            hitSlop={8}
            style={({ pressed }) => [styles.copyBtn, pressed && styles.pressed]}
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

        <View style={styles.routeRow}>
          {item.stops.map((stop, i) => (
            <React.Fragment key={`${stop}-${i}`}>
              {i > 0 ? (
                <ArrowRight
                  size={12}
                  color={Colors.textTertiary}
                  strokeWidth={2.5}
                />
              ) : null}
              <Text style={styles.routeText} numberOfLines={1}>
                {stop}
              </Text>
            </React.Fragment>
          ))}
        </View>

        <View style={styles.metaLine}>
          <Calendar size={14} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.metaText} numberOfLines={2}>
            {formatDateShort(item.travelDateStart)} –{' '}
            {formatDateFull(item.travelDateEnd)}
            {'\n'}
            <Text style={styles.metaTextMuted}>
              ({item.nights} {item.nights === 1 ? 'Night' : 'Nights'} /{' '}
              {item.days} {item.days === 1 ? 'Day' : 'Days'})
            </Text>
          </Text>
        </View>

        <View style={styles.metaLine}>
          <Users size={14} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.metaText} numberOfLines={1}>
            {formatPassengers(item.adults, item.children)}
          </Text>
        </View>

        <Text style={styles.createdOn}>
          Created on {formatDateFull(item.createdAt)}
        </Text>
      </View>

      <View style={styles.rightRail}>
        <View style={[styles.pill, { backgroundColor: pill.bg }]}>
          <PillIcon size={12} color={pill.fg} strokeWidth={2.5} />
          <Text style={[styles.pillText, { color: pill.fg }]}>
            {pill.label}
          </Text>
        </View>

        <Text style={styles.amount} numberOfLines={1}>
          {formatAmount(item.amount)}
        </Text>

        <Pressable
          onPress={onView}
          style={({ pressed }) => [styles.viewBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`View quotation ${item.quotationNumber}`}
          hitSlop={6}
        >
          <Eye size={14} color={Colors.primary} strokeWidth={2} />
          <Text style={styles.viewBtnText}>View</Text>
        </Pressable>
      </View>
    </Pressable>
  );
};

/* ================================================================
 * Styles
 * ================================================================ */

const RIGHT_RAIL_WIDTH = 108;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },

  iconTile: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  copyBtn: {
    padding: 2,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  routeText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '600',
    includeFontPadding: false,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  metaText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '500',
    flexShrink: 1,
  },
  metaTextMuted: {
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  createdOn: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontWeight: '500',
    marginTop: 2,
  },

  rightRail: {
    width: RIGHT_RAIL_WIDTH,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    alignSelf: 'stretch',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  pillText: {
    ...Typography.caption,
    fontWeight: '700',
    includeFontPadding: false,
  },
  amount: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'stretch',
    height: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  viewBtnText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
  },

  pressed: {
    opacity: 0.85,
  },
});
