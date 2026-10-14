/**
 * ------------------------------------------------------------------
 * PaymentCard
 * ------------------------------------------------------------------
 * One row in the Customer Payments list. Composition:
 *
 *   ┌────────────────────────────────────────────────────────────┐
 *   │ ┌────┐ Delhi → Jaipur                Quotation ID      ›   │
 *   │ │ ₹  │ 📅 15 Sept 2026 · 09:12 AM    QU-2026-482913        │
 *   │ └────┘ 👥 Tempo Traveller · 20 Passengers                  │
 *   │        ─────────────────────────────────────────────────── │
 *   │        ₹18,500  [✓ Paid]                                   │
 *   └────────────────────────────────────────────────────────────┘
 *
 * Status (paid / pending / failed) drives one colour pair used by:
 *   1. the leading rupee-receipt tile (tint background, coloured icon)
 *   2. the amount
 *   3. the status pill (icon + label)
 *
 * The card shows the Quotation ID (not a payment ID): that's the
 * number customers know from their quotation and can search by.
 *
 * Receipt download lives inside PaymentDetailSheet (opened by
 * tapping the card).
 * ------------------------------------------------------------------
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock,
  ReceiptIndianRupee,
  Users,
} from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import type { CustomerPaymentListItem, PaymentStatus } from '../types';

/* ================================================================
 * Status → visual mappings
 * ================================================================ */

type StatusStyle = {
  label: string;
  /** Icons (tile glyph, pill icon). */
  fg: string;
  /** Amount + pill label. Same as `fg` except Pending, whose amber
   *  needs a darker shade to be readable as text. */
  text: string;
  bg: string;
  /** Status pill icon. Paid / Failed are solid discs with a white
   *  glyph; Pending is an outline clock. */
  renderPillIcon: (fg: string) => React.ReactNode;
};

const STATUS_STYLE: Record<PaymentStatus, StatusStyle> = {
  paid: {
    label: 'Paid',
    fg: Colors.primaryDark,
    text: Colors.primaryDark,
    bg: Colors.primaryTint,
    renderPillIcon: fg => (
      <CircleCheck
        size={16}
        color={Colors.textOnPrimary}
        fill={fg}
        strokeWidth={2.5}
      />
    ),
  },
  pending: {
    label: 'Pending',
    fg: Colors.pending,
    text: Colors.pendingDark,
    bg: Colors.warningTint,
    renderPillIcon: fg => <Clock size={15} color={fg} strokeWidth={2.5} />,
  },
  failed: {
    label: 'Failed',
    fg: Colors.error,
    text: Colors.error,
    bg: Colors.errorTint,
    renderPillIcon: fg => (
      <CircleX
        size={16}
        color={Colors.textOnPrimary}
        fill={fg}
        strokeWidth={2.5}
      />
    ),
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
  item: CustomerPaymentListItem;
  onPress: () => void;
};

export const PaymentCard: React.FC<Props> = ({ item, onPress }) => {
  const style = STATUS_STYLE[item.status];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Payment for ${item.from} to ${item.to}, quotation ${
        item.quotationNumber
      }, ${formatRupees(item.amount)}, ${style.label}`}
    >
      {/* Leading rupee-receipt tile, tinted by status */}
      <View style={[styles.iconTile, { backgroundColor: style.bg }]}>
        <ReceiptIndianRupee size={24} color={style.fg} strokeWidth={2} />
      </View>

      <View style={styles.body}>
        {/* Route + Quotation ID */}
        <View style={styles.topRow}>
          <View style={styles.routeRow}>
            <Text style={styles.routeText} numberOfLines={1}>
              {item.from}
            </Text>
            <ArrowRight
              size={16}
              color={Colors.textSecondary}
              strokeWidth={2.5}
            />
            <Text style={styles.routeText} numberOfLines={1}>
              {item.to}
            </Text>
          </View>
          <View style={styles.idRow}>
            <View style={styles.idBlock}>
              <Text style={styles.idLabel}>Quotation ID</Text>
              <Text style={styles.idValue}>{item.quotationNumber}</Text>
            </View>
            <ChevronRight
              size={18}
              color={Colors.textTertiary}
              strokeWidth={2}
            />
          </View>
        </View>

        {/* Date · time */}
        <View style={styles.metaLine}>
          <Calendar size={13} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.metaText}>
            {formatDate(item.travelDate)} · {item.pickupTime}
          </Text>
        </View>

        {/* Vehicle · passengers */}
        <View style={styles.metaLine}>
          <Users size={13} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.metaText} numberOfLines={1}>
            {item.vehicleType} · {item.passengers}{' '}
            {item.passengers === 1 ? 'Passenger' : 'Passengers'}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Amount + status pill */}
        <View style={styles.amountRow}>
          <Text style={[styles.amount, { color: style.text }]}>
            {formatRupees(item.amount)}
          </Text>
          <View style={[styles.pill, { backgroundColor: style.bg }]}>
            {style.renderPillIcon(style.fg)}
            <Text style={[styles.pillText, { color: style.text }]}>
              {style.label}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
    ...Shadows.xs,
  },
  pressed: {
    opacity: 0.85,
  },

  /* Leading tile */
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: {
    flex: 1,
    gap: 5,
  },

  /* Route + ID */
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  routeRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 24,
  },
  routeText: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 17,
    lineHeight: 22,
    flexShrink: 1,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  idBlock: {
    alignItems: 'flex-end',
    gap: 1,
  },
  idLabel: {
    ...Typography.caption,
    fontSize: 11,
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

  /* Meta lines */
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    includeFontPadding: false,
    flexShrink: 1,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 6,
  },

  /* Amount + status */
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  amount: {
    ...Typography.subtitle,
    fontWeight: '800',
    fontSize: 20,
    lineHeight: 26,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  pillText: {
    ...Typography.caption,
    fontWeight: '700',
    includeFontPadding: false,
  },
});
