/**
 * ------------------------------------------------------------------
 * CustomerHomeScreen
 * ------------------------------------------------------------------
 * The Customer Home tab. Composition:
 *
 *   [Header: brand + bell + avatar]
 *   [Greeting]
 *   [Service switcher]
 *   [HERO CARD  — exactly one, chosen by the priority ladder below]
 *   ─────────────────────────────────────────────
 *   [Upcoming Trip — always renders; iconified empty state]
 *   ─────────────────────────────────────────────
 *   [Recent Activity — always renders; iconified empty state]
 *
 * ── Hero card priority ladder ────────────────────────────────────
 *   1. quotation.status === 'ready'       → QuotationReadyCard
 *   2. quotation.status === 'in_progress' → QuotationPreparingCard
 *   3. otherwise                          → RequestQuotationCard
 *                                           ("Plan your next journey")
 *
 * The ladder is strict — only ONE hero card renders. This matches
 * how the product wants the home screen to guide the user's next
 * action: at any moment there is exactly one "most important thing"
 * we're asking them to look at.
 *
 * "Upcoming Trip" is deliberately NOT part of the ladder — it's an
 * always-visible section of its own (same pattern as "Recent
 * Activity"), independent of whichever hero card is showing. A
 * ready quotation and a confirmed trip aren't mutually exclusive in
 * the product, so hiding one behind the other was a bug, not a
 * feature — see git history on this file for the prior 4-rung ladder.
 *
 * ── Non-hero state handling ──────────────────────────────────────
 *   - Loading (first mount, no cached data) → screen-level spinner
 *   - Error                                 → ErrorView with retry
 *   - Upcoming Trip empty                   → iconified empty state
 *   - Activity empty                        → iconified empty state
 *
 * ── Navigation intents ───────────────────────────────────────────
 *   - Bell         → NotificationCentre (already registered)
 *   - Avatar       → Profile (already registered)
 *   - Card CTAs / View All → TODO(nav) — placeholders emit
 *     home.cta_tapped so we still capture intent while the
 *     destinations are being built.
 * ------------------------------------------------------------------ */

import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Inbox, CalendarClock } from 'lucide-react-native';

import { SafeScreen, ErrorView } from '@shared/components';
import { Colors, Radius, Spacing, Typography } from '@theme';

import type { CustomerStackParamList } from '@navigation/types';

import {
  selectFirstName,
  selectDisplayName,
  selectUserId,
} from '@store/selectors/userSelectors';

import { useHomeData } from '../hooks/useHomeData';
import { useServiceMode } from '../hooks/useServiceMode';
import { HomeHeader } from '../components/HomeHeader';
import { GreetingBlock } from '../components/GreetingBlock';
import { ServiceSwitcher } from '../components/ServiceSwitcher';
import { QuotationReadyCard } from '../components/QuotationReadyCard';
import { QuotationPreparingCard } from '../components/QuotationPreparingCard';
import { RequestQuotationCard } from '../components/RequestQuotationCard';
import { UpcomingTripCard } from '../components/UpcomingTripCard';
import { SectionHeader } from '../components/SectionHeader';
import { ActivityRow } from '../components/ActivityRow';
import { logEvent } from '@services/telemetry/logEvent';

type CustomerNavigation = NativeStackNavigationProp<CustomerStackParamList>;

/* Unread count for the notification bell. Wired to a real
 * useUnreadCount hook when NotificationCentre gets real. */
const MOCK_UNREAD = 3;

const CustomerHomeScreen: React.FC = () => {
  const navigation = useNavigation<CustomerNavigation>();

  const firstName = useSelector(selectFirstName);
  const displayName = useSelector(selectDisplayName);
  const userId = useSelector(selectUserId);

  const { mode, change: onServiceModeChange } = useServiceMode();

  const {
    quotation,
    upcomingTrip,
    recentActivity,
    isLoading,
    isRefreshing,
    error,
    refresh,
  } = useHomeData();

  /* -------- Nav handlers -------- */

  const goToNotifications = useCallback(() => {
    navigation.navigate('NotificationCentre');
  }, [navigation]);

  const goToProfile = useCallback(() => {
    navigation.navigate('Profile');
  }, [navigation]);

  /* -------- Placeholder handlers for CTAs whose destinations
   * haven't been built yet. Grep for TODO(nav) to find them all.
   * Each fires home.cta_tapped so we can still see intent + prioritise
   * which unbuilt screen is most needed. -------- */

  const onReviewQuotation = useCallback(() => {
    logEvent('home.cta_tapped', {
      cta: 'review_quotation',
      quotation_id: quotation?.id ?? '',
    });
    // TODO(nav): navigate to Quotation review once the screen is built
  }, [quotation?.id]);

  const onRequestQuotation = useCallback(() => {
    logEvent('home.cta_tapped', { cta: 'request_quotation' });
    // TODO(nav): navigate to Request quotation flow
  }, []);

  const onViewTrip = useCallback(() => {
    logEvent('home.cta_tapped', {
      cta: 'view_trip',
      trip_id: upcomingTrip?.id ?? '',
    });
    // TODO(nav): navigate to Trip detail
  }, [upcomingTrip?.id]);

  const onViewAllActivity = useCallback(() => {
    logEvent('home.cta_tapped', { cta: 'view_all_activity' });
    // TODO(nav): navigate to Recent activity list
  }, []);

  const onViewAllTrips = useCallback(() => {
    logEvent('home.cta_tapped', { cta: 'view_all_trips' });
    // TODO(nav): navigate to Trips list
  }, []);

  /* -------- Hero card selection (strict priority ladder) --------
   *
   *   1. Ready quotation      → review it
   *   2. In-progress quotation → status card ("being prepared")
   *   3. Upcoming trip         → surface it as the hero
   *   4. Nothing pending       → invite to plan a new journey
   *
   * The ladder is expressed as an inline ternary chain so React only
   * mounts the chosen card. useMemo would be pointless — the check
   * is cheaper than the memo bookkeeping.
   * ------------------------------------------------------------- */

  const renderHero = () => {
    if (quotation && quotation.status === 'ready') {
      return (
        <QuotationReadyCard
          quotation={quotation}
          onReviewPress={onReviewQuotation}
        />
      );
    }
    if (quotation && quotation.status === 'in_progress') {
      return <QuotationPreparingCard />;
    }
    return <RequestQuotationCard onRequestPress={onRequestQuotation} />;
  };

  /* -------- Render -------- */

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      <HomeHeader
        displayName={displayName}
        userId={userId}
        unreadCount={MOCK_UNREAD}
        onNotificationsPress={goToNotifications}
        onProfilePress={goToProfile}
      />

      <ScrollView
        style={styles.scrollBg}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing && !isLoading}
            onRefresh={refresh}
            tintColor={Colors.primary}
          />
        }
      >
        <GreetingBlock firstName={firstName} />

        <ServiceSwitcher value={mode} onChange={onServiceModeChange} />

        {error ? (
          <View style={styles.errorWrap}>
            <ErrorView onRetry={refresh} />
          </View>
        ) : isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : (
          <>
            {renderHero()}

            {/* Upcoming Trip — always renders; iconified empty state. */}
            <SectionHeader
              title="Upcoming Trip"
              onActionPress={upcomingTrip ? onViewAllTrips : undefined}
            />
            {upcomingTrip ? (
              <UpcomingTripCard trip={upcomingTrip} onViewPress={onViewTrip} />
            ) : (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <CalendarClock
                    size={28}
                    color={Colors.textTertiary}
                    strokeWidth={1.75}
                  />
                </View>
                <Text style={styles.emptyTitle}>No upcoming trips yet</Text>
                <Text style={styles.emptySubtitle}>
                  Your next confirmed trip will show up here.
                </Text>
              </View>
            )}

            {/* Recent Activity — always renders; iconified empty state. */}
            <SectionHeader
              title="Recent Activity"
              onActionPress={
                recentActivity.length > 0 ? onViewAllActivity : undefined
              }
            />
            {recentActivity.length > 0 ? (
              <View style={styles.activityList}>
                {recentActivity.map((item, index) => (
                  <ActivityRow
                    key={item.id}
                    activity={item}
                    isFirst={index === 0}
                    isLast={index === recentActivity.length - 1}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Inbox
                    size={28}
                    color={Colors.textTertiary}
                    strokeWidth={1.75}
                  />
                </View>
                <Text style={styles.emptyTitle}>Nothing here yet</Text>
                <Text style={styles.emptySubtitle}>
                  Your bookings and payments will show up here.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeScreen>
  );
};

export default CustomerHomeScreen;

/* ------------------------------------------------------------------ */
/* Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  scrollBg: {
    backgroundColor: Colors.backgroundSecondary,
  },
  scroll: {
    paddingBottom: Spacing.xxxxl,
  },
  loadingWrap: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorWrap: {
    paddingVertical: Spacing.xxl,
  },
  activityList: {
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  emptyCard: {
    marginHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    gap: 8,
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
});
