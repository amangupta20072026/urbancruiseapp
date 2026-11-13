/**
 * ------------------------------------------------------------------
 * UcWorkplaceDashboardScreen — home for the 'general' workspace
 * ------------------------------------------------------------------
 * Finance, IT, HR, Digital Marketing and anyone with no department
 * set. They do not run quotations, bookings or trips, so instead of
 * the business dashboard they get an internal-workplace home.
 *
 * WHAT IS REAL AND WHAT IS NOT:
 *   - The greeting name comes from the signed-in user (Redux), which
 *     is real.
 *   - Tasks and Announcements are FIXTURE data. No table exists for
 *     either in `pinaak` or `saarthi`.
 *   - The four action cards have no screens behind them yet, so each
 *     one raises the app's standard "Coming soon" toast rather than
 *     pushing a dead-end placeholder screen. That is the established
 *     pattern here — see services/comingSoon.
 *
 * Reuses AppHeader so the brand, bell and avatar behave exactly as
 * they do on every other role's home screen.
 * ------------------------------------------------------------------
 */

import React, { useCallback } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  BookOpen,
  CalendarDays,
  FileCheck2,
  Headphones,
} from 'lucide-react-native';

import { AppHeader, SafeScreen } from '@shared/components';
import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { useAppSelector } from '@store/hooks';
import { selectDisplayName } from '@store/selectors/userSelectors';
import { notifyComingSoon } from '@services/comingSoon';
import { ucGreetingLine } from '@features/uc/dashboard/utils/salutation';

import { AnnouncementList } from '../components/AnnouncementList';
import { QuickActionCard } from '../components/QuickActionCard';
import { TaskList } from '../components/TaskList';
import { useWorkplaceDashboard } from '../hooks/useWorkplaceDashboard';

const UcWorkplaceDashboardScreen: React.FC = () => {
  const displayName = useAppSelector(selectDisplayName);
  const { tasks, announcements, isRefreshing, refresh } =
    useWorkplaceDashboard();

  const openMeetings = useCallback(() => notifyComingSoon('uc.meetings'), []);
  const openResources = useCallback(
    () => notifyComingSoon('uc.companyResources'),
    [],
  );
  const openApprovals = useCallback(() => notifyComingSoon('uc.approvals'), []);
  const openHelpdesk = useCallback(() => notifyComingSoon('uc.helpdesk'), []);

  return (
    <SafeScreen edges={['top']}>
      <AppHeader />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
        }
      >
        <View style={styles.greetingBlock}>
          <Text style={styles.greeting}>
            {ucGreetingLine(undefined, displayName)} 👋
          </Text>
          <Text style={styles.subGreeting}>
            Welcome to Urban Cruise Workplace
          </Text>
        </View>

        <View style={styles.actionGrid}>
          <View style={styles.actionRow}>
            <QuickActionCard
              title="My Meetings"
              description="View, join and manage meetings"
              Icon={CalendarDays}
              bg={Colors.orangeWash}
              iconBg={Colors.surface}
              iconFg="#C2410C"
              onPress={openMeetings}
            />
            <QuickActionCard
              title="Company Resources"
              description="Policies, documents & guidelines"
              Icon={BookOpen}
              bg={Colors.royalWash}
              iconBg={Colors.surface}
              iconFg="#6D28D9"
              onPress={openResources}
            />
          </View>

          <View style={styles.actionRow}>
            <QuickActionCard
              title="My Approvals"
              description="Review and take action on requests"
              Icon={FileCheck2}
              bg={Colors.blueWash}
              iconBg={Colors.surface}
              iconFg="#1D4ED8"
              onPress={openApprovals}
            />
            <QuickActionCard
              title="Helpdesk"
              description="IT, HR and Admin support"
              Icon={Headphones}
              bg={Colors.greenWash}
              iconBg={Colors.surface}
              iconFg="#047857"
              onPress={openHelpdesk}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>My Tasks</Text>
          <TaskList tasks={tasks} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Announcements</Text>
          <AnnouncementList announcements={announcements} />
        </View>
      </ScrollView>
    </SafeScreen>
  );
};

export default UcWorkplaceDashboardScreen;

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  greetingBlock: { marginTop: Spacing.sm },
  greeting: { ...Typography.h4, color: Colors.textPrimary },
  subGreeting: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actionGrid: { gap: Spacing.sm },
  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  cardTitle: {
    ...Typography.title,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
});
