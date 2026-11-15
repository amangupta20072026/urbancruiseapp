/**
 * ------------------------------------------------------------------
 * SpiritualToursScreen — download page for the separate app
 * ------------------------------------------------------------------
 * Spiritual Tours is its own app published by Urban Cruise. This
 * screen is the handover: it says what that app is and sends the
 * customer to the right store.
 *
 *   ┌───────────────────────────────────────┐
 *   │ ‹        [ Urban Cruise ]             │  deep-green hero,
 *   │                                       │  soft arcs behind
 *   │ Spiritual                             │
 *   │ Tours                                 │
 *   │ Explore divine destinations with …    │
 *   ╰───────────────────────────────╮       │
 *   ┌───────────────────────────────┴─────┐ │  card lifts OUT of
 *   │ [icon] │ Download our               │ │  the hero on a shadow
 *   │        │ Spiritual Tours app        │ │
 *   │ ( Exclusive packages ) ( Itineraries)│ │
 *   │ [  Download on Google Play     › ]  │ │
 *   │        Launching soon on Google Play │ │
 *   └──────────────────────────────────────┘
 *   │ (i) │ Spiritual Tours is a separate … │
 *   └───────────────────────────────────────┘
 *
 * LAYOUT NOTE — why the hero owns the top inset
 *   SafeScreen paints its top padding with `backgroundColor`, so the
 *   hero green is passed there and the status-bar strip becomes part
 *   of the hero. The bottom edge is NOT handed to SafeScreen (white
 *   content sits there); the scroll pads itself with `insets.bottom`
 *   instead.
 *
 * ONE BUTTON, FOR THIS DEVICE
 *   An Android phone cannot install from the App Store and an iPhone
 *   cannot install from Play, so exactly one store button shows: the
 *   one for `Platform.OS`.
 *
 * THE URL IS THE SERVER'S, NEVER THE APP'S
 *   `appConfig.spiritualToursApp.url` is already resolved for this
 *   device's platform by GET /config/app (the bootstrap fetch sends
 *   `platform`). The app never builds a store URL itself — a guessed
 *   package id would send customers to a 404 or, worse, to someone
 *   else's listing.
 *
 * DISABLED UNTIL PUBLISHED
 *   The app is on neither store yet, so the server sends null and the
 *   button renders disabled with a "Launching soon" line. Tapping it
 *   still shows the coming-soon toast, so the tap is never silently
 *   swallowed and ops can see the demand in telemetry.
 *
 *   When ops sets a real link in the backend's
 *   SPIRITUAL_TOURS_STORE_LINKS, the button goes live on the next
 *   cold start. No app release, no change to this file.
 * ------------------------------------------------------------------
 */

import React, { useCallback } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { notifyComingSoon } from '@services/comingSoon';
import { logEvent } from '@services/telemetry';
import { toast } from '@services/toast';
import { useAppSelector } from '@store/hooks';

import { BrandLockup } from '../components/BrandLockup';

/* ================================================================
 * Hero palette
 * ================================================================
 * Deeper than Colors.primaryDark so white body text clears 7:1 and
 * the card above it reads as lifted rather than floating on brand
 * green. Local because nothing else in the app uses a green this
 * dark; hoist into @theme/colors if a second screen wants it.
 * ================================================================ */

const HERO_TOP = '#2E7D32'; // Colors.primaryDark
const HERO_BOTTOM = '#1B5E20';
/** Arc strokes drawn over the hero. Low alpha: texture, not pattern. */
const HERO_ARC = 'rgba(255, 255, 255, 0.13)';
const HERO_SUBTITLE = 'rgba(255, 255, 255, 0.88)';

/* ================================================================
 * Store presentation — label per platform
 * ================================================================
 * Only the copy lives here. WHICH entry is used is decided by
 * `Platform.OS`; whether it works at all, by the server's URL.
 * ================================================================ */

type StoreKey = 'android' | 'ios';

const STORE_LABEL: Readonly<Record<StoreKey, string>> = {
  android: 'Download on Google Play',
  ios: 'Download on App Store',
};

const STORE_NAME: Readonly<Record<StoreKey, string>> = {
  android: 'Google Play',
  ios: 'the App Store',
};

const STORE: StoreKey = Platform.OS === 'ios' ? 'ios' : 'android';

/**
 * Short feature chips. Every one is a phrase already present in the
 * card's own approved sentence below ("exclusive spiritual packages,
 * itineraries, and bookings for pilgrimages and holy destinations"),
 * so the chips promise nothing the screen does not already say.
 * Ops can re-word freely — these are display strings, nothing keys
 * off them.
 */
const FEATURE_CHIPS: readonly string[] = [
  'Exclusive packages',
  'Itineraries',
  'Easy bookings',
];

/* ================================================================
 * Screen
 * ================================================================ */

const SpiritualToursScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  /* Already narrowed to this device's platform by the server. `??
   * null` covers the pre-bootstrap window, where appConfig is still
   * undefined — the button is disabled then too, which is correct:
   * there is no link to open. */
  const storeUrl = useAppSelector(
    s => s.app.appConfig?.spiritualToursApp.url ?? null,
  );

  const available = storeUrl !== null;

  const onBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const onDownload = useCallback(() => {
    if (storeUrl === null) {
      // Not published on this store yet. Say so and record the
      // attempt, rather than letting the tap do nothing.
      notifyComingSoon('customer.spiritualToursApp');
      return;
    }

    logEvent('spiritual_tours.store_opened', { store: STORE });

    // openURL rejects when nothing can handle the link (a device
    // without Play Services, a bare emulator image). Catch it and
    // say so — an unhandled rejection here would be invisible.
    Linking.openURL(storeUrl).catch(() => {
      toast.error('Could not open the store', {
        description: 'Please search for "Urban Cruise Spiritual Tours".',
      });
    });
  }, [storeUrl]);

  return (
    <View style={styles.root}>
      {/* Light icons for the dark hero. RN keeps a stack of these:
          unmounting this screen pops the entry and the screen
          underneath gets its dark-content bar back automatically. */}
      <StatusBar
        barStyle="light-content"
        backgroundColor={HERO_BOTTOM}
        translucent={false}
      />

      {/* SafeScreen is not used here: it paints BOTH insets with one
          colour, and this screen needs a green top and a white
          bottom. StatusBar styling travels with the hero instead. */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ───────────────────────────────────────────── */}
        <View style={[styles.hero, { paddingTop: insets.top + Spacing.sm }]}>
          {/* Decorative arcs. Plain bordered circles rather than SVG:
              two Views cost less than pulling a renderer in, and
              nothing here needs a path. */}
          <View
            pointerEvents="none"
            style={[styles.arc, styles.arcSmall]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
          <View
            pointerEvents="none"
            style={[styles.arc, styles.arcLarge]}
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

            {/* White plate behind the logo: the wordmark's "Urban" is
                brand green, which would all but vanish on the hero.
                The plate guarantees contrast whatever the artwork. */}
            <View style={styles.brandPlate}>
              <BrandLockup width={132} variant="wordmark" />
            </View>

            {/* Balances the back button so the plate sits centred. */}
            <View style={styles.backBtn} />
          </View>

          <Text style={styles.heroTitle}>Spiritual{'\n'}Tours</Text>
          <Text style={styles.heroSubtitle}>
            Explore divine destinations with our dedicated Spiritual Tours App.
          </Text>
        </View>

        {/* ── Download card, lifted out of the hero ──────────── */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.appIcon}>
              <BrandLockup
                width={46}
                variant="mark"
                accessibilityLabel={null}
              />
              <View style={styles.appIconBadge}>
                <Text style={styles.appIconBadgeText} numberOfLines={1}>
                  Spiritual Tours
                </Text>
              </View>
            </View>

            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>
                Download our{'\n'}Spiritual Tours app
              </Text>
              <Text style={styles.cardBody}>
                Get access to exclusive spiritual packages, itineraries, and
                bookings for pilgrimages and holy destinations.
              </Text>
            </View>
          </View>

          <View style={styles.chipRow}>
            {FEATURE_CHIPS.map(chip => (
              <View key={chip} style={styles.chip}>
                <Text style={styles.chipText}>{chip}</Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={onDownload}
            accessibilityRole="button"
            accessibilityLabel={STORE_LABEL[STORE]}
            accessibilityState={{ disabled: !available }}
            accessibilityHint={
              available
                ? undefined
                : `Not published yet. Launching soon on ${STORE_NAME[STORE]}.`
            }
            style={({ pressed }) => [
              styles.storeBtn,
              available ? styles.storeBtnLive : styles.storeBtnOff,
              pressed && available && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.storeBtnText,
                available ? styles.storeBtnTextLive : styles.storeBtnTextOff,
              ]}
              numberOfLines={1}
            >
              {STORE_LABEL[STORE]}
            </Text>
            <ChevronRight
              size={19}
              color={available ? Colors.surface : Colors.textSecondary}
              strokeWidth={2.5}
            />
          </Pressable>

          {available ? null : (
            <Text style={styles.launchNote}>
              Launching soon on {STORE_NAME[STORE]}.
            </Text>
          )}
        </View>

        {/* ── Info strip ─────────────────────────────────────── */}
        <View style={styles.infoStrip}>
          <Info size={22} color={Colors.primaryDark} strokeWidth={2} />
          <View style={styles.infoRule} />
          <Text style={styles.infoText}>
            Spiritual Tours is a separate app by Urban Cruise, focused on
            pilgrimage and spiritual travel experiences.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default SpiritualToursScreen;

/* ================================================================
 * Styles
 * ================================================================ */

const CARD_INSET = Spacing.xl;
/** How far the card rises into the hero. */
const CARD_LIFT = 28;
const APP_ICON_SIZE = 86;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    // Matches the hero so an over-scroll bounce at the top shows
    // green, not a white flash.
    backgroundColor: HERO_TOP,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    // The hero paints its own top inset; nothing else needs padding
    // until the card, which carries its own margins.
    paddingTop: 0,
  },

  /* ── Hero ── */
  hero: {
    backgroundColor: HERO_BOTTOM,
    paddingHorizontal: CARD_INSET,
    // Room for the card to overlap without covering the subtitle.
    paddingBottom: CARD_LIFT + Spacing.xxl,
    borderBottomLeftRadius: Radius.xxxl,
    borderBottomRightRadius: Radius.xxxl,
    overflow: 'hidden',
  },
  arc: {
    position: 'absolute',
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: HERO_ARC,
    // A flat tint over the gradient's darker end; cheaper than a
    // real gradient and indistinguishable at this opacity.
    backgroundColor: HERO_TOP,
    opacity: 0.55,
  },
  arcSmall: {
    width: 300,
    height: 300,
    right: -110,
    top: -120,
  },
  arcLarge: {
    width: 420,
    height: 420,
    right: -180,
    top: -80,
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
    marginTop: Spacing.xxl,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '800',
    color: Colors.surface,
  },
  heroSubtitle: {
    ...Typography.body,
    marginTop: Spacing.md,
    lineHeight: 22,
    color: HERO_SUBTITLE,
  },
  pressed: {
    opacity: 0.85,
  },

  /* ── Download card ── */
  card: {
    marginTop: -CARD_LIFT,
    marginHorizontal: CARD_INSET,
    padding: Spacing.xl,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
    ...Shadows.lg,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  appIcon: {
    width: APP_ICON_SIZE,
    height: APP_ICON_SIZE,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  appIconBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
  },
  appIconBadgeText: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: Colors.surface,
  },
  cardCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  cardTitle: {
    ...Typography.subtitle,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  cardBody: {
    ...Typography.caption,
    lineHeight: 18,
    color: Colors.textSecondary,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryTint,
  },
  chipText: {
    ...Typography.caption,
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.primaryDark,
  },

  /* ── Store button ── */
  storeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    minHeight: 56,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
  storeBtnLive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  storeBtnOff: {
    backgroundColor: Colors.backgroundSecondary,
    borderColor: Colors.borderLight,
  },
  storeBtnText: {
    ...Typography.body,
    fontSize: 16,
    fontWeight: '700',
  },
  storeBtnTextLive: {
    color: Colors.surface,
  },
  storeBtnTextOff: {
    color: Colors.textSecondary,
  },
  launchNote: {
    ...Typography.caption,
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },

  /* ── Info strip ── */
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.xl,
    marginHorizontal: CARD_INSET,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryTint,
  },
  infoRule: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: Colors.primary,
  },
  infoText: {
    flex: 1,
    ...Typography.bodySmall,
    lineHeight: 20,
    color: Colors.textPrimary,
  },
});
