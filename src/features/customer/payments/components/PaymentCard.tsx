/**
 * ------------------------------------------------------------------
 * PaymentCard
 * ------------------------------------------------------------------
 * One row in the Customer Payments list. Composition:
 *
 *   ┌────────────────────────────────────────────────────────────┐
 *   │ [icon]  Delhi → Jaipur                Quotation ID     ›   │
 *   │         📅 15 Sep 2026 · 09:12 AM     BK-2026-00123        │
 *   │         Tempo Traveller | 20 Passengers                    │
 *   │         ₹18,500  [Paid]                                    │
 *   └────────────────────────────────────────────────────────────┘
 *
 * Status drives:
 *   1. leading status glyph (CheckCircle / Clock / XCircle) + tint
 *   2. amount colour + status pill copy/colour
 *
 * The row-level Download Invoice CTA was removed — receipt download
 * lives inside PaymentDetailSheet (opened by tapping the card), so
 * the two entry points no longer diverge.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  XCircle,
} from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import type { CustomerPaymentListItem, PaymentStatus } from '../types';

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
  Icon: IconComp;
  fg: string;
  bg: string;
};

const STATUS_STYLE: Record<PaymentStatus, StatusStyle> = {
  paid: {
    label: 'Paid',
    Icon: CheckCircle2,
    fg: Colors.primary,
    bg: Colors.primaryTint,
  },
  pending: {
    label: 'Pending',
    Icon: Clock,
    fg: Colors.accent,
    bg: Colors.accentTint,
  },
  failed: {
    label: 'Failed',
    Icon: XCircle,
    fg: Colors.error,
    bg: Colors.errorTint,
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
      accessibilityLabel={`Payment ${item.quotationNumber}, ${style.label}`}
    >
      {/* Top region: main details + right-column meta */}
      <View style={styles.top}>
        <View style={styles.mid}>
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

          <View style={styles.metaLine}>
            <Calendar size={12} color={Colors.textSecondary} strokeWidth={2} />
            <Text style={styles.metaText}>
              {formatDate(item.travelDate)} · {item.pickupTime}
            </Text>
          </View>

          <Text style={styles.vehicleText}>
            {item.vehicleType} | {item.passengers} Passengers
          </Text>
        </View>

        <View style={styles.right}>
          <View style={styles.rightTop}>
            <View style={styles.idBlock}>
              <Text style={styles.idLabel}>Quotation ID</Text>
              <Text style={styles.idValue}>{item.quotationNumber}</Text>
            </View>
            <ChevronRight
              size={16}
              color={Colors.textTertiary}
              strokeWidth={2}
            />
          </View>
        </View>
      </View>

      {/* Bottom region: amount + status pill. The row-level Download
       * Invoice CTA that used to sit on the right was removed —
       * receipt download now lives only inside PaymentDetailSheet. */}
      <View style={styles.bottom}>
        <View style={styles.amountRow}>
          <Text style={[styles.amount, { color: style.fg }]}>
            {formatRupees(item.amount)}
          </Text>
          <View style={[styles.pill, { backgroundColor: style.bg }]}>
            <Text style={[styles.pillText, { color: style.fg }]}>
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
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
    gap: Spacing.sm,
    ...Shadows.xs,
  },

  /* Top region */
  top: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  mid: {
    flex: 1,
    gap: 4,
  },
  right: {
    alignItems: 'flex-end',
  },
  rightTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
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

  /* Route */
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeText: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 17,
    lineHeight: 22,
    flexShrink: 1,
  },

  /* Meta line */
  metaLine: {
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
  vehicleText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    includeFontPadding: false,
  },

  /* Bottom region — amount + status pill only */
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexShrink: 1,
  },
  amount: {
    ...Typography.subtitle,
    fontWeight: '800',
    fontSize: 18,
    lineHeight: 22,
  },
  pill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  pillText: {
    ...Typography.caption,
    fontWeight: '700',
    includeFontPadding: false,
  },

  pressed: {
    opacity: 0.85,
  },
});
