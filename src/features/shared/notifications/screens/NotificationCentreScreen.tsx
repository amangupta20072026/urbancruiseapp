/**
 * ------------------------------------------------------------------
 * NotificationCentreScreen — SHARED, STACK SCREEN
 * ------------------------------------------------------------------
 * Cross-role notification centre. Reached from:
 *   - the bell icon on role dashboards (e.g. Customer HomeHeader)
 *   - the More sheet's "Notifications" tile (every role)
 *
 * LAYOUT (top → bottom):
 *   [Back + Title]
 *   [Filter chips — All | Quotes | Bookings | Payments | General]
 *   [Grouped list — Today / Yesterday / Earlier]
 *
 * EACH ROW:
 *   [icon in tinted circle]  [title + body]  [time + chevron]
 *
 * Unread rows carry a green dot next to the title and a tinted card
 * background so they read at a glance. Tapping a row flips it to
 * read locally — a real backend will replace `setItems` with a
 * mutation, but the state shape is stable.
 *
 * DATA:
 *   Wired to a local mock fixture (see `../mocks.ts`). Delete the
 *   fixture and swap to a TanStack Query hook when the endpoint
 *   ships; the filter / group / render code below is DTO-shape
 *   stable and won't need to change.
 *
 * NAVIGATION ON TAP:
 *   No-ops today. When target detail screens exist, branch on
 *   `item.kind` inside `onItemPress` and call navigation.navigate.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { format, isSameDay, subDays } from 'date-fns';
import {
  Bell,
  Calendar,
  Car,
  ChevronRight,
  CreditCard,
  FileText,
  Info,
  Megaphone,
} from 'lucide-react-native';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { Colors, Radius, Spacing, Typography } from '@theme';

import type {
  NotificationCategory,
  NotificationItem,
  NotificationKind,
} from '../types';
import { MOCK_NOTIFICATIONS } from '../mocks';

/* ================================================================
 * Filter chips
 * ================================================================ */

type FilterKey = 'all' | NotificationCategory;

type ChipDef = { key: FilterKey; label: string };

const FILTERS: readonly ChipDef[] = [
  { key: 'all', label: 'All' },
  { key: 'quote', label: 'Quotes' },
  { key: 'booking', label: 'Bookings' },
  { key: 'payment', label: 'Payments' },
  { key: 'general', label: 'General' },
];

/* ================================================================
 * Per-kind visual mapping
 * ================================================================ *
 * `fg` colours the icon glyph; `bg` fills the container circle.
 * Kept as a single closed record so a new NotificationKind can't
 * ship without a matching visual — TypeScript enforces the total
 * mapping.
 */

type KindStyle = {
  Icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  fg: string;
  bg: string;
};

const KIND_STYLE: Record<NotificationKind, KindStyle> = {
  quotation_ready: {
    Icon: FileText,
    fg: Colors.primary,
    bg: Colors.primaryTint,
  },
  quotation_update: {
    Icon: FileText,
    fg: Colors.accent,
    bg: Colors.accentTint,
  },
  trip_confirmed: {
    Icon: Calendar,
    fg: Colors.accent,
    bg: Colors.accentTint,
  },
  driver_assigned: {
    Icon: Car,
    fg: Colors.primary,
    bg: Colors.primaryTint,
  },
  payment_success: {
    Icon: CreditCard,
    fg: Colors.textSecondary,
    bg: Colors.surfaceMuted,
  },
  welcome: {
    Icon: Bell,
    fg: Colors.textSecondary,
    bg: Colors.surfaceMuted,
  },
  promo: {
    Icon: Megaphone,
    fg: Colors.primary,
    bg: Colors.primaryTint,
  },
  app_update: {
    Icon: Info,
    fg: Colors.textSecondary,
    bg: Colors.surfaceMuted,
  },
};

/* ================================================================
 * Grouping + time formatting
 * ================================================================ */

type BucketKey = 'Today' | 'Yesterday' | 'Earlier';
type Bucket = { key: BucketKey; items: NotificationItem[] };

/**
 * Splits a pre-sorted (newest-first) list into Today / Yesterday /
 * Earlier buckets. Buckets with no items are omitted so the screen
 * doesn't render an empty "Yesterday" header on a quiet morning.
 */
function groupByDay(items: NotificationItem[]): Bucket[] {
  const today = new Date();
  const yesterday = subDays(today, 1);
  const groups: Record<BucketKey, NotificationItem[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };
  for (const it of items) {
    const d = new Date(it.timestamp);
    if (isSameDay(d, today)) groups.Today.push(it);
    else if (isSameDay(d, yesterday)) groups.Yesterday.push(it);
    else groups.Earlier.push(it);
  }
  return (['Today', 'Yesterday', 'Earlier'] as const)
    .map(key => ({ key, items: groups[key] }))
    .filter(g => g.items.length > 0);
}

/**
 * Timestamp presentation rules — matches the reference mockup:
 *   Today / Yesterday → wall-clock time      (e.g. "10:30 AM")
 *   Earlier           → short date           (e.g. "05 Sep 2026")
 */
function formatTimestamp(iso: string, bucket: BucketKey): string {
  const d = new Date(iso);
  if (bucket === 'Earlier') return format(d, 'dd MMM yyyy');
  return format(d, 'h:mm a');
}

/* ================================================================
 * Screen
 * ================================================================ */

const NotificationCentreScreen: React.FC = () => {
  const navigation = useNavigation();

  const [items, setItems] = useState<NotificationItem[]>(() => [
    ...MOCK_NOTIFICATIONS,
  ]);
  const [filter, setFilter] = useState<FilterKey>('all');

  /* -------- Filter + group (memoised — cheap but stable ref helps
   *          if we ever wrap children in React.memo) -------- */
  const buckets = useMemo(() => {
    const filtered =
      filter === 'all' ? items : items.filter(i => i.category === filter);
    return groupByDay(filtered);
  }, [items, filter]);

  /* -------- Handlers -------- */

  const onItemPress = useCallback((id: string) => {
    // Local read-flip. When the backend lands, swap for a mutation
    // and let the query cache drive `items` from the server response.
    setItems(prev =>
      prev.map(i => (i.id === id ? { ...i, unread: false } : i)),
    );
    // TODO(nav): branch on i.kind and navigate to the target detail.
  }, []);

  const onBack = useCallback(() => navigation.goBack(), [navigation]);

  /* -------- Render -------- */

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      <View style={styles.headerWrap}>
        <ScreenHeader title="Notifications" onBack={onBack} />
      </View>

      {/*
        Filter chips — solid-fill active style to match the mockup.
        The shared FilterChips component uses an outlined active
        state, so this local chip variant is preferred here.
      */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipStrip}
        contentContainerStyle={styles.chipRow}
      >
        {FILTERS.map(chip => (
          <FilterChip
            key={chip.key}
            label={chip.label}
            active={filter === chip.key}
            onPress={() => setFilter(chip.key)}
          />
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollBg}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {buckets.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Bell size={28} color={Colors.textTertiary} strokeWidth={1.75} />
            </View>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySubtitle}>
              You're all caught up. New alerts will show up here.
            </Text>
          </View>
        ) : (
          buckets.map(bucket => (
            <View key={bucket.key} style={styles.section}>
              <Text style={styles.sectionHeader}>{bucket.key}</Text>
              {bucket.items.map(item => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  bucket={bucket.key}
                  onPress={() => onItemPress(item.id)}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeScreen>
  );
};

export default NotificationCentreScreen;

/* ================================================================
 * Subcomponents (local — no reuse outside this file yet)
 * ================================================================ */

const FilterChip: React.FC<{
  label: string;
  active: boolean;
  onPress: () => void;
}> = ({ label, active, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.chip,
      active && styles.chipActive,
      pressed && styles.pressed,
    ]}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
  >
    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
      {label}
    </Text>
  </Pressable>
);

const NotificationRow: React.FC<{
  item: NotificationItem;
  bucket: BucketKey;
  onPress: () => void;
}> = ({ item, bucket, onPress }) => {
  const kind = KIND_STYLE[item.kind];
  const { Icon } = kind;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        item.unread && styles.rowUnread,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
    >
      <View style={[styles.rowIcon, { backgroundColor: kind.bg }]}>
        <Icon size={22} color={kind.fg} strokeWidth={2} />
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowTitleRow}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {item.unread ? <View style={styles.unreadDot} /> : null}
        </View>
        <Text style={styles.rowText} numberOfLines={2}>
          {item.body}
        </Text>
      </View>

      <View style={styles.rowMeta}>
        <Text style={styles.rowTime}>
          {formatTimestamp(item.timestamp, bucket)}
        </Text>
        <ChevronRight size={16} color={Colors.textTertiary} strokeWidth={2} />
      </View>
    </Pressable>
  );
};

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },

  /* Filter chips */
  /* ScrollView's underlying View has flex:1 behaviour by default in
   * a flex column, so an unconstrained horizontal ScrollView will
   * stretch vertically and eat the space the list needs. Capping
   * with `flexGrow: 0` + `flexShrink: 0` locks it to its content
   * height so the list ScrollView below can claim the remainder. */
  chipStrip: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chipRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  /* Fixed height + flex centering avoids the Android text-clipping
   * quirk where `Typography.body`'s lineHeight can leave letter
   * ascenders trimmed inside a padded container.
   * `includeFontPadding: false` on the label is the Android
   * complement — it removes the platform's extra glyph-padding so
   * the visual centre matches the box centre. */
  chip: {
    height: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: Colors.primary,
  },
  chipLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  chipLabelActive: {
    color: Colors.textOnPrimary,
    fontWeight: '700',
  },

  /* Scroll list — `flex: 1` makes this fill the remaining space
   * between the chip strip and the bottom of SafeScreen. Without
   * it, when a filter shrinks the list, RN doesn't collapse the
   * container upward; the empty area lands ABOVE the content and
   * the first "Today" header floats mid-screen. */
  scrollBg: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxxl,
  },

  section: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  sectionHeader: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
    marginBottom: Spacing.xs,
  },

  /* Row */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  rowUnread: {
    backgroundColor: Colors.primaryTint,
    borderColor: Colors.primary + '33', // ~20% alpha
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rowTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '800',
    flexShrink: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primary,
  },
  rowText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  rowMeta: {
    alignItems: 'flex-end',
    gap: 6,
    minWidth: 68,
  },
  rowTime: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  /* Empty state */
  emptyState: {
    marginTop: Spacing.xxxxl,
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.circle,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  emptySubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.85,
  },
});
