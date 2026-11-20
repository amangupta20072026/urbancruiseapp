/**
 * ------------------------------------------------------------------
 * CustomerHomeScreen
 * ------------------------------------------------------------------
 * The Customer Home tab. Composition:
 *
 *   [AppHeader: brand + bell + avatar — shared by every role]
 *   [Greeting]
 *   [Service switcher]
 *   [HERO CARD  — exactly one, chosen by the priority ladder below]
 *   ─────────────────────────────────────────────
 *   [Upcoming Trip — always renders; iconified empty state]
 *   ─────────────────────────────────────────────
 *   [Explore our fleet — real brochure catalog; hidden if it can't load]
 *   ─────────────────────────────────────────────
 *   [Made-in-India footer]
 *
 * Recent Activity used to sit where the fleet is now. It was removed
 * because it repeated the Notification Centre (bell) — same events,
 * same grouping, same tap targets.
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
 * always-visible section of its own, independent of whichever hero card is showing. A
 * ready quotation and a confirmed trip aren't mutually exclusive in
 * the product, so hiding one behind the other was a bug, not a
 * feature — see git history on this file for the prior 4-rung ladder.
 *
 * ── Non-hero state handling ──────────────────────────────────────
 *   - Loading (first mount, no cached data) → screen-level spinner
 *   - Error                                 → ErrorView with retry
 *   - Upcoming Trip empty                   → iconified empty state
 *   - Fleet loading / failed / empty        → skeleton / hidden
 *     (FleetCarousel handles its own states; it never blocks Home)
 *
 * ── Navigation intents ───────────────────────────────────────────
 *   - Bell / Avatar → handled inside the shared AppHeader
 *     (NotificationCentre / Profile)
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
import { CalendarClock } from 'lucide-react-native';

import { AppHeader, SafeScreen, ErrorView } from '@shared/components';
import { Colors, Radius, Spacing, Typography } from '@theme';
import type { BrochureEntry } from '@features/customer/brochures';

import type { CustomerStackParamList } from '@navigation/types';

import { selectFirstName } from '@store/selectors/userSelectors';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { welcomeDismissed } from '@store/slices/appSlice';

import { useHomeData } from '../hooks/useHomeData';
import { useServiceMode } from '../hooks/useServiceMode';
import type { ServiceMode } from '../types';
import { GreetingBlock } from '../components/GreetingBlock';
import { ServiceSwitcher } from '../components/ServiceSwitcher';
import { QuotationReadyCard } from '../components/QuotationReadyCard';
import { QuotationPreparingCard } from '../components/QuotationPreparingCard';
import { RequestQuotationCard } from '../components/RequestQuotationCard';
import { UpcomingTripCard } from '../components/UpcomingTripCard';
import { SectionHeader } from '../components/SectionHeader';
import { FleetCarousel } from '../components/FleetCarousel';
import { MadeInIndiaFooter } from '../components/MadeInIndiaFooter';
import { WelcomeOverlay } from '../components/WelcomeOverlay';
import { logEvent } from '@services/telemetry/logEvent';

type CustomerNavigation = NativeStackNavigationProp<CustomerStackParamList>;

const CustomerHomeScreen: React.FC = () => {
  const navigation = useNavigation<CustomerNavigation>();

  const firstName = useSelector(selectFirstName);
  // First-time welcome: set only for a just-created account (see
  // useCustomerOnboard), session-only, cleared when closed.
  const dispatch = useAppDispatch();
  const pendingWelcome = useAppSelector(s => s.app.pendingWelcome);
  const onWelcomeDismiss = useCallback(() => {
    dispatch(welcomeDismissed());
  }, [dispatch]);

  const { mode, change: changeServiceMode } = useServiceMode();

  /* Spiritual Tours is its own SECTION, not a filter on this screen —
   * so its tile behaves as a button, not a tab. Tapping it pushes the
   * tours screen and leaves `mode` on Vehicle Rental (the
   * 'car_bus' key), because every card below is vehicle-rental
   * content: leaving the tile highlighted would promise a themed
   * home screen that does not exist.
   *
   * Vehicle Rental still goes through the hook, keeping its existing
   * no-op-on-reselect and analytics behaviour. */
  const onServiceModeChange = useCallback(
    (next: ServiceMode) => {
      if (next === 'spiritual_tour') {
        logEvent('home.spiritual_tours_opened');
        navigation.navigate('SpiritualTours');
        return;
      }
      changeServiceMode(next);
    },
    [changeServiceMode, navigation],
  );

  const { quotation, upcomingTrip, isLoading, isRefreshing, error, refresh } =
    useHomeData();

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
    navigation.navigate('RequestQuotation');
  }, [navigation]);

  const onViewTrip = useCallback(() => {
    logEvent('home.cta_tapped', {
      cta: 'view_trip',
      trip_id: upcomingTrip?.id ?? '',
    });
    // TODO(nav): navigate to Trip detail
  }, [upcomingTrip?.id]);

  /* Explore our fleet — browse-only: no quotation, so no `select`. */
  const onOpenVehicle = useCallback(
    (entry: BrochureEntry) => {
      logEvent('home.cta_tapped', {
        cta: 'fleet_vehicle',
        group_key: entry.groupKey,
        tier: entry.tier,
      });
      navigation.navigate('VehicleVideo', {
        groupKey: entry.groupKey,
        tier: entry.tier,
      });
    },
    [navigation],
  );

  const onViewAllFleet = useCallback(() => {
    logEvent('home.cta_tapped', { cta: 'fleet_view_all' });
    navigation.navigate('VehicleBrochures');
  }, [navigation]);

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
      <AppHeader />

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

            {/* Explore our fleet — real brochure catalog. */}
            <SectionHeader
              title="Explore our fleet"
              subtitle="Watch the vehicles before you book"
              onActionPress={onViewAllFleet}
            />
            <FleetCarousel onOpenVehicle={onOpenVehicle} />

            <MadeInIndiaFooter />
          </>
        )}
      </ScrollView>

      <WelcomeOverlay
        visible={pendingWelcome}
        firstName={firstName}
        onDismiss={onWelcomeDismiss}
      />
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
    // Room under the footer so the floating tab bar never covers it.
    paddingBottom: Spacing.xxxxl * 2,
  },
  loadingWrap: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorWrap: {
    paddingVertical: Spacing.xxl,
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
