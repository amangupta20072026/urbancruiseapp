/**
 * ------------------------------------------------------------------
 * QuotationCard
 * ------------------------------------------------------------------
 * One row in the Customer Quotations list. Composition:
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ [icon]  Request ID                        [status pill] │
 *   │         QREQ-YYYY-#####                                  │
 *   │ ─────────────────────────────────────────────────  ›     │
 *   │ [📍 From → To] │ [📅 dates] │ [👥 pax  🚗 vehicle]        │
 *   │                                                          │
 *   │ Requested on <date>              [ View Quotation ]      │  ← button only when status === 'ready'
 *   └──────────────────────────────────────────────────────────┘
 *
 * The status drives THREE things:
 *   1. leading document icon glyph + colour   (KIND_STYLE map)
 *   2. status pill copy + icon + colour       (PILL_STYLE map)
 *   3. whether "View Quotation" is shown      (`status === 'ready'`)
 *
 * Kept as its own file (rather than inline in the screen) because
 * QuotationDetail and any future "recent quotations" home widget
 * will want to reuse the same visual — the card is the atomic unit,
 * the screen is the composition.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ArrowRight,
  Calendar,
  Car,
  Check,
  ChevronRight,
  Circle,
  Clock,
  FileCheck,
  FileText,
  FileX,
  MapPin,
  Users,
  X,
} from 'lucide-react-native';

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

type KindStyle = {
  Icon: IconComp;
  fg: string;
  bg: string;
};

/** Left document-icon variant per status. */
const KIND_STYLE: Record<QuotationStatus, KindStyle> = {
  under_review: {
    Icon: FileText,
    fg: Colors.accent,
    bg: Colors.accentTint,
  },
  sent: {
    Icon: FileText,
    fg: Colors.info,
    bg: Colors.infoTint,
  },
  ready: {
    Icon: FileText,
    fg: Colors.primary,
    bg: Colors.primaryTint,
  },
  accepted: {
    Icon: FileCheck,
    fg: Colors.primary,
    bg: Colors.primaryTint,
  },
  rejected: {
    Icon: FileX,
    fg: Colors.error,
    bg: Colors.errorTint,
  },
};

type PillStyle = {
  label: string;
  Icon: IconComp;
  fg: string;
  bg: string;
  /**
   * Some pills (ready) show a filled dot rather than a stroked
   * glyph; others (accepted / rejected) show a small filled
   * badge glyph. `iconFill` = true toggles the fill treatment
   * on the icon so we don't need a second Icon field.
   */
  iconFill?: boolean;
};

/** Right-aligned status pill copy + colour per status. */
const PILL_STYLE: Record<QuotationStatus, PillStyle> = {
  under_review: {
    label: 'Under Review',
    Icon: Clock,
    fg: Colors.accent,
    bg: Colors.accentTint,
  },
  sent: {
    label: 'Quotation Sent',
    Icon: Clock,
    fg: Colors.info,
    bg: Colors.infoTint,
  },
  ready: {
    label: 'Quotation Ready',
    Icon: Circle,
    fg: Colors.primary,
    bg: Colors.primaryTint,
    iconFill: true,
  },
  accepted: {
    label: 'Accepted',
    Icon: Check,
    fg: Colors.primary,
    bg: Colors.primaryTint,
  },
  rejected: {
    label: 'Rejected',
    Icon: X,
    fg: Colors.error,
    bg: Colors.errorTint,
  },
};

/* ================================================================
 * Formatting helpers
 * ================================================================ */

/**
 * "2026-09-15" → "15 Sep 2026". Uses a plain Date + toLocaleDateString
 * so the whole card file has zero external formatting deps; date-fns
 * would work too but is unnecessary at this granularity.
 */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * "Requested on 10 Sep 2026". The requestedAt field carries time
 * as well; we drop it since the mockup only shows the date.
 */
function formatRequestedOn(iso: string): string {
  return `Requested on ${formatDate(iso)}`;
}

/* ================================================================
 * Card
 * ================================================================ */

type Props = {
  item: CustomerQuotationListItem;
  onPress: () => void;
  onViewQuotation: () => void;
};

export const QuotationCard: React.FC<Props> = ({
  item,
  onPress,
  onViewQuotation,
}) => {
  const kind = KIND_STYLE[item.status];
  const pill = PILL_STYLE[item.status];
  const { Icon: KindIcon } = kind;
  const { Icon: PillIcon } = pill;

  const isReady = item.status === 'ready';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Quotation ${item.requestNumber}, ${pill.label}`}
    >
      {/* ── Row 1: leading icon + request id + status pill ── */}
      <View style={styles.headerRow}>
        <View style={[styles.headerIcon, { backgroundColor: kind.bg }]}>
          <KindIcon size={22} color={kind.fg} strokeWidth={2} />
        </View>
        <View style={styles.headerBody}>
          <Text style={styles.requestIdLabel}>Request ID</Text>
          <Text style={styles.requestIdValue}>{item.requestNumber}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: pill.bg }]}>
          <PillIcon
            size={12}
            color={pill.fg}
            strokeWidth={2.5}
            {...(pill.iconFill ? { fill: pill.fg } : {})}
          />
          <Text style={[styles.pillText, { color: pill.fg }]}>
            {pill.label}
          </Text>
        </View>
      </View>

      {/* ── Row 2: meta (route on its own line, then date/pax/vehicle) ── *
       *
       * The mockup's inline three-column strip only fits on wide
       * viewports. On real phones it squeezed the city names to
       * "De…" / "Jai…" which is worse than a slightly taller card.
       * Route gets a full-width row of its own so city names always
       * render in full; the date + passengers + vehicle strip sits
       * below it, still visually grouped by the same top border. */}
      <View style={styles.metaBlock}>
        <View style={styles.routeRow}>
          <MapPin size={14} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.routeText} numberOfLines={1}>
            {item.from}
          </Text>
          <ArrowRight size={12} color={Colors.textTertiary} strokeWidth={2} />
          <Text
            style={[styles.routeText, styles.routeTextStrong]}
            numberOfLines={1}
          >
            {item.to}
          </Text>
          <ChevronRight
            size={18}
            color={Colors.textTertiary}
            strokeWidth={2}
            style={styles.chevron}
          />
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoCell}>
            <View style={styles.metaLineHoriz}>
              <Calendar
                size={14}
                color={Colors.textSecondary}
                strokeWidth={2}
              />
              <Text style={styles.metaText} numberOfLines={1}>
                {formatDate(item.travelDateStart)}
                {item.travelDateEnd ? ` – ${formatDate(item.travelDateEnd)}` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoCell}>
            <View style={styles.metaLineHoriz}>
              <Users size={14} color={Colors.textSecondary} strokeWidth={2} />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.passengers} Passengers
              </Text>
            </View>
            {item.vehicle ? (
              <View style={styles.metaLineHoriz}>
                <Car size={14} color={Colors.textSecondary} strokeWidth={2} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {item.vehicle}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* ── Row 3: requested-on + optional CTA ── */}
      <View style={styles.footerRow}>
        <Text style={styles.requestedOn}>
          {formatRequestedOn(item.requestedAt)}
        </Text>
        {isReady ? (
          <Pressable
            onPress={onViewQuotation}
            style={({ pressed }) => [styles.viewBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="View quotation"
          >
            <Text style={styles.viewBtnText}>View Quotation</Text>
          </Pressable>
        ) : null}
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
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.sm,
    ...Shadows.xs,
  },

  /* Header row */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBody: {
    flex: 1,
    gap: 2,
  },
  requestIdLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  requestIdValue: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
    letterSpacing: 0.3,
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

  /* Meta block (route row + info row) */
  metaBlock: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '600',
    flexShrink: 1,
  },
  routeTextStrong: {
    fontWeight: '800',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  infoCell: {
    flex: 1,
    gap: 4,
  },
  infoDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: Colors.borderLight,
  },
  metaLineHoriz: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '600',
    flexShrink: 1,
  },
  chevron: {
    marginLeft: 'auto',
  },

  /* Footer row */
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  requestedOn: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontWeight: '500',
    flexShrink: 1,
  },
  viewBtn: {
    height: 40,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.xs,
  },
  viewBtnText: {
    ...Typography.bodySmall,
    color: Colors.textOnPrimary,
    fontWeight: '700',
  },

  pressed: {
    opacity: 0.85,
  },
});