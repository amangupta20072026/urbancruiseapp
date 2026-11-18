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
 *   │ 📅 Duration │ 👥 Passengers │ 🚌 Vehicle │  │ scrolls
 *   │ (i) About the Tour                      │  │
 *   │ ─────────────────────────────────────── │  │
 *   │ 📅 Itinerary                         ›  │  │
 *   │ ✓  Inclusions                        ›  │  │
 *   │ ✕  Exclusions                        ›  │  │
 *   │ ₹  Pricing                           ›  │  ↓
 *   ├─────────────────────────────────────────┤
 *   │ [ 🎧 Talk to a Travel Advisor ]         │  pinned
 *   └─────────────────────────────────────────┘
 *
 * THE BACKEND DECIDES WHAT IS ON THIS SCREEN
 *   The facts in the strip (labels, icons, values) and the rows under
 *   About the Tour (titles, icons, order, content) all come from the
 *   catalog. This screen only lays them out, so ops can add a fact, a
 *   row or a whole new section without an app release. Each block is
 *   drawn only when the catalog has something for it: no facts, no
 *   strip; no overview, no About block.
 *
 * ROWS OPEN A BOTTOM SHEET
 *   Tapping a row sets `openSection`; TourSectionSheet shows that
 *   section's content laid out by its kind (itinerary, list, pricing
 *   or text). A section with no content yet still shows its row, and
 *   its sheet says "Details coming soon".
 *
 * NO SEPARATE REQUEST
 *   The tour comes from the SAME cached catalog query the list used,
 *   picked out by id. Opening a card costs no network call and cannot
 *   show a spinner after the list has loaded. A cold deep link into
 *   this route fetches the catalog once, like any other first read.
 *
 * THE CALL BAR
 *   Hidden when app config carries no support number (see
 *   AdvisorCallBar); the content then ends clear of the home
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
import { TourAbout } from '../components/TourAbout';
import { TourDetailHeader } from '../components/TourDetailHeader';
import { TourFactStrip } from '../components/TourFactStrip';
import { TourSectionRow } from '../components/TourSectionRow';
import { TourSectionSheet } from '../components/TourSectionSheet';
import { TourTitleBlock } from '../components/TourTitleBlock';
import { useSpiritualTour } from '../hooks/useSpiritualTours';
import type { SpiritualTourInfoSection } from '../types';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;
type Route = RouteProp<CustomerStackParamList, 'SpiritualTourDetail'>;

const SpiritualTourDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const insets = useSafeAreaInsets();

  const support = useAppSelector(s => s.app.appConfig?.support);
  const { tour, isLoading, isError, isMissing, refetch } = useSpiritualTour(
    params.tourId,
  );

  const [openSection, setOpenSection] =
    useState<SpiritualTourInfoSection | null>(null);

  const phone = support?.phone;
  // The bar only exists on a loaded tour with a number to call.
  const hasCallBar = tour !== null && Boolean(phone);

  const onBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const onRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const onSectionPress = useCallback((section: SpiritualTourInfoSection) => {
    setOpenSection(section);
  }, []);

  const onSheetClose = useCallback(() => {
    setOpenSection(null);
  }, []);

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
          underneath gets its own bar back automatically. */}
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
            <Skeleton width="100%" height={72} radius={16} />
            <Skeleton width="100%" height={84} radius={20} />
            <Skeleton width="60%" height={26} />
            <Skeleton width="90%" height={16} />
            <Skeleton width="100%" height={60} />
            <Skeleton width="100%" height={60} />
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

            {tour.facts.length > 0 ? (
              <View style={styles.block}>
                <TourFactStrip facts={tour.facts} />
              </View>
            ) : null}

            {tour.overview ? (
              <View style={styles.blockLarge}>
                <TourAbout body={tour.overview} />
              </View>
            ) : null}

            {tour.sections.length > 0 ? (
              <View style={styles.blockLarge}>
                {tour.sections.map((section, index) => (
                  <TourSectionRow
                    key={section.id}
                    section={section}
                    onPress={onSectionPress}
                    isLast={index === tour.sections.length - 1}
                  />
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {hasCallBar ? (
        <AdvisorCallBar onPress={onCallAdvisor} bottomInset={insets.bottom} />
      ) : null}

      <TourSectionSheet
        section={openSection}
        onClose={onSheetClose}
        bottomInset={insets.bottom}
      />
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
    paddingTop: Spacing.lg,
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
  blockLarge: {
    marginTop: Spacing.xxl,
  },
});
