/**
 * ------------------------------------------------------------------
 * SpiritualToursScreen — what Urban Cruise offers
 * ------------------------------------------------------------------
 *   ┌────────────────────────────────────────┐
 *   │ ‹        [ Urban Cruise ]              │
 *   │ Spiritual Tours                        │
 *   │ ───                                    │
 *   ╭────────────────────────────────────────╮
 *   │ NORTH TOURS                            │
 *   │  🛕 Char Dham Yatra                 ›  │
 *   │     Yamunotri · Gangotri · Kedar…      │
 *   │  🛕 Ayodhya-Prayagraj-Varanasi      ›  │
 *   │  🔱 Shakti peeth Tour (North, MP)   ›  │
 *   │                                        │
 *   │ WEST TOURS                             │
 *   │  ॐ Ujjain-Omkareshwar               ›  │
 *   │  🐘 Ashtvinayak Yatra               ›  │
 *   │  🕉 Jyotirlinga Tours (Mah. + Guj.) ›  │
 *   ╰────────────────────────────────────────╯
 *   │ [ 🎧 Talk to a Travel Advisor ]        │  pinned
 *   └────────────────────────────────────────┘
 *
 * TWO PIECES OF TEXT PER TOUR, AND NO MORE
 *   Artwork, name, stops. No duration, no season, no price, no
 *   rating — those belong on the detail screen, one tap away.
 *
 *   The stops line is shown in full and wraps, so row height follows
 *   the content. Keep it to the stops: every extra kind of line makes
 *   the tours look more alike and pushes the last one off the bottom.
 *
 * ONE ACTION
 *   Tapping a row opens the detail. The only other thing on the
 *   screen is the advisor call bar, pinned so it is in thumb reach
 *   at any scroll position.
 *
 * WHERE THE CONTENT COMES FROM
 *   GET /config/spiritual-tours, cached and revalidated by
 *   useSpiritualTours. Nothing here is hard-coded, so ops adds a
 *   service with a backend deploy and no app release.
 *
 * FIXED HEADER, SCROLLING LIST
 *   The hero and the call bar are fixed; only the white sheet between
 *   them scrolls, and its content starts at the NORTH TOURS band.
 *   The sheet is a plain View that owns the rounded top corners and
 *   clips (`overflow: 'hidden'`), and the ScrollView sits inside it.
 *   The corners must belong to this fixed wrapper: put them on the
 *   scroll content and they would scroll away with it.
 *
 * LAYOUT NOTE — why SafeScreen is not used
 *   SafeScreen paints BOTH insets with one colour. This screen needs
 *   a green top and a white bottom, so the hero paints its own top
 *   inset and the call bar pads itself with `insets.bottom`.
 * ------------------------------------------------------------------ */
import React, { useCallback } from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
import { RegionHeader } from '../components/RegionHeader';
import { TourCard } from '../components/TourCard';
import { HERO_BG, SpiritualToursHero } from '../components/SpiritualToursHero';
import { useTourSections } from '../hooks/useSpiritualTours';
import type { SpiritualTour } from '../types';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;

/** Placeholder rows while the first load runs. Matches the row height. */
const SkeletonList: React.FC = () => (
  <View style={styles.skeletonWrap}>
    {[0, 1, 2, 3].map(i => (
      <Skeleton key={i} width="100%" height={64} radius={16} />
    ))}
  </View>
);

const SpiritualToursScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const support = useAppSelector(s => s.app.appConfig?.support);
  const { sections, isLoading, isError, isEmpty, refetch } = useTourSections();

  const onBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const onTourPress = useCallback(
    (tour: SpiritualTour) => {
      logEvent('spiritual_tours.tour_opened', {
        tourId: tour.id,
        region: tour.region,
      });
      navigation.navigate('SpiritualTourDetail', { tourId: tour.id });
    },
    [navigation],
  );

  const onRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const onCallAdvisor = useCallback(() => {
    const phone = support?.phone;
    if (!phone) return;

    logEvent('spiritual_tours.advisor_called', { from: 'list' });
    makePhoneCall(phone).catch(() => {
      // The dialler refused to open. Give the customer the number so
      // the call is still possible by hand.
      toast.error('Could not start the call', {
        description: `Please dial ${phone}.`,
      });
    });
  }, [support?.phone]);

  return (
    <View style={styles.root}>
      {/* Light icons for the dark hero. RN keeps a stack of these:
          unmounting this screen pops the entry and the screen
          underneath gets its dark-content bar back automatically. */}
      <StatusBar
        barStyle="light-content"
        backgroundColor={HERO_BG}
        translucent={false}
      />

      {/* Fixed: stays put while the list scrolls. */}
      <SpiritualToursHero onBack={onBack} topInset={insets.top} />

      {/* The sheet clips and rounds; the list scrolls inside it. */}
      <View style={styles.sheet}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            // With no call bar the list is the last thing on screen,
            // so it must clear the home indicator itself.
            !support?.phone && { paddingBottom: Spacing.xl + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? <SkeletonList /> : null}

          {!isLoading && isError ? (
            <ErrorView
              title="Could not load tours"
              message="Please check your connection and try again."
              onRetry={onRetry}
            />
          ) : null}

          {isEmpty ? (
            <EmptyState
              title="No tours just yet"
              message="New spiritual journeys are being prepared. Please check back soon."
            />
          ) : null}

          {sections.map(section => (
            <View key={section.region} style={styles.section}>
              <RegionHeader label={section.label} />

              <View style={styles.rows}>
                {section.tours.map(tour => (
                  <TourCard key={tour.id} tour={tour} onPress={onTourPress} />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      <AdvisorCallBar
        onPress={support?.phone ? onCallAdvisor : null}
        bottomInset={insets.bottom}
      />
    </View>
  );
};

export default SpiritualToursScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    // Matches the hero so an over-scroll bounce at the top shows
    // green, not a white flash.
    backgroundColor: HERO_BG,
  },
  sheet: {
    flex: 1,
    // Lifts over the hero's lower edge. Later sibling, so it paints
    // above the hero.
    marginTop: -Spacing.xxl,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: Colors.surface,
    // Clips the scrolling rows to the rounded corners.
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    // The call bar is a sibling, not an overlay, so the scroll needs
    // no padding for it — only a little breathing room at the end.
    paddingBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  rows: {
    // 9 pt between cards and 12 under the band: the cards must read
    // as belonging to the band above them, not float between bands.
    gap: Spacing.sm + 1,
    marginTop: Spacing.md,
  },
  skeletonWrap: {
    gap: Spacing.sm,
  },
});
