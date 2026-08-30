/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * ActivityRow
 * ------------------------------------------------------------------
 * One row of the Recent Activity list. Compact:
 *
 *   [icon]  Quotation Prepared             11 May 2026
 *           Delhi → Jaipur · 3 Options     10:30 AM
 *
 * The icon + colour comes from ACTIVITY_KIND_COLOR (indexed by
 * kind); the icon glyph itself is picked here — keeping the map from
 * enum-to-icon local means adding a new kind touches one place.
 *
 * Not tappable in v1. When we later add per-activity detail screens,
 * the row wraps in a Pressable and receives an onPress prop — no
 * other structural change needed.
 * ------------------------------------------------------------------ */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Car,
  CheckCircle2,
  FileText,
  IndianRupee,
  XCircle,
  type LucideIcon,
} from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import {
  ACTIVITY_KIND_COLOR,
  type ActivityItem,
  type ActivityKind,
} from '../types';

type Props = {
  activity: ActivityItem;
  /** Hide the bottom border. Set to true on the last row of a group. */
  isLast?: boolean;
};

/* Icon per kind. Kept as a plain lookup so a missing entry (from a
 * hypothetical future enum extension) is a compile error, not a
 * silent fallback. */
const KIND_ICON: Record<ActivityKind, LucideIcon> = {
  quotation_prepared: FileText,
  quotation_reviewed: FileText,
  payment_received: IndianRupee,
  payment_pending: IndianRupee,
  trip_confirmed: Car,
  trip_completed: CheckCircle2,
  trip_cancelled: XCircle,
};

/* ------------------------------------------------------------------ */
/* Formatters                                                         */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

const ActivityRowImpl: React.FC<Props> = ({ activity, isLast }) => {
  const Icon = KIND_ICON[activity.kind];
  const color = ACTIVITY_KIND_COLOR[activity.kind];

  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <View style={[styles.iconWrap, { backgroundColor: color.bg }]}>
        <Icon size={18} color={color.fg} strokeWidth={2.2} />
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
    </View>
  );
};

export const ActivityRow = React.memo(ActivityRowImpl);
ActivityRow.displayName = 'ActivityRow';

/* ---------------- Styles ---------------- */

const ICON = 40;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },

  iconWrap: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.xs,
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
});

/* Silence unused-import warnings if a lint rule flags Radius as unused
 * — Radius is intentionally imported for consistency with sibling
 * components even though this row uses raw radii on the icon. Remove
 * this if your lint is quiet. */
void Radius;
