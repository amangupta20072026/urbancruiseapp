/**
 * ------------------------------------------------------------------
 * PaymentCard
 * ------------------------------------------------------------------
 * One row in the Customer Payments list. Composition:
 *
 *   ┌────────────────────────────────────────────────────────────┐
 *   │ [icon]  Delhi → Jaipur                Booking ID       ›   │
 *   │         📅 15 Sep 2026 · 09:12 AM     BK-2026-00123        │
 *   │         Tempo Traveller | 20 Passengers                    │
 *   │         ₹18,500  [Paid]              [⬇ Download Invoice] │
 *   └────────────────────────────────────────────────────────────┘
 *
 * Status drives:
 *   1. leading status glyph (CheckCircle / Clock / XCircle) + tint
 *   2. amount colour + status pill copy/colour
 *
 * Download Invoice is always shown (per mockup) — even for pending
 * / failed rows a customer might want a proof-of-attempt. Tap is
 * a no-op today; wire to /customer/payments/invoice when it ships.
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
  Download,
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
  onDownloadInvoice: () => void;
};

export const PaymentCard: React.FC<Props> = ({
  item,
  onPress,
  onDownloadInvoice,
}) => {
  const style = STATUS_STYLE[item.status];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Payment ${item.bookingNumber}, ${style.label}`}
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
              <Text style={styles.idLabel}>Booking ID</Text>
              <Text style={styles.idValue}>{item.bookingNumber}</Text>
            </View>
            <ChevronRight
              size={16}
              color={Colors.textTertiary}
              strokeWidth={2}
            />
          </View>
        </View>
      </View>

      {/* Bottom region: amount + pill on the left, invoice CTA on the right.
       *
       * Rendered as a single flex row (not inside `mid`) so the CTA
       * stretches full width of the card's right half regardless of
       * how narrow the middle grew — the mockup keeps the button in
       * line with the Booking ID above it. */}
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

        <Pressable
          onPress={onDownloadInvoice}
          style={({ pressed }) => [
            styles.invoiceBtn,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Download invoice"
        >
          <Download size={14} color={Colors.primary} strokeWidth={2.5} />
          <Text style={styles.invoiceBtnText}>Download Invoice</Text>
        </Pressable>
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

  /* Bottom region — amount + pill / invoice button */
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
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

  /* Invoice button */
  invoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  invoiceBtnText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
    includeFontPadding: false,
  },

  pressed: {
    opacity: 0.85,
  },
});
