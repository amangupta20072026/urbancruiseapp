/**
 * ------------------------------------------------------------------
 * SpiritualTourDetailScreen — one tour
 * ------------------------------------------------------------------
 *   ┌─────────────────────────────────────────┐
 *   │ ‹   [ Urban Cruise ]      ♡  ⤴     1/5  │  carousel, full bleed
 *   ╭─────────────────────────────────────────╮
 *   │ ( ▲ NORTH TOUR )                        │
 *   │ Char Dham Yatra                         │
 *   │ A sacred pilgrimage to the four …       │
 *   │ [Yamunotri][Gangotri][Kedarnath][Badri] │
 *   │ 📅 Duration │ 🚗 Mode │ ☀ Season │ 📊 … │
 *   │ (Overview) Itinerary  Inclusions  …     │
 *   │ About the Tour ───                      │
 *   │ …                                       │
 *   │ ✦ Tour Highlights …                     │
 *   ╰─────────────────────────────────────────╯
 *   │ 🎧 Need Help?     [ Enquire / Book Now ]│  pinned
 *   └─────────────────────────────────────────┘
 *
 * NO SEPARATE REQUEST
 *   The tour comes from the SAME cached catalog query the list used,
 *   picked out by id. Opening a card costs no network call and cannot
 *   show a spinner after the list has loaded. A cold deep link into
 *   this route fetches the catalog once, like any other first read.
 *
 * ONLY CHAR DHAM IS WRITTEN UP
 *   It is the only tour with a detail design, so it is the only one
 *   with a tagline, facts, overview and highlights in the catalog.
 *   The other five open to the same screen with empty tabs — which is
 *   why every section here renders conditionally rather than assuming
 *   content exists. Filling the catalog in lights them up with no app
 *   change.
 *
 * THE HEART DOES NOT PERSIST YET — READ THIS BEFORE RELEASE
 *   There is no favourites feature in this app: no endpoint, no
 *   store, no query key. The heart was asked for now and wired later,
 *   so its state lives in `useState` and dies with the screen. Tap it,
 *   go back, come back: it is empty again. That is a small lie to the
 *   customer and should not ship as-is. Two honest ways out:
 *     - device-only: persist the id set through @services/storage;
 *     - account-wide: a saved-tours endpoint, then a mutation here.
 *   Until one of those lands, consider hiding the heart.
 * ------------------------------------------------------------------ */
import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Share from 'react-native-share';

import { EmptyState, ErrorView, Skeleton } from '@shared/components';
import { Colors, Radius, Spacing, Typography } from '@theme';
import { logEvent } from '@services/telemetry';
import { makePhoneCall } from '@services/contact';
import { toast } from '@services/toast';
import { useAppSelector } from '@store/hooks';
import type { CustomerStackParamList } from '@navigation/types';

import { DestinationTiles } from '../components/DestinationTiles';
import { TourDetailFooter } from '../components/TourDetailFooter';
import { TourFactStrip } from '../components/TourFactStrip';
import { TourHeroCarousel } from '../components/TourHeroCarousel';
import { TourTabBar, type TourTab } from '../components/TourTabBar';
import { ItineraryTab } from '../components/tabs/ItineraryTab';
import { ListTab } from '../components/tabs/ListTab';
import { OverviewTab } from '../components/tabs/OverviewTab';
import { PricingTab } from '../components/tabs/PricingTab';
import { useSpiritualTour } from '../hooks/useSpiritualTours';
import { REGION_LABEL, type SpiritualTour } from '../types';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;
type Route = RouteProp<CustomerStackParamList, 'SpiritualTourDetail'>;

/** Carousel height as a share of screen height, bounded for tablets. */
const HERO_RATIO = 0.34;
const HERO_MIN = 240;
const HERO_MAX = 360;

/**
 * Plain-text share. There is no /tours/:id deep link in the catalog
 * and no web page behind `ENV.deeplink.webHost` for a tour, so a URL
 * here would be a link that opens nothing. Text that names the tour
 * and its stops is useful on its own and cannot break.
 */
function shareMessageFor(tour: SpiritualTour): string {
  const stops = tour.places.map(p => p.name).join(' · ');
  const lines = [
    `${tour.title}${tour.titleNote ? ` ${tour.titleNote}` : ''}`,
    tour.tagline ?? tour.summary ?? '',
    stops,
    '',
    'Shared from the Urban Cruise app.',
  ];
  return lines.filter(line => line !== '').join('\n');
}

const SpiritualTourDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const support = useAppSelector(s => s.app.appConfig?.support);
  const { tour, isLoading, isError, isMissing, refetch } = useSpiritualTour(
    params.tourId,
  );

  const [tab, setTab] = useState<TourTab>('overview');
  // Screen-lifetime only. See the header note before release.
  const [isSaved, setIsSaved] = useState(false);

  const tagline = tour?.tagline ?? tour?.summary ?? null;

  const heroHeight = useMemo(
    () =>
      Math.min(HERO_MAX, Math.max(HERO_MIN, Math.round(height * HERO_RATIO))),
    [height],
  );

  const onBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const onRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const onToggleSaved = useCallback(() => {
    setIsSaved(prev => {
      logEvent('spiritual_tours.save_toggled', {
        tourId: params.tourId,
        saved: !prev,
      });
      return !prev;
    });
  }, [params.tourId]);

  const onShare = useCallback(() => {
    if (!tour) return;
    logEvent('spiritual_tours.shared', { tourId: tour.id });

    // The sheet is dismissible, so a cancel rejects. That is not an
    // error worth telling anyone about.
    Share.open({ message: shareMessageFor(tour), title: tour.title }).catch(
      () => undefined,
    );
  }, [tour]);

  const onNeedHelp = useCallback(() => {
    const phone = support?.phone;
    if (!phone) return;

    logEvent('spiritual_tours.help_tapped', { tourId: params.tourId });
    makePhoneCall(phone).catch(() => {
      toast.error('Could not start the call', {
        description: `Please dial ${phone}.`,
      });
    });
  }, [support?.phone, params.tourId]);

  const onEnquire = useCallback(() => {
    logEvent('spiritual_tours.quotation_requested', { tourId: params.tourId });
    /* The quotation form takes no params today, so the tour is not
       carried into it. Once RequestQuotation accepts a prefill, pass
       the tour here — the route is already the right one. */
    navigation.navigate('RequestQuotation');
  }, [navigation, params.tourId]);

  return (
    <View style={styles.root}>
      {/* The carousel runs under the status bar, so its icons must be
          light. RN pops this entry when the screen unmounts. */}
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {tour ? (
          <TourHeroCarousel
            images={tour.heroImages}
            fallbackImageUrl={tour.imageUrl}
            icon={tour.icon}
            height={heroHeight}
            topInset={insets.top}
            onBack={onBack}
            onShare={onShare}
            isSaved={isSaved}
            onToggleSaved={onToggleSaved}
          />
        ) : null}

        <View
          style={[styles.sheet, tour ? styles.sheetLifted : styles.sheetPlain]}
        >
          {isLoading ? (
            <View style={styles.skeletonWrap}>
              <Skeleton width="100%" height={200} radius={20} />
              <Skeleton width="60%" height={26} />
              <Skeleton width="90%" height={16} />
              <Skeleton width="100%" height={72} radius={16} />
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
              <View style={styles.regionBadge}>
                <Text style={styles.regionText}>
                  {REGION_LABEL[tour.region]} TOUR
                </Text>
              </View>

              <Text style={styles.title} accessibilityRole="header">
                {tour.title}
                {tour.titleNote ? (
                  <Text style={styles.titleNote}> {tour.titleNote}</Text>
                ) : null}
              </Text>

              {/* The detail tagline, falling back to the list summary so
                  a tour that is not written up still says something. */}
              {tagline ? (
                <Text style={styles.tagline} maxFontSizeMultiplier={1.6}>
                  {tagline}
                </Text>
              ) : null}

              <View style={styles.block}>
                <DestinationTiles places={tour.places} icon={tour.icon} />
              </View>

              <View style={styles.block}>
                <TourFactStrip facts={tour.facts} />
              </View>

              <View style={styles.block}>
                <TourTabBar value={tab} onChange={setTab} />
              </View>

              <View style={styles.panel}>
                {tab === 'overview' ? (
                  <OverviewTab
                    overview={tour.overview}
                    highlights={tour.highlights}
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
        </View>
      </ScrollView>

      {tour ? (
        <TourDetailFooter
          onNeedHelp={support?.phone ? onNeedHelp : null}
          onEnquire={onEnquire}
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
    backgroundColor: Colors.background,
  },
  scrollContent: {
    // The footer floats over the content; this keeps the last section
    // clear of it. Sized for the tallest footer (Need Help + CTA).
    paddingBottom: Spacing.sectionXLarge + Spacing.xxl,
  },
  sheet: {
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.surface,
  },
  sheetLifted: {
    // Lifts over the carousel's lower edge, as in the design.
    marginTop: -Spacing.xxl,
    paddingTop: Spacing.xl,
    borderTopLeftRadius: Radius.xxxl,
    borderTopRightRadius: Radius.xxxl,
  },
  sheetPlain: {
    // No carousel to lift over while loading, erroring or missing.
    paddingTop: Spacing.huge,
    minHeight: 400,
  },
  skeletonWrap: {
    gap: Spacing.lg,
  },
  regionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryDark,
  },
  regionText: {
    ...Typography.label,
    letterSpacing: 0.6,
    fontWeight: '800',
    color: Colors.surface,
  },
  title: {
    ...Typography.h1,
    marginTop: Spacing.md,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  titleNote: {
    ...Typography.subtitle,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  tagline: {
    ...Typography.body,
    marginTop: Spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  block: {
    marginTop: Spacing.xl,
  },
  panel: {
    marginTop: Spacing.xl,
  },
});
