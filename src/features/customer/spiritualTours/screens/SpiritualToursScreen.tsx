/**
 * ------------------------------------------------------------------
 * SpiritualToursScreen — "Coming soon" for the in-app section
 * ------------------------------------------------------------------
 * Reached from the "Spiritual Tours" tile on Customer Home.
 *
 * WHAT CHANGED, AND WHY THE OLD VERSION IS GONE
 *   This screen used to send customers to a SEPARATE Spiritual Tours
 *   app on the store. Management has since decided Spiritual Tours
 *   ships INSIDE Urban Cruise. So there is no store link, no platform
 *   detection and no "separate app" notice — all of that would now be
 *   telling the customer something untrue.
 *
 *   Leftovers from that version, to clean up once the decision is
 *   settled (left in place because reversing it would need them):
 *     - `spiritualToursApp` on AppConfig, app and backend side
 *     - SPIRITUAL_TOURS_STORE_LINKS in the backend's app-config.ts
 *
 *   ┌───────────────────────────────────────┐
 *   │ ‹        [ Urban Cruise ]        ╱▲╲  │  deep-green hero with
 *   │ Spiritual                       ╱███╲ │  the temple silhouette
 *   │ Tours                                 │
 *   │ Explore divine destinations with …    │
 *   ╭───────────────────────────────────────╮
 *   │              ╱▲╲                      │  cream glow + temple
 *   │             ╱███╲                     │
 *   │       ⧗ [ Coming Soon ]               │  ribbon over its base
 *   │   Spiritual Tours is Coming Soon!     │
 *   │   We are working hard to bring you …  │
 *   │   📍 Exclusive │ 📅 Custom │ 🛕 Easy   │
 *   │   ┌─────────────────────────────────┐ │
 *   │   │ 🔔 │ Get Notified   [Notify Me] │ │
 *   │   └─────────────────────────────────┘ │
 *   └───────────────────────────────────────┘
 *
 * THE TEMPLE IS THE REPO'S OWN ASSET, IN FULL COLOUR
 *   `service-temple.png` (the Home service switcher's artwork) is a
 *   detailed 512×512 illustration on a transparent canvas: domes,
 *   arches, pillars, an Om finial.
 *
 *   An earlier pass ran it through `tintColor` to turn it green and
 *   match the design. That was wrong. Flattening every opaque pixel
 *   to one colour merges all of that interior detail into a single
 *   mass — on device it reads as a green blob, and at the 28 dp
 *   feature-tile size it is just a triangle. The asset is an
 *   illustration, not a glyph, and it only survives in full colour
 *   at a decent size.
 *
 *   So: the card shows it full colour at 180 dp on a warm halo,
 *   which is the one place it has the room to read. It appears
 *   nowhere else. The hero keeps tonal circles instead of a faded
 *   temple, and the feature tile uses a line icon, because at those
 *   sizes and opacities the illustration cannot work.
 *
 * LAYOUT NOTE — why SafeScreen is not used
 *   SafeScreen paints BOTH insets with one colour. This screen needs
 *   a green top and a white bottom, so the hero paints its own top
 *   inset and the scroll pads itself with `insets.bottom`.
 * ------------------------------------------------------------------
 */

import React, { useCallback } from 'react';
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  Hourglass,
  Landmark,
  MapPin,
  type LucideProps,
} from 'lucide-react-native';

import { BrandLockup } from '@shared/components/BrandLockup';
import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { logEvent } from '@services/telemetry';
import { toast } from '@services/toast';

/* ================================================================
 * Palette
 * ================================================================
 * Deeper greens than Colors.primaryDark so white text on the hero
 * clears 7:1, plus the gold used on the ribbon. Local because
 * nothing else in the app uses a green this dark or this gold.
 * ================================================================ */

const HERO_BG = '#1B5E20';
const HERO_TINT = '#2E7D32';
const HERO_SUBTITLE = 'rgba(255, 255, 255, 0.88)';
/** Warm halo behind the card's temple, as in the design. */
const GLOW = '#FDF4DC';
const GOLD = '#FFC107';
const FEATURE_TILE = '#EAF7EC';
const NOTIFY_BG = '#EAF7EC';
/** The pale wash at the very bottom of the sheet. */
const WAVE = '#F0F9F1';

const TEMPLE = require('@assets/images/service-temple.png');

/* ================================================================
 * Artwork slot
 * ================================================================ */

/**
 * A finished illustration for the card, if one is ever produced —
 * the design's version has foliage, birds and a multi-tone temple
 * that a flat tint cannot reproduce. While null, the card composes
 * the glow and the tinted temple below, which is close and uses only
 * what the repo already ships.
 *
 * TODO(design): set to
 *   require('@assets/images/spiritual-tours-coming-soon.png')
 */
const COMING_SOON_ARTWORK: ImageSourcePropType | null = null;

/* ================================================================
 * Content
 * ================================================================ */

type Feature = {
  label: string;
  Icon: React.ComponentType<LucideProps>;
};

/**
 * `Landmark` stands in for the design's little temple glyph. The
 * repo's temple is an illustration and collapses to a triangle at
 * this size — a line icon is the only thing that reads at 24 dp.
 */
const FEATURES: readonly Feature[] = [
  { label: 'Exclusive\nPackages', Icon: MapPin },
  { label: 'Custom\nItineraries', Icon: CalendarDays },
  { label: 'Easy\nBookings', Icon: Landmark },
];

/* ================================================================
 * Screen
 * ================================================================ */

const SpiritualToursScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const onBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  /**
   * TODO(api): this records nothing on the server yet, so no one can
   * actually be notified. The toast is therefore worded to promise
   * only what the app can keep — that the section will appear here
   * when it launches — rather than a push the backend cannot send.
   * When an endpoint exists (e.g. POST
   * /customer/spiritual-tours/interest), call it here and the copy
   * can become a real promise.
   */
  const onNotifyMe = useCallback(() => {
    logEvent('spiritual_tours.notify_me_tapped');
    toast.success('Thanks for your interest', {
      description: 'Spiritual Tours will appear here as soon as it launches.',
    });
  }, []);

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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ───────────────────────────────────────────── */}
        <View style={[styles.hero, { paddingTop: insets.top + Spacing.sm }]}>
          <View
            pointerEvents="none"
            style={styles.heroHalo}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
          <View
            pointerEvents="none"
            style={styles.heroHaloSmall}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />

          <View style={styles.heroTopRow}>
            <Pressable
              onPress={onBack}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={({ pressed }) => [
                styles.backBtn,
                pressed && styles.pressed,
              ]}
            >
              <ChevronLeft size={26} color={Colors.surface} strokeWidth={2.4} />
            </Pressable>

            {/* White plate: the wordmark's "Urban" is brand green and
                would all but vanish on the hero. The plate guarantees
                contrast whatever the artwork becomes. */}
            <View style={styles.brandPlate}>
              <BrandLockup width={150} variant="wordmark" />
            </View>

            {/* Balances the back button so the plate sits centred. */}
            <View style={styles.backBtn} />
          </View>

          <Text style={styles.heroTitle}>Spiritual{'\n'}Tours</Text>
          <Text style={styles.heroSubtitle}>
            Explore divine destinations with our dedicated Spiritual Tours
            section.
          </Text>
        </View>

        {/* ── White sheet ────────────────────────────────────── */}
        <View style={styles.sheet}>
          {/* ── Artwork + ribbon ── */}
          <View style={styles.artwork}>
            {COMING_SOON_ARTWORK ? (
              <Image
                source={COMING_SOON_ARTWORK}
                style={styles.artworkImage}
                resizeMode="contain"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
            ) : (
              <>
                <View style={styles.glow} />
                <Image
                  source={TEMPLE}
                  style={styles.cardTemple}
                  resizeMode="contain"
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
              </>
            )}

            {/* Ribbon sits over the temple's base, as in the design.
                Announced to screen readers; the artwork behind it is
                decorative and hidden. */}
            <View style={styles.ribbon} accessibilityRole="text">
              <Hourglass size={20} color={GOLD} strokeWidth={2.2} />
              <Text style={styles.ribbonText}>Coming Soon</Text>
            </View>
          </View>

          <Text style={styles.comingTitle}>
            Spiritual Tours is Coming Soon!
          </Text>
          <Text style={styles.comingBody}>
            We are working hard to bring you an amazing Spiritual Tours
            experience. Stay tuned!
          </Text>

          {/* ── Three features ── */}
          <View style={styles.features}>
            {FEATURES.map((feature, index) => (
              <React.Fragment key={feature.label}>
                {index === 0 ? null : <View style={styles.featureRule} />}
                <View style={styles.feature}>
                  <View style={styles.featureTile}>
                    <feature.Icon
                      size={24}
                      color={Colors.primaryDark}
                      strokeWidth={2}
                    />
                  </View>
                  <Text style={styles.featureLabel}>{feature.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          {/* ── Get notified ── */}
          <View style={styles.notify}>
            <Bell size={28} color={Colors.primaryDark} strokeWidth={2} />
            <View style={styles.notifyRule} />

            <View style={styles.notifyCopy}>
              <Text style={styles.notifyTitle}>Get Notified</Text>
              <Text style={styles.notifyBody}>
                Be the first to know when this feature is available.
              </Text>
            </View>

            <Pressable
              onPress={onNotifyMe}
              accessibilityRole="button"
              accessibilityLabel="Notify me when Spiritual Tours launches"
              style={({ pressed }) => [
                styles.notifyBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.notifyBtnText}>Notify Me</Text>
            </Pressable>
          </View>

          {/* Pale wash at the foot of the sheet. Decorative. */}
          <View
            style={styles.wave}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default SpiritualToursScreen;

/* ================================================================
 * Styles
 * ================================================================ */

const SIDE = Spacing.xl;
const ARTWORK_HEIGHT = 264;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    // Matches the hero so an over-scroll bounce at the top shows
    // green, not a white flash.
    backgroundColor: HERO_BG,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  /* ── Hero ── */
  hero: {
    backgroundColor: HERO_BG,
    paddingHorizontal: SIDE,
    // The sheet lifts into this space.
    paddingBottom: Spacing.xxxxl,
    overflow: 'hidden',
  },
  heroHalo: {
    position: 'absolute',
    width: 360,
    height: 360,
    right: -110,
    top: -70,
    borderRadius: Radius.pill,
    backgroundColor: HERO_TINT,
  },
  heroHaloSmall: {
    position: 'absolute',
    width: 190,
    height: 190,
    right: -55,
    top: 120,
    borderRadius: Radius.pill,
    backgroundColor: HERO_TINT,
    opacity: 0.8,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  brandPlate: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
  },
  heroTitle: {
    ...Typography.h1,
    marginTop: Spacing.xl,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '800',
    color: Colors.surface,
  },
  heroSubtitle: {
    ...Typography.body,
    marginTop: Spacing.md,
    lineHeight: 22,
    // Keeps the subtitle clear of the temple on a narrow phone.
    paddingRight: Spacing.xxxxl,
    color: HERO_SUBTITLE,
  },
  pressed: {
    opacity: 0.85,
  },

  /* ── White sheet ── */
  sheet: {
    // Lifts over the hero's lower edge.
    marginTop: -Spacing.xxl,
    paddingHorizontal: SIDE,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
    borderTopLeftRadius: Radius.xxxl,
    borderTopRightRadius: Radius.xxxl,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },

  /* ── Artwork ── */
  artwork: {
    height: ARTWORK_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  artworkImage: {
    width: '100%',
    height: ARTWORK_HEIGHT,
  },
  glow: {
    position: 'absolute',
    width: 212,
    height: 212,
    top: 0,
    borderRadius: Radius.pill,
    backgroundColor: GLOW,
  },
  cardTemple: {
    // Sits inside the halo with a margin all round, so the steps at
    // its base are never clipped by the halo's curve.
    width: 180,
    height: 180,
    marginTop: Spacing.lg,
  },
  ribbon: {
    position: 'absolute',
    // Clear of the temple. The previous value put the ribbon over
    // the temple's base and cut its steps off, which is what made
    // the artwork unreadable.
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 2.5,
    borderColor: GOLD,
    backgroundColor: HERO_BG,
    ...Shadows.md,
  },
  ribbonText: {
    ...Typography.subtitle,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.surface,
  },

  /* ── Copy ── */
  comingTitle: {
    ...Typography.h1,
    marginTop: Spacing.lg,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '800',
    textAlign: 'center',
    color: HERO_BG,
  },
  comingBody: {
    ...Typography.body,
    marginTop: Spacing.md,
    lineHeight: 23,
    textAlign: 'center',
    color: Colors.textSecondary,
  },

  /* ── Features ── */
  features: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.xxl,
  },
  feature: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureRule: {
    width: StyleSheet.hairlineWidth,
    // Shorter than the column so it reads as a separator, not a box
    // edge.
    height: 56,
    alignSelf: 'center',
    backgroundColor: Colors.border,
  },
  featureTile: {
    width: 50,
    height: 50,
    borderRadius: Radius.md,
    backgroundColor: FEATURE_TILE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    ...Typography.bodySmall,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
    color: Colors.textPrimary,
  },

  /* ── Get notified ── */
  notify: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xxl,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: NOTIFY_BG,
  },
  notifyRule: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: Colors.primary,
  },
  notifyCopy: {
    flex: 1,
  },
  notifyTitle: {
    ...Typography.subtitle,
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  notifyBody: {
    ...Typography.caption,
    marginTop: Spacing.xxs,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  notifyBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: HERO_BG,
    ...Shadows.sm,
  },
  notifyBtnText: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.surface,
  },

  /* ── Foot wash ── */
  wave: {
    position: 'absolute',
    left: -80,
    right: -80,
    bottom: -150,
    height: 220,
    borderRadius: Radius.pill,
    backgroundColor: WAVE,
    zIndex: -1,
  },
});
