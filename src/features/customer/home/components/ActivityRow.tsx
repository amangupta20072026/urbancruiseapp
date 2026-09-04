/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * ActivityRow
 * ------------------------------------------------------------------
 * One row of the Recent Activity list, rendered as a vertical
 * timeline entry:
 *
 *   ●   [icon]  Quotation Approved            12 May 2025   ›
 *   │           Delhi → Jaipur · Innova Crysta 10:30 AM
 *   ○   [icon]  Payment Received              12 May 2025   ›
 *   │           Advance payment of ₹3,750     11:15 AM
 *   ○   [icon]  Trip Confirmed                11 May 2025   ›
 *
 * Composition (left → right):
 *   1. Rail column (18px) — thin vertical line + small dot marker
 *                           (green filled on first row = "latest",
 *                           hollow gray on all others).
 *   2. Icon column        — solid coloured disc with white glyph.
 *   3. Body               — title + subtitle.
 *   4. Meta column        — date (top) + time (bottom), right-aligned.
 *   5. Chevron            — subtle right-arrow affordance.
 *
 * Timeline mechanics:
 *   The vertical line is drawn as two half-height segments per row —
 *   the top half above the dot and the bottom half below it. Hiding
 *   the top half on the first row and the bottom half on the last row
 *   is what makes the line start and end cleanly. When rows stack,
 *   the bottom half of row N and the top half of row N+1 meet exactly
 *   at the row boundary, giving one visually continuous line.
 * ------------------------------------------------------------------ */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Car,
  ChevronRight,
  CheckCircle2,
  FileText,
  IndianRupee,
  XCircle,
  type LucideIcon,
} from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';
import {
  ACTIVITY_KIND_COLOR,
  type ActivityItem,
  type ActivityKind,
} from '../types';

type Props = {
  activity: ActivityItem;
  isFirst?: boolean;
  isLast?: boolean;
};

const KIND_ICON: Record<ActivityKind, LucideIcon> = {
  quotation_prepared: FileText,
  quotation_reviewed: FileText,
  payment_received: IndianRupee,
  payment_pending: IndianRupee,
  trip_confirmed: Car,
  trip_completed: CheckCircle2,
  trip_cancelled: XCircle,
};

const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const fmtTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

const ActivityRowImpl: React.FC<Props> = ({ activity, isFirst, isLast }) => {
  const Icon = KIND_ICON[activity.kind];
  const color = ACTIVITY_KIND_COLOR[activity.kind];

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={[styles.line, isFirst && styles.lineHidden]} />
        <View
          style={[
            styles.dot,
            isFirst ? styles.dotActive : styles.dotInactive,
          ]}
        />
        <View style={[styles.line, isLast && styles.lineHidden]} />
      </View>

      <View style={[styles.iconDisc, { backgroundColor: color.fg }]}>
        <Icon size={18} color={Colors.surface} strokeWidth={2.4} />
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {activity.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {activity.subtitle}
        </Text>
      </View>

      <View style={styles.metaCol}>
        <Text style={styles.metaTop} numberOfLines={1}>
          {fmtDate(activity.timestamp)}
        </Text>
        <Text style={styles.metaBottom} numberOfLines={1}>
          {fmtTime(activity.timestamp)}
        </Text>
      </View>

      <ChevronRight
        size={18}
        color={Colors.textTertiary}
        strokeWidth={2}
        style={styles.chevron}
      />
    </View>
  );
};

export const ActivityRow = React.memo(ActivityRowImpl);
ActivityRow.displayName = 'ActivityRow';

const ICON = 40;
const RAIL_WIDTH = 18;
const DOT_SIZE = 10;
const LINE_COLOR = '#D1D5DB';
const DOT_INACTIVE_COLOR = '#D1D5DB';

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
  },
  rail: {
    width: RAIL_WIDTH,
    alignItems: 'center',
    alignSelf: 'stretch',
    marginVertical: -Spacing.md,
  },
  line: {
    flex: 1,
    width: 1.5,
    backgroundColor: LINE_COLOR,
  },
  lineHidden: {
    backgroundColor: 'transparent',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    marginVertical: 2,
  },
  dotActive: {
    backgroundColor: Colors.success,
  },
  dotInactive: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: DOT_INACTIVE_COLOR,
  },
  iconDisc: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  title: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  metaCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  metaTop: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 11,
  },
  metaBottom: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontSize: 11,
  },
  chevron: {
    marginLeft: 2,
  },
});

void Radius;