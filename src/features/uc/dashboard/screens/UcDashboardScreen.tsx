import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Car, Users, CalendarCheck, IndianRupee } from 'lucide-react-native';
import { SafeScreen } from '@shared/components/SafeScreen';
import { Colors, Spacing } from '@theme';
import { DashboardHeader } from '../components/DashboardHeader';
import { GreetingBlock } from '../components/GreetingBlock';
import { StatCard } from '../components/StatCard';
// eslint-disable-next-line import-x/no-unresolved
import { InsightsBanner } from '../components/InsightsBanner';
import { RecentBookings } from '../components/RecentBookings';
import { useDashboard } from '../hooks/useDashboard';

/**
 * Per-stat visual config. Keeps the screen dumb about theme and lets
 * StatCard render pure props.
 */
const statVisual = {
  trips: {
    icon: <CalendarCheck size={18} color="#16A34A" />,
    bg: '#E7F7EC',
    fg: '#16A34A',
  },
  customers: {
    icon: <Car size={18} color="#2563EB" />,
    bg: '#E6F0FE',
    fg: '#2563EB',
  },
  bookings: {
    icon: <IndianRupee size={18} color="#7C3AED" />,
    bg: '#EEE7FA',
    fg: '#7C3AED',
  },
  revenue: {
    icon: <Users size={18} color="#F97316" />,
    bg: '#FFE9D6',
    fg: '#F97316',
  },
} as const;

const UcDashboardScreen: React.FC = () => {
  const { data, isLoading, refetch, isRefetching } = useDashboard();

  if (isLoading || !data) {
    return (
      <SafeScreen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.primary}
          />
        }
      >
        <DashboardHeader hasUnread />

        <GreetingBlock
          name={data.greeting.name}
          dateISO={data.greeting.dateISO}
        />

        {/* 4-up horizontal stat cards */}
        <View style={styles.statsRow}>
          {data.stats.map(m => {
            const v = statVisual[m.key];
            return (
              <View key={m.key} style={styles.statCell}>
                <StatCard
                  metric={m}
                  icon={v.icon}
                  iconBg={v.bg}
                  accent={v.fg}
                />
              </View>
            );
          })}
        </View>

        <InsightsBanner
          headline="Your business is growing! 🎉"
          body="You have 18% more bookings this week compared to last week."
          ctaLabel="View Insights"
        />

        <RecentBookings items={data.recentBookings} />
      </ScrollView>
    </SafeScreen>
  );
};

export default UcDashboardScreen;

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.section,
    gap: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCell: {
    flex: 1,
    minWidth: 0, // lets text shrink inside the flex cell instead of overflowing
  },
});