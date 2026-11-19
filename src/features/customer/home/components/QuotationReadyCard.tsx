/**
 * ------------------------------------------------------------------
 * QuotationReadyCard
 * ------------------------------------------------------------------
 * Primary hero card on the Home screen when the customer has an
 * active quotation:
 *
 *   ┌────────────────────────────────────────────────────────┐
 *   │ [◷ Pending] [⇄ Round Trip]           Quotation ID      │
 *   │                                  QUO-2026-239147  ⧉    │
 *   │ [📄 QUOTATION READY]                                    │
 *   │ Your quotation is ready!                                │
 *   │ Prepared by Urban Cruise team                           │
 *   │ 📍 Delhi  →  📍 Jaipur                                   │
 *   │ 📅 12 May 2026 – 15 May 2026                            │
 *   │ ☰ 3 Options  |  ◷ 5 Days  |  👥 2 Passengers            │
 *   │ [           Review Quotation  →            ]            │
 *   └────────────────────────────────────────────────────────┘
 *
 * TWO DIFFERENT STATUSES
 *   - `approvalStatus` (top-left pill): the customer's side — Pending
 *     until they accept; Accepted / Expired afterwards. Same meaning
 *     and colours as the pill on Quotation Details (pending in a
 *     deeper orange here so its text stays readable on the tint).
 *   - `status` (the chip): ours — "Quotation ready", or "Being
 *     prepared" (amber chip, disabled "In Progress" button). The Home
 *     screen normally shows QuotationPreparingCard for the second
 *     case; it is kept here so the card never shows a wrong state.
 *
 * DATES AND DAYS
 *   The date range is printed from travelDate / travelEndDate. The
 *   day count is `durationDays` from the backend (billed days, as the
 *   team quotes them) — never counted from the dates here.
 *
 * TAPS
 *   Only "Review Quotation" opens the quotation. The copy icon copies
 *   the quotation number and flashes a ✓ for 1.5 s (same pattern as
 *   the booking card).
 * ------------------------------------------------------------------ */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Svg, { Path } from 'react-native-svg';
import {
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  List,
  Users,
  XCircle,
} from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { getTripTypeOption } from '@features/customer/quotations/tripTypeOptions';
import type { QuotationStatus } from '@features/customer/quotations/types';
import { QUOTATION_STATUS_LABEL, type QuotationSummary } from '../types';

type Props = {
  quotation: QuotationSummary;
  onReviewPress: () => void;
};

/* ------------------------------------------------------------------ */
/* Palette                                                            */
/* ------------------------------------------------------------------ */

const CARD_BG = '#F6FBF6';
const CARD_BORDER = '#D7EDD9';
const READY_CHIP_BG = '#E3F3E5';
const PIN = '#3FA34D';

type IconComponent = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

/** Approval pill. Pending text is deep orange (#C2410C) on its tint
 *  — ~5:1, readable — rather than the lighter warning amber. */
const APPROVAL_VISUAL: Record<
  QuotationStatus,
  { label: string; fg: string; bg: string; Icon: IconComponent }
> = {
  pending: { label: 'Pending', fg: '#C2410C', bg: '#FFEDD5', Icon: Clock },
  accepted: {
    label: 'Accepted',
    fg: Colors.primaryDark,
    bg: Colors.primaryTint,
    Icon: CheckCircle2,
  },
  expired: {
    label: 'Expired',
    fg: '#B91C1C',
    bg: Colors.errorTint,
    Icon: XCircle,
  },
};

/** Solid green map pin with a white hole, as in the design. Lucide's
 *  MapPin is an outline; filling it also fills the hole. */
const SolidPin: React.FC = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
      fill={PIN}
    />
  </Svg>
);

/* ------------------------------------------------------------------ */
/* Formatters                                                         */
/* ------------------------------------------------------------------ */

const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export const QuotationReadyCard: React.FC<Props> = ({
  quotation,
  onReviewPress,
}) => {
  const isReady = quotation.status === 'ready';
  const approval = APPROVAL_VISUAL[quotation.approvalStatus];
  const tripType = getTripTypeOption(quotation.tripType);
  const TripIcon = tripType.Icon;
  const ApprovalIcon = approval.Icon;

  const dateRange = `${fmtDate(quotation.travelDate)} – ${fmtDate(
    quotation.travelEndDate,
  )}`;
  const options = plural(quotation.optionsCount, 'Option', 'Options');
  const days = plural(quotation.durationDays, 'Day', 'Days');
  const passengers = plural(
    quotation.passengerCount,
    'Passenger',
    'Passengers',
  );

  /* -------- Copy quotation number -------- */
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    [],
  );

  const onCopy = useCallback(() => {
    Clipboard.setString(quotation.quotationNumber);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 1500);
  }, [quotation.quotationNumber]);

  return (
    <View style={styles.card}>
      {/* ── Top row: approval · trip type | quotation ID ───── */}
      <View style={styles.topRow}>
        <View style={styles.pillRow}>
          <View style={[styles.pill, { backgroundColor: approval.bg }]}>
            <ApprovalIcon size={13} color={approval.fg} strokeWidth={2.4} />
            <Text style={[styles.pillText, { color: approval.fg }]}>
              {approval.label}
            </Text>
          </View>
          <View style={[styles.pill, styles.tripPill]}>
            <TripIcon
              size={13}
              color={Colors.textSecondary}
              strokeWidth={2.2}
            />
            <Text style={[styles.pillText, styles.tripPillText]}>
              {tripType.label}
            </Text>
          </View>
        </View>

        <View style={styles.idBlock}>
          <Text style={styles.idLabel}>Quotation ID</Text>
          <View style={styles.idRow}>
            <Text style={styles.idValue} numberOfLines={1}>
              {quotation.quotationNumber}
            </Text>
            <Pressable
              onPress={onCopy}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={
                copied
                  ? 'Quotation ID copied'
                  : `Copy quotation ID ${quotation.quotationNumber}`
              }
              style={({ pressed }) => pressed && styles.pressed}
            >
              {copied ? (
                <Check size={15} color={Colors.primaryDark} strokeWidth={3} />
              ) : (
                <Copy size={15} color={Colors.textTertiary} strokeWidth={2} />
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Ready chip ──────────────────────────────────────── */}
      <View style={[styles.readyChip, !isReady && styles.readyChipInProgress]}>
        <FileText
          size={14}
          color={isReady ? Colors.primaryDark : '#92400E'}
          strokeWidth={2.2}
        />
        <Text
          style={[styles.readyChipText, !isReady && styles.readyChipTextAmber]}
        >
          {QUOTATION_STATUS_LABEL[quotation.status].toUpperCase()}
        </Text>
      </View>

      {/* ── Headline ────────────────────────────────────────── */}
      <Text style={styles.headline}>
        {isReady
          ? 'Your quotation is ready!'
          : 'Your quotation is being prepared'}
      </Text>
      <Text style={styles.subheadline}>Prepared by Urban Cruise team</Text>

      {/* ── Route ───────────────────────────────────────────── */}
      <View
        style={styles.routeRow}
        accessible
        accessibilityLabel={`${quotation.fromCity} to ${quotation.toCity}`}
      >
        <View style={styles.cityGroup}>
          <SolidPin />
          <Text style={styles.city} numberOfLines={1}>
            {quotation.fromCity}
          </Text>
        </View>
        <ArrowRight size={20} color={Colors.primaryDark} strokeWidth={2.4} />
        <View style={styles.cityGroup}>
          <SolidPin />
          <Text style={styles.city} numberOfLines={1}>
            {quotation.toCity}
          </Text>
        </View>
      </View>

      {/* ── Row 1: date range ──────────────────────────────── */}
      <View style={styles.metaRow}>
        <Calendar size={15} color={Colors.textSecondary} strokeWidth={2} />
        <Text style={styles.dateText}>{dateRange}</Text>
      </View>

      {/* ── Row 2: options | days | passengers ─────────────── */}
      <View style={[styles.metaRow, styles.statsRow]}>
        <View style={styles.stat}>
          <List size={15} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.statText}>{options}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Clock size={15} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.statText}>{days}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Users size={15} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.statText}>{passengers}</Text>
        </View>
      </View>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <Pressable
        onPress={onReviewPress}
        accessibilityRole="button"
        accessibilityLabel={
          isReady
            ? `Review quotation ${quotation.quotationNumber}`
            : 'Quotation in progress'
        }
        disabled={!isReady}
        style={({ pressed }) => [
          styles.cta,
          !isReady && styles.ctaDisabled,
          pressed && isReady && styles.pressed,
        ]}
      >
        <Text style={styles.ctaText}>
          {isReady ? 'Review Quotation' : 'In Progress'}
        </Text>
        {isReady ? (
          <ArrowRight
            size={18}
            color={Colors.textOnPrimary}
            strokeWidth={2.4}
          />
        ) : null}
      </Pressable>
    </View>
  );
};

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    backgroundColor: CARD_BG,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: 'hidden',
    ...Shadows.xs,
  },
  pressed: {
    opacity: 0.8,
  },

  /* Top row */
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  pillRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  pillText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  tripPill: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tripPillText: {
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  idBlock: {
    alignItems: 'flex-end',
  },
  idLabel: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  idValue: {
    ...Typography.bodySmall,
    fontWeight: '800',
    color: Colors.textPrimary,
  },

  /* Ready chip */
  readyChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: READY_CHIP_BG,
  },
  readyChipInProgress: {
    backgroundColor: '#FEF3C7',
  },
  readyChipText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: Colors.primaryDark,
  },
  readyChipTextAmber: {
    color: '#92400E',
  },

  /* Headline */
  headline: {
    ...Typography.h2,
    marginTop: Spacing.sm,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  subheadline: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },

  /* Route */
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  cityGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  city: {
    ...Typography.subtitle,
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
  },

  /* Meta rows */
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm + 2,
  },
  dateText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statsRow: {
    marginTop: Spacing.sm,
    flexWrap: 'wrap',
    rowGap: Spacing.xs,
    gap: Spacing.sm,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: Colors.border,
  },

  /* CTA */
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryDark,
    ...Shadows.xs,
  },
  ctaDisabled: {
    backgroundColor: Colors.buttonDisabled,
  },
  ctaText: {
    ...Typography.body,
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textOnPrimary,
  },
});
