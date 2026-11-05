/**
 * ------------------------------------------------------------------
 * VendorDashboardScreen — Vendor home tab
 * ------------------------------------------------------------------
 * LAYOUT (top → bottom):
 *   AppHeader            logo · notifications · profile (shared)
 *   VendorGreetingBlock  "Good morning, Rajesh! 👋" + today's date card
 *   Stats                2×2: Total Vehicles · Total Drivers
 *                             Total Bookings · Total Trips
 *   BookingsTrendChart   daily bookings, Last 7 / 15 / 30 / 90 days
 *                        (shared with UC; counts only, no money)
 *   VehicleStatusCard    On Trip · Upcoming · Under Service · Inactive
 *   UpcomingTrips        next 3 trips, soonest first (shared with UC)
 *
 * No money on this screen (product decision): no earnings card, no
 * amounts, no margin in the chart.
 *
 * WHERE TAPS GO: the vendor Bookings, Trips, Fleet and Drivers
 * screens are not built yet, so every tap shows the "Coming soon" toast
 * (product decision):
 *   Total Vehicles, Vehicle Status tile / View All → vendor.fleet
 *   Total Drivers                                  → vendor.drivers
 *   Total Bookings                                 → vendor.bookings
 *   Total Trips, Upcoming Trips View All           → vendor.tripList
 *   An upcoming trip                               → vendor.trips
 *   When a screen ships, replace its toast with navigation here.
 *
 * DATA: summary (useVendorDashboard) and trend (useVendorBookingTrend,
 * cached per range) load separately, so changing the range only
 * reloads the chart. Pull to refresh reloads both.
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
import { useFocusEffect } from '@react-navigation/native';
import {
  CalendarCheck,
  Car,
  ClipboardList,
  Users,
  type LucideIcon,
} from 'lucide-react-native';

import { AppHeader, SafeScreen } from '@shared/components';
import { notifyComingSoon, type ComingSoonFeature } from '@services/comingSoon';
import { Colors, Spacing, Typography } from '@theme';
import { BookingsTrendChart } from '@features/uc/dashboard/components/BookingsTrendChart';
import { StatCard } from '@features/uc/dashboard/components/StatCard';
import { UpcomingTrips } from '@features/uc/dashboard/components/UpcomingTrips';
import {
  DEFAULT_TREND_RANGE,
  type TrendRange,
} from '@features/uc/dashboard/types';

import { VehicleStatusCard } from '../components/VehicleStatusCard';
import { VendorGreetingBlock } from '../components/VendorGreetingBlock';
import { useVendorBookingTrend } from '../hooks/useVendorBookingTrend';
import { useVendorDashboard } from '../hooks/useVendorDashboard';
import type { VendorStatKey, VendorStatMetric } from '../types';
import {
  orderVehicleStatus,
  orderVendorStats,
  upcomingTripsForDisplay,
} from '../utils/dashboard';

/** Icon, colours and toast per stat card. */
const STAT_VISUAL: Readonly<
  Record<
    VendorStatKey,
    {
      Icon: LucideIcon;
      tint: { fg: string; bg: string };
      hint: string;
      feature: ComingSoonFeature;
    }
  >
> = {
  vehicles: {
    Icon: Car,
    tint: { fg: Colors.success, bg: Colors.primaryTint },
    hint: 'Opens Fleet',
    feature: 'vendor.fleet',
  },
  drivers: {
    Icon: Users,
    tint: { fg: Colors.completed, bg: Colors.completedTint },
    hint: 'Opens Drivers',
    feature: 'vendor.drivers',
  },
  bookings: {
    Icon: ClipboardList,
    tint: { fg: Colors.royal, bg: Colors.royalTint },
    hint: 'Opens Bookings',
    feature: 'vendor.bookings',
  },
  trips: {
    Icon: CalendarCheck,
    tint: { fg: Colors.success, bg: Colors.primaryTint },
    hint: 'Opens Trips',
    feature: 'vendor.tripList',
  },
};

/**
 * Card rows (2×2): Vehicles + Drivers, then Bookings + Trips. A stat
 * the server didn't send is left out; its row partner then fills the
 * row.
 */
const STAT_ROWS: readonly (readonly VendorStatKey[])[] = [
  ['vehicles', 'drivers'],
  ['bookings', 'trips'],
];

const VendorDashboardScreen: React.FC = () => {
  const dashboard = useVendorDashboard();
  const [range, setRange] = useState<TrendRange>(DEFAULT_TREND_RANGE);
  const trend = useVendorBookingTrend(range);

  /* Greeting and date follow the device clock; refreshed whenever the
   * tab comes into focus and on pull to refresh. */
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
    }, []),
  );

  /* -------- Taps (all "Coming soon" until the screens exist) -------- */

  const openFleet = useCallback(() => notifyComingSoon('vendor.fleet'), []);
  const openTrips = useCallback(() => notifyComingSoon('vendor.tripList'), []);
  const openTrip = useCallback(() => notifyComingSoon('vendor.trips'), []);

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

  /* -------- Data (checked; never trusts the shape blindly) -------- */

  const statRows = useMemo(() => {
    const byKey = new Map<VendorStatKey, VendorStatMetric>(
      orderVendorStats(dashboard.data?.stats).map(m => [m.key, m]),
    );
    return STAT_ROWS.map(row =>
      row.flatMap(k => {
        const m = byKey.get(k);
        return m ? [m] : [];
      }),
    ).filter(row => row.length > 0);
  }, [dashboard.data?.stats]);

  const vehicleStatus = useMemo(
    () => orderVehicleStatus(dashboard.data?.vehicleStatus),
    [dashboard.data?.vehicleStatus],
  );

  const upcomingTrips = useMemo(
    () => upcomingTripsForDisplay(dashboard.data?.upcomingTrips),
    [dashboard.data?.upcomingTrips],
  );

  /* -------- Render -------- */

  const header = <AppHeader />;

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
        <VendorGreetingBlock
          name={dashboard.data.greeting?.name ?? ''}
          now={now}
        />

        {statRows.length > 0 ? (
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
                      onPress={() => notifyComingSoon(v.feature)}
                      accessibilityHint={v.hint}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        ) : null}

        <BookingsTrendChart
          trend={trend.data}
          range={range}
          onRangeChange={setRange}
          isError={trend.isError}
          onRetry={() => trend.refetch()}
        />

        <VehicleStatusCard
          items={vehicleStatus}
          onViewAll={openFleet}
          onPressStatus={openFleet}
        />

        <UpcomingTrips
          items={upcomingTrips}
          onViewAll={openTrips}
          onPressTrip={openTrip}
        />
      </ScrollView>
    </SafeScreen>
  );
};

export default VendorDashboardScreen;

const styles = StyleSheet.create({
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
});
