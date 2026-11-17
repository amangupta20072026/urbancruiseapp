/**
 * ------------------------------------------------------------------
 * SpiritualTourDetailScreen — one tour
 * ------------------------------------------------------------------
 *   ┌─────────────────────────────────────────┐
 *   │ ‹          [ UC Urban Cruise ]          │  fixed
 *   ├─────────────────────────────────────────┤
 *   │ ┌────┐ Char Dham Yatra                  │  ↑
 *   │ │ 🛕 │ Yamunotri · Gangotri · …         │  │
 *   │ └────┘                                  │  │
 *   │ 📅 Duration │ 🚗 Mode │ ▮ Difficulty │ 📅 │  │ scrolls
 *   │ (Overview) Itinerary Inclusions …       │  │
 *   │ (i) About the Tour                      │  │
 *   │ ★ Tour Highlights                       │  │
 *   │ ╭ 📍 Places Covered ───────────────────╮ │  ↓
 *   ├─────────────────────────────────────────┤
 *   │ [ 🎧 Talk to Travel Advisory ]          │  pinned
 *   └─────────────────────────────────────────┘
 *
 * NO SEPARATE REQUEST
 *   The tour comes from the SAME cached catalog query the list used,
 *   picked out by id. Opening a card costs no network call and cannot
 *   show a spinner after the list has loaded. A cold deep link into
 *   this route fetches the catalog once, like any other first read.
 *
 * ONLY CHAR DHAM IS WRITTEN UP
 *   It is the only tour with a facts strip, overview and highlights in
 *   the catalog. The other tours open to this same screen with empty
 *   tabs, which is why every section renders conditionally rather than
 *   assuming content exists. Filling the catalog in lights them up with
 *   no app change.
 *
 * ONE ACTION
 *   The only action besides browsing the tabs is the advisor call bar.
 *   It is hidden when app config carries no support number (see
 *   AdvisorCallBar), and the list then ends clear of the home
 *   indicator on its own.
 *
 * WHY SafeScreen IS NOT USED
 *   The header paints its own top inset and the call bar pads itself
 *   with the bottom inset, as on the list screen.
 * ------------------------------------------------------------------ */
import React, { useCallback, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, ErrorView, Skeleton } from '@shared/components';
import { Colors, Spacing } from '@theme';
import { logEvent } from '@services/telemetry';
import { makePhoneCall } from '@services/contact';
import { toast } from '@services/toast';
import { useAppSelector } from '@store/hooks';
import type { CustomerStackParamList } from '@navigation/types';

import { AdvisorCallBar } from '../components/AdvisorCallBar';
import { TourDetailHeader } from '../components/TourDetailHeader';
import { TourFactStrip } from '../components/TourFactStrip';
import { TourTabBar, type TourTab } from '../components/TourTabBar';
import { TourTitleBlock } from '../components/TourTitleBlock';
import { ItineraryTab } from '../components/tabs/ItineraryTab';
import { ListTab } from '../components/tabs/ListTab';
import { OverviewTab } from '../components/tabs/OverviewTab';
import { PricingTab } from '../components/tabs/PricingTab';
import { useSpiritualTour } from '../hooks/useSpiritualTours';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;
type Route = RouteProp<CustomerStackParamList, 'SpiritualTourDetail'>;

/** The button's wording, as in the design. */
const CALL_LABEL = 'Talk to Travel Advisory';

const SpiritualTourDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const insets = useSafeAreaInsets();

  const support = useAppSelector(s => s.app.appConfig?.support);
  const { tour, isLoading, isError, isMissing, refetch } = useSpiritualTour(
    params.tourId,
  );

  const [tab, setTab] = useState<TourTab>('overview');

  const phone = support?.phone;
  // The bar only exists on a loaded tour with a number to call.
  const hasCallBar = tour !== null && Boolean(phone);

  const onBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const onRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const onCallAdvisor = useCallback(() => {
    if (!phone) return;

    logEvent('spiritual_tours.advisor_called', {
      from: 'detail',
      tourId: params.tourId,
    });

    // The dialler may refuse to open. makePhoneCall reports that as a
    // resolved `{ ok: false }`, not a rejection, so both are handled:
    // the customer is given the number so the call is still possible.
    const onFailed = () => {
      toast.error('Could not start the call', {
        description: `Please dial ${phone}.`,
      });
    };
    makePhoneCall(phone).then(result => {
      if (!result.ok) onFailed();
    }, onFailed);
  }, [phone, params.tourId]);

  return (
    <View style={styles.root}>
      {/* Dark icons on the white header. RN keeps a stack of these:
          unmounting this screen pops the entry and the list screen
          underneath gets its light-content bar back automatically. */}
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.surface}
        translucent={false}
      />

      <TourDetailHeader onBack={onBack} topInset={insets.top} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          // With no call bar the body is the last thing on screen, so
          // it must clear the home indicator itself.
          !hasCallBar && { paddingBottom: Spacing.xl + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.skeletonWrap}>
            <Skeleton width="100%" height={84} radius={20} />
            <Skeleton width="100%" height={72} radius={16} />
            <Skeleton width="60%" height={26} />
            <Skeleton width="90%" height={16} />
          </View>
        ) : null}

        {!isLoading && isError ? (
          <ErrorView
            title="Could not load this tour"
            message="Please check your connection and try again."
            onRetry={onRetry}
          />
        ) : null}

        {isMissing ? (
          <EmptyState
            title="This tour is no longer listed"
            message="It may have been removed. Browse the other spiritual journeys instead."
            ctaLabel="Back to tours"
            onCtaPress={onBack}
          />
        ) : null}

        {tour ? (
          <>
            <TourTitleBlock tour={tour} />

            <View style={styles.block}>
              <TourFactStrip facts={tour.facts} />
            </View>

            <View style={styles.block}>
              <TourTabBar value={tab} onChange={setTab} />
            </View>

            <View style={styles.block}>
              {tab === 'overview' ? (
                <OverviewTab
                  overview={tour.overview}
                  highlights={tour.highlights}
                  places={tour.places}
                  icon={tour.icon}
                />
              ) : null}
              {tab === 'itinerary' ? (
                <ItineraryTab itinerary={tour.itinerary} />
              ) : null}
              {tab === 'inclusions' ? (
                <ListTab items={tour.inclusions} variant="included" />
              ) : null}
              {tab === 'exclusions' ? (
                <ListTab items={tour.exclusions} variant="excluded" />
              ) : null}
              {tab === 'pricing' ? (
                <PricingTab pricing={tour.pricing} note={tour.pricingNote} />
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>

      {hasCallBar ? (
        <AdvisorCallBar
          label={CALL_LABEL}
          onPress={onCallAdvisor}
          bottomInset={insets.bottom}
        />
      ) : null}
    </View>
  );
};

export default SpiritualTourDetailScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    // The call bar is a sibling, not an overlay, so the scroll needs
    // no padding for it — only a little breathing room at the end.
    paddingBottom: Spacing.xl,
  },
  skeletonWrap: {
    gap: Spacing.lg,
  },
  block: {
    marginTop: Spacing.xl,
  },
});
