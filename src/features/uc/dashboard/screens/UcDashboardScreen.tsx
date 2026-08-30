import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Car, Users, CalendarCheck, IndianRupee } from 'lucide-react-native';
import { SafeScreen } from '@shared/components/SafeScreen';
import { Colors, Spacing } from '@theme';
import { DashboardHeader } from '../components/DashboardHeader';
import { GreetingBlock } from '../components/GreetingBlock';
import { StatCard } from '../components/StatCard';
import { RevenueChart } from '../components/RevenueChart';
import { RecentBookings } from '../components/RecentBookings';
import { useDashboard } from '../hooks/useDashboard';

const statVisual = {
  trips: {
    icon: <Car size={22} color={Colors.primary} />,
    bg: '#E7F7EC',
    spark: '#22C55E',
  },
  customers: {
    icon: <Users size={22} color={Colors.primary} />,
    bg: '#E7F7EC',
    spark: '#22C55E',
  },
  bookings: {
    icon: <CalendarCheck size={22} color={Colors.secondary} />,
    bg: '#FFF3D6',
    spark: '#F59E0B',
  },
  revenue: {
    icon: <IndianRupee size={22} color="#7C3AED" />,
    bg: '#EEE7FA',
    spark: '#7C3AED',
  },
} as const;

const spark = (seed: number) =>
  Array.from(
    { length: 8 },
    (_, i) => Math.sin((i + seed) / 1.7) * 8 + i * 3 + seed,
  );

const H_PADDING = 16;
const GAP = Spacing.md; // 12

const UcDashboardScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const cardWidth = (width - H_PADDING * 2 - GAP) / 2; // exactly 2 per row

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
        <DashboardHeader title="UC Home" subtitle="Admin Dashboard" hasUnread />
        <GreetingBlock
          name={data.greeting.name}
          dateISO={data.greeting.dateISO}
        />

        <View style={styles.statsGrid}>
          {data.stats.map((m, idx) => {
            const v = statVisual[m.key];
            return (
              <View key={m.key} style={{ width: cardWidth }}>
                <StatCard
                  metric={m}
                  icon={v.icon}
                  iconBg={v.bg}
                  sparkColor={v.spark}
                  sparkline={spark(idx + 1)}
                />
              </View>
            );
          })}
        </View>

        <RevenueChart data={data.revenue} />
        <RecentBookings items={data.recentBookings} />
      </ScrollView>
    </SafeScreen>
  );
};

export default UcDashboardScreen;

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    paddingHorizontal: H_PADDING,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.section,
    gap: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
});
