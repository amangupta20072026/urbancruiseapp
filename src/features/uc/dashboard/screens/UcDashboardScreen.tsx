/**
 * ------------------------------------------------------------------
 * UcDashboardScreen — UC (admin) home tab
 * ------------------------------------------------------------------
 * LAYOUT (top → bottom):
 *   DashboardHeader      logo · notifications · profile
 *   GreetingBlock        "Good morning, Admin 👋" + today's date card
 *   Stats (2×2)          Trips · Customers · Bookings · Quotations
 *   BookingsTrendChart   daily bookings, Last 7 / 15 / 30 / 90 days
 *   RecentBookings       latest bookings with status pills
 *
 * WHERE TAPS GO:
 *   Total Trips        → Trips tab
 *   Total Customers    → Directory (opens on Customers)
 *   Total Bookings     → Bookings tab
 *   Total Quotations   → Quotations tab
 *   View All / a row   → Bookings tab (UC has no booking detail yet)
 *
 * DATA: stats + recent bookings (useDashboard) and the trend
 * (useBookingTrend, cached per range) load separately, so changing
 * the range only reloads the chart. Pull to refresh reloads both.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  CalendarCheck,
  ClipboardList,
  FileText,
  Users,
  type LucideIcon,
} from 'lucide-react-native';

import { SafeScreen } from '@shared/components/SafeScreen';
import { Colors, Spacing, Typography } from '@theme';
import type { UcStackParamList, UcTabParamList } from '@navigation/types';

import { BookingsTrendChart } from '../components/BookingsTrendChart';
import { DashboardHeader } from '../components/DashboardHeader';
import { GreetingBlock } from '../components/GreetingBlock';
import { RecentBookings } from '../components/RecentBookings';
import { StatCard } from '../components/StatCard';
import { useBookingTrend } from '../hooks/useBookingTrend';
import { useDashboard } from '../hooks/useDashboard';
import {
  DEFAULT_TREND_RANGE,
  isStatKey,
  type StatKey,
  type StatMetric,
  type TrendRange,
} from '../types';

type Nav = NativeStackNavigationProp<UcStackParamList>;

/** Icon, colours and destination per stat card. */
const STAT_VISUAL: Readonly<
  Record<
    StatKey,
    {
      Icon: LucideIcon;
      tint: { fg: string; bg: string };
      hint: string;
      /** A UC tab, or the Directory stack screen. */
      target: keyof UcTabParamList | 'Directory';
    }
  >
> = {
  trips: {
    Icon: CalendarCheck,
    tint: { fg: Colors.success, bg: Colors.primaryTint },
    hint: 'Opens Trips',
    target: 'Trips',
  },
  customers: {
    Icon: Users,
    tint: { fg: Colors.completed, bg: Colors.completedTint },
    hint: 'Opens the customer directory',
    target: 'Directory',
  },
  bookings: {
    Icon: ClipboardList,
    tint: { fg: Colors.royal, bg: Colors.royalTint },
    hint: 'Opens Bookings',
    target: 'Bookings',
  },
  quotations: {
    Icon: FileText,
    tint: { fg: Colors.accent, bg: Colors.accentTint },
    hint: 'Opens Quotations',
    target: 'Quotations',
  },
};

/** [a, b, c, d, e] → [[a, b], [c, d], [e]]. */
function pairs<T>(items: readonly T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += 2) out.push(items.slice(i, i + 2));
  return out;
}

const UcDashboardScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dashboard = useDashboard();
  const [range, setRange] = useState<TrendRange>(DEFAULT_TREND_RANGE);
  const trend = useBookingTrend(range);

  /* Greeting and date follow the device clock; refreshed whenever the
   * tab comes into focus and on pull to refresh. */
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
    }, []),
  );

  /* -------- Navigation -------- */

  const openTab = useCallback(
    (tab: keyof UcTabParamList) =>
      navigation.navigate('UcTabs', { screen: tab }),
    [navigation],
  );

  const openStat = useCallback(
    (key: StatKey) => {
      const { target } = STAT_VISUAL[key];
      if (target === 'Directory') navigation.navigate('Directory');
      else openTab(target);
    },
    [navigation, openTab],
  );

  const openBookings = useCallback(() => openTab('Bookings'), [openTab]);
  const goToNotifications = useCallback(
    () => navigation.navigate('NotificationCentre'),
    [navigation],
  );
  const goToProfile = useCallback(
    () => navigation.navigate('Profile'),
    [navigation],
  );

  /* -------- Refresh -------- */

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setNow(new Date());
    try {
      await Promise.all([dashboard.refetch(), trend.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [dashboard, trend]);

  /* Stats this app version doesn't know (e.g. added by a newer
   * backend) are skipped rather than crashing the screen. */
  const statRows = useMemo(
    () =>
      pairs<StatMetric>(
        (dashboard.data?.stats ?? []).filter(m => isStatKey(m.key)),
      ),
    [dashboard.data?.stats],
  );

  /* -------- Render -------- */

  const header = (
    <View style={styles.headerWrap}>
      <DashboardHeader
        hasUnread
        onBellPress={goToNotifications}
        onAvatarPress={goToProfile}
      />
    </View>
  );

  if (!dashboard.data) {
    return (
      <SafeScreen edges={['top']}>
        {header}
        <View style={styles.center}>
          {dashboard.isError ? (
            <>
              <Text style={styles.message}>Couldn’t load the dashboard.</Text>
              <Pressable
                onPress={() => dashboard.refetch()}
                hitSlop={8}
                accessibilityRole="button"
                style={styles.retry}
              >
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </>
          ) : (
            <ActivityIndicator size="large" color={Colors.primary} />
          )}
        </View>
      </SafeScreen>
    );
  }

  const data = dashboard.data;

  return (
    <SafeScreen edges={['top']}>
      {header}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <GreetingBlock name={data.greeting.name} now={now} />

        <View style={styles.stats}>
          {statRows.map(row => (
            <View key={row.map(m => m.key).join('-')} style={styles.statsRow}>
              {row.map(m => {
                const v = STAT_VISUAL[m.key];
                return (
                  <StatCard
                    key={m.key}
                    metric={m}
                    Icon={v.Icon}
                    tint={v.tint}
                    onPress={() => openStat(m.key)}
                    accessibilityHint={v.hint}
                  />
                );
              })}
              {/* Keeps a lone last card at half width. */}
              {row.length === 1 ? <View style={styles.statFiller} /> : null}
            </View>
          ))}
        </View>

        <BookingsTrendChart
          trend={trend.data}
          range={range}
          onRangeChange={setRange}
          isError={trend.isError}
          onRetry={() => trend.refetch()}
        />

        <RecentBookings
          items={data.recentBookings}
          onViewAll={openBookings}
          onPressBooking={openBookings}
        />
      </ScrollView>
    </SafeScreen>
  );
};

export default UcDashboardScreen;

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  message: { ...Typography.body, color: Colors.textSecondary },
  retry: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  retryText: {
    ...Typography.body,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.section,
    gap: Spacing.lg,
  },
  stats: { gap: Spacing.md },
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  statFiller: { flex: 1 },
});
