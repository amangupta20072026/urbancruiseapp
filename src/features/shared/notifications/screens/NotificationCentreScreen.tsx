/* eslint-disable no-void */
/* eslint-disable react/no-unstable-nested-components */
/**
 * ------------------------------------------------------------------
 * NotificationCentreScreen — SHARED, STACK SCREEN
 * ------------------------------------------------------------------
 * Cross-role notification centre. All visual structure is unchanged
 * from the mock-driven version. Only the data layer has changed:
 *
 *   BEFORE: const [items, setItems] = useState([...MOCK_NOTIFICATIONS])
 *   AFTER:  useNotificationsInfinite() + useMarkNotificationRead()
 *            + useMarkAllNotificationsRead()
 *
 * Changes from the mock version:
 *   - Infinite scroll via FlashList (FlatList would re-render the whole
 *     list on each page; FlashList's recycling handles large inboxes).
 *   - Loading / error states wired.
 *   - Tap → markRead mutation → deeplink dispatch via handleFcmClick.
 *   - "Mark all read" button appears when there are unread items.
 *   - meta.persist=false prevents the query persister from writing
 *     potentially stale inbox data to MMKV.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
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
import { handleFcmClick } from '@services/deeplinks';

import type {
  NotificationCategory,
  NotificationItem,
  NotificationKind,
} from '../types';
import {
  useNotificationsInfinite,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../hooks/useNotifications';

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
 * ================================================================ */

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
  trip_confirmed: { Icon: Calendar, fg: Colors.accent, bg: Colors.accentTint },
  driver_assigned: { Icon: Car, fg: Colors.primary, bg: Colors.primaryTint },
  payment_success: {
    Icon: CreditCard,
    fg: Colors.textSecondary,
    bg: Colors.surfaceMuted,
  },
  welcome: { Icon: Bell, fg: Colors.textSecondary, bg: Colors.surfaceMuted },
  promo: { Icon: Megaphone, fg: Colors.primary, bg: Colors.primaryTint },
  app_update: { Icon: Info, fg: Colors.textSecondary, bg: Colors.surfaceMuted },
};

/* ================================================================
 * Grouping helpers
 * ================================================================ */

type BucketKey = 'Today' | 'Yesterday' | 'Earlier';
type FlatItem =
  | { type: 'header'; key: BucketKey }
  | { type: 'row'; item: NotificationItem; bucket: BucketKey };

/**
 * Converts a flat sorted list into the FlashList data array that
 * alternates header + row items. FlashList needs a flat array; we
 * encode headers as objects so getItemType() can skip measuring them.
 */
function buildFlatList(items: NotificationItem[]): FlatItem[] {
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
  const out: FlatItem[] = [];
  for (const key of ['Today', 'Yesterday', 'Earlier'] as BucketKey[]) {
    if (groups[key].length === 0) continue;
    out.push({ type: 'header', key });
    for (const item of groups[key]) {
      out.push({ type: 'row', item, bucket: key });
    }
  }
  return out;
}

function formatTimestamp(iso: string, bucket: BucketKey): string {
  const d = new Date(iso);
  return bucket === 'Earlier' ? format(d, 'dd MMM yyyy') : format(d, 'h:mm a');
}

/* ================================================================
 * Screen
 * ================================================================ */

const NotificationCentreScreen: React.FC = () => {
  const navigation = useNavigation();
  const [filter, setFilter] = useState<FilterKey>('all');

  /* -- Data -------------------------------------------------------- */

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useNotificationsInfinite({
    category: filter === 'all' ? undefined : filter,
  });

  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAllRead } = useMarkAllNotificationsRead();

  // Flatten pages → single array
  const allItems: NotificationItem[] = useMemo(
    () => (data?.pages ?? []).flatMap(p => p.items),
    [data],
  );

  const unreadCount = useMemo(
    () => allItems.filter(i => i.unread).length,
    [allItems],
  );

  const flatData = useMemo(() => buildFlatList(allItems), [allItems]);

  /* -- Handlers ---------------------------------------------------- */

  const onItemPress = useCallback(
    (item: NotificationItem) => {
      markRead(item.id);
      // Tap → deeplink dispatch via the existing stash/drain pipeline.
      // `payload` is the JSON DeepLinkTarget object stored on the
      // notification row; handleFcmClick() calls resolveFcmClick() on it.
      if (item.payload) {
        handleFcmClick(JSON.stringify(item.payload));
      }
    },
    [markRead],
  );

  const onBack = useCallback(() => navigation.goBack(), [navigation]);

  /* -- Render helpers ---------------------------------------------- */

  const renderItem = useCallback(
    ({ item: flatItem }: { item: FlatItem }) => {
      if (flatItem.type === 'header') {
        return (
          <View style={styles.sectionHeaderWrap}>
            <Text style={styles.sectionHeader}>{flatItem.key}</Text>
          </View>
        );
      }
      return (
        <NotificationRow
          item={flatItem.item}
          bucket={flatItem.bucket}
          onPress={() => onItemPress(flatItem.item)}
        />
      );
    },
    [onItemPress],
  );

  /* ================================================================
   * Render
   * ================================================================ */

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Notifications"
          onBack={onBack}
          rightSlot={
            unreadCount > 0 ? (
              <Pressable
                onPress={() => markAllRead()}
                style={styles.markAllBtn}
                accessibilityRole="button"
                accessibilityLabel="Mark all notifications as read"
              >
                <Text style={styles.markAllText}>Mark all read</Text>
              </Pressable>
            ) : undefined
          }
        />
      </View>

      {/* Filter chips */}
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

      {/* List area */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Couldn't load notifications.</Text>
          <Pressable onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : flatData.length === 0 ? (
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
        <FlashList
          data={flatData}
          renderItem={renderItem}
          keyExtractor={(item, i) =>
            item.type === 'header' ? `h_${item.key}` : `r_${item.item.id}_${i}`
          }
          getItemType={item => item.type}
          contentContainerStyle={styles.listContent}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage
              ? () => (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                  </View>
                )
              : null
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeScreen>
  );
};

export default NotificationCentreScreen;

/* ================================================================
 * Subcomponents
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
      pressed && styles.chipPressed,
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
 * Styles (unchanged from mock version)
 * ================================================================ */

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  markAllBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  markAllText: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '600',
  },
  chipStrip: { flexGrow: 0, flexShrink: 0 },
  chipRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  chip: {
    height: 38,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    backgroundColor: Colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: Colors.primary,
  },
  chipPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  chipLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
    letterSpacing: 0.1,
  },
  chipLabelActive: {
    color: Colors.textOnPrimary,
    fontWeight: '700',
  },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxxl },
  sectionHeaderWrap: { marginTop: Spacing.md, marginBottom: Spacing.xs },
  sectionHeader: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.sm,
  },
  rowUnread: {
    backgroundColor: Colors.primaryTint,
    borderColor: Colors.primary + '33',
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
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
  rowMeta: { alignItems: 'flex-end', gap: 6, minWidth: 68 },
  rowTime: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  errorText: { ...Typography.body, color: Colors.textSecondary },
  retryBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  retryText: { ...Typography.body, color: Colors.white, fontWeight: '700' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  footerLoader: { paddingVertical: Spacing.lg, alignItems: 'center' },
  pressed: { opacity: 0.85 },
});
