/**
 * ------------------------------------------------------------------
 * Urban Cruise — Onboarding
 * ------------------------------------------------------------------
 * Two-slide onboarding flow. On Skip or Get Started:
 *   1. Persist `hasSeenOnboarding=true` to MMKV (so future cold
 *      starts skip onboarding entirely).
 *   2. Dispatch completeOnboarding() to Redux (RootNavigator swaps
 *      this stack out for AuthFlow or the role-specific home stack).
 * NO auth checks, NO network calls — buttons are pure state writes,
 * as agreed in the architecture doc.
 * ------------------------------------------------------------------
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  interpolateColor,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import PagerView, {
  PageScrollStateChangedNativeEvent,
  PagerViewOnPageScrollEvent,
  PagerViewOnPageSelectedEvent,
} from 'react-native-pager-view';
import Svg, { Circle, Path } from 'react-native-svg';

import {
  Colors,
  Dimensions,
  Radius,
  Shadows,
  Spacing,
  Typography,
} from '../../theme';
import { useAppDispatch } from '../../store/hooks';
import { completeOnboarding } from '../../store/slices/appSlice';

/* -----------------------------------------------------------------
 * Types
 * ----------------------------------------------------------------- */

type IconTint = 'primary' | 'secondary' | 'accent' | 'info';
type FeatureIconProps = { color: string; size: number };
type Feature = {
  id: string;
  title: string;
  description: string;
  Icon: React.FC<FeatureIconProps>;
  tint: IconTint;
};

const TINT_COLORS: Record<IconTint, string> = {
  primary: Colors.primary,
  secondary: Colors.secondary,
  accent: Colors.accent,
  info: Colors.info,
};

export type OnboardingScreenProps = {
  autoAdvanceMs?: number | null;
};

/* -----------------------------------------------------------------
 * SVG Icons
 * ----------------------------------------------------------------- */

const ShieldIcon: React.FC<FeatureIconProps> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2.5 4.5 5.2v6c0 4.9 3.2 9.3 7.5 10.5 4.3-1.2 7.5-5.6 7.5-10.5v-6L12 2.5z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    <Path
      d="m8.8 12.1 2.3 2.3 4.1-4.4"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const BusIcon: React.FC<FeatureIconProps> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 16V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    <Path
      d="M4 16h16v2a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-.5H7v.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    <Path d="M4 11h16" stroke={color} strokeWidth={1.8} />
    <Circle cx={7.5} cy={16.5} r={1.3} stroke={color} strokeWidth={1.6} />
    <Circle cx={16.5} cy={16.5} r={1.3} stroke={color} strokeWidth={1.6} />
  </Svg>
);

const HeadsetIcon: React.FC<FeatureIconProps> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 14v-2a8 8 0 0 1 16 0v2"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <Path
      d="M4 14v2a2 2 0 0 0 2 2h1a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H6a2 2 0 0 0-2 2z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    <Path
      d="M20 14v2a2 2 0 0 1-2 2h-1a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h1a2 2 0 0 1 2 2z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    <Path
      d="M18 18v.5a2.5 2.5 0 0 1-2.5 2.5H14"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

// Simple tricolor flag — deliberately not a country silhouette. At icon
// size (~20-24px) a hand-approximated India outline reads as a smudge;
// flat geometric bands + chakra dot stay crisp at any size and are
// instantly recognizable as India. Colors are the flag's real tricolor
// (not tinted via the `color` prop) so it always reads correctly; the
// surrounding circular chip still picks up the feature's tint color.
const IndiaFlagIcon: React.FC<FeatureIconProps> = ({ size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 6h16v4H4z" fill="#FF9933" />
    <Path d="M4 10h16v4H4z" fill="#FFFFFF" />
    <Path d="M4 14h16v4H4z" fill="#138808" />
    <Circle
      cx={12}
      cy={12}
      r={1.6}
      fill="none"
      stroke="#000080"
      strokeWidth={0.6}
    />
    <Circle cx={12} cy={12} r={0.3} fill="#000080" />
  </Svg>
);

/* -----------------------------------------------------------------
 * Constants
 * ----------------------------------------------------------------- */

const SLIDE_COUNT = 2;
const AUTO_ADVANCE_DEFAULT_MS = 5000;

// Hero image height bounds. The hero uses flex: 1 between these, so it
// grows to fill leftover vertical space on tall phones (up to MAX) and
// shrinks on short phones (down to MIN) without pushing the feature
// grid off-screen. Tuned so grid + header always fit above the footer
// from ~640pt (iPhone SE) up to large Androids.
const HERO_MIN_HEIGHT = 200;
const HERO_MAX_HEIGHT = 320;

const FEATURES: Feature[] = [
  {
    id: 'pan-india',
    title: 'Pan India Service',
    description: 'Available in 21+ Cities across India',
    Icon: IndiaFlagIcon,
    tint: 'primary',
  },
  {
    id: 'vehicles',
    title: 'Wide Range of Vehicles',
    description: 'Vehicles available from 5-Seater to 55-Seater',
    Icon: BusIcon,
    tint: 'secondary',
  },
  {
    id: 'support',
    title: '24/7 Support',
    description: "We're here to assist you anytime, anywhere",
    Icon: HeadsetIcon,
    tint: 'accent',
  },
  {
    id: 'trusted',
    title: 'Trusted & Reliable',
    description: 'Trusted by 500+ Companies',
    Icon: ShieldIcon,
    tint: 'info',
  },
];

const withAlpha = (hex: string, alpha: number): string => {
  const suffix = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${suffix}`;
};

/* -----------------------------------------------------------------
 * Feature Card
 * ----------------------------------------------------------------- */

const FeatureCard: React.FC<{ feature: Feature; index: number }> = memo(
  ({ feature, index }) => {
    const { Icon, title, description, tint } = feature;
    const iconColor = TINT_COLORS[tint];
    const iconBg = withAlpha(iconColor, 0.14);

    return (
      <Animated.View
        entering={FadeInUp.delay(400 + index * 90).duration(500)}
        style={styles.card}
      >
        <View style={[styles.cardIconWrap, { backgroundColor: iconBg }]}>
          <Icon color={iconColor} size={Dimensions.iconMd} />
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.cardDescription} numberOfLines={2}>
          {description}
        </Text>
      </Animated.View>
    );
  },
);
FeatureCard.displayName = 'FeatureCard';

/* -----------------------------------------------------------------
 * Pagination
 * ----------------------------------------------------------------- */

const DOT_ACTIVE_WIDTH = 24;
const DOT_INACTIVE_WIDTH = 8;
const DOT_HEIGHT = 8;

const PaginationDot: React.FC<{
  index: number;
  progress: SharedValue<number>;
}> = ({ index, progress }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(progress.value - index);
    return {
      width: interpolate(
        distance,
        [0, 1],
        [DOT_ACTIVE_WIDTH, DOT_INACTIVE_WIDTH],
        Extrapolation.CLAMP,
      ),
      backgroundColor: interpolateColor(
        distance,
        [0, 1],
        [Colors.primary, Colors.border],
      ),
    };
  });

  return (
    <Animated.View
      style={[styles.dot, animatedStyle]}
      accessibilityRole="tab"
    />
  );
};

const Pagination: React.FC<{
  count: number;
  progress: SharedValue<number>;
}> = ({ count, progress }) => (
  <View
    style={styles.pagination}
    accessibilityRole="tablist"
    accessibilityLabel={`Slide indicator, ${count} slides`}
  >
    {Array.from({ length: count }).map((_, i) => (
      <PaginationDot key={i} index={i} progress={progress} />
    ))}
  </View>
);

/* -----------------------------------------------------------------
 * Slides
 * ----------------------------------------------------------------- */

const SlideOne: React.FC = memo(() => (
  <View style={styles.slide} collapsable={false}>
    <View style={styles.slideOneContent}>
      <Animated.View entering={FadeIn.duration(700)} style={styles.brandBlock}>
        <Image
          source={require('../../assets/images/ucwithdesignandtext.png')}
          style={styles.brandLogo}
          resizeMode="contain"
          accessibilityLabel="Urban Cruise — Car & Bus Rentals"
        />
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(250).duration(600)}
        style={styles.taglineBlock}
      >
        <Text style={styles.taglineLine} accessibilityRole="header">
          <Text style={styles.taglineAccent}>India's </Text>
          <Text style={styles.taglineDark}>Most </Text>
          <Text style={styles.taglinePrimary}>Preferred</Text>
        </Text>
        <Text style={styles.taglineLine}>
          <Text style={styles.taglinePrimary}>Vehicle </Text>
          <Text style={styles.taglineDark}>Rental </Text>
          <Text style={styles.taglineAccent}>Service</Text>
        </Text>
      </Animated.View>

      {/* Availability line under the tagline on slide 1 only. Was previously
    in the shared footer above the pagination dots; moved here so it
    reads as part of the brand pitch instead of floating near the CTA. */}
      <Animated.View
        entering={FadeInUp.delay(450).duration(500)}
        style={styles.availabilityChip}
      >
        <Text style={styles.availabilityText}>
          Serving <Text style={styles.availabilityHighlight}>21+ Cities</Text>
          <Text style={styles.availabilitySecondary}> across India</Text>
        </Text>
      </Animated.View>
    </View>
  </View>
));
SlideOne.displayName = 'SlideOne';

// Slide 2 is a responsive one-screen layout (no ScrollView).
//
// Layout strategy — how it stays on one screen across every phone size:
//   1. slideTwoContent is a flex column filling the pager page.
//   2. Header (हर सफर है खास + description) takes its natural height.
//   3. heroWrap has `flex: 1` with min/max height caps, so it absorbs
//      whatever vertical space is left after header + grid.
//        - Tall phones: hero grows to HERO_MAX_HEIGHT (320).
//        - Short phones: hero shrinks to HERO_MIN_HEIGHT (200), keeping
//          the grid fully on-screen instead of clipping.
//   4. Hero uses `resizeMode="cover"` so it fills the box edge-to-edge
//      for a full-bleed look; edges may crop slightly when the box is
//      narrower or shorter than the image's aspect ratio.
//   5. Grid takes its natural height and sits directly above the footer.
const SlideTwo: React.FC = memo(() => (
  <View style={styles.slide} collapsable={false}>
    <View style={styles.slideTwoContent}>
      <Animated.View entering={FadeInDown.duration(600)}>
        <Text style={styles.headline} accessibilityRole="header">
          <Text style={styles.headlinePrimary}>हर सफर है </Text>
          <Text style={styles.headlineAccent}>खास</Text>
        </Text>
        <Text style={styles.description}>
          Experience safe, reliable and comfortable vehicle rental services
          across India.
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeIn.delay(200).duration(700)}
        style={styles.heroWrap}
      >
        <Image
          source={require('../../assets/images/urban-cruise-use.png')}
          style={styles.hero}
          resizeMode="cover"
          accessibilityLabel="Urban Cruise bus on a city highway"
        />
      </Animated.View>

      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <FeatureCard feature={FEATURES[0]} index={0} />
          <FeatureCard feature={FEATURES[1]} index={1} />
        </View>
        <View style={styles.gridRow}>
          <FeatureCard feature={FEATURES[2]} index={2} />
          <FeatureCard feature={FEATURES[3]} index={3} />
        </View>
      </View>
    </View>
  </View>
));
SlideTwo.displayName = 'SlideTwo';

/* -----------------------------------------------------------------
 * Screen
 * ----------------------------------------------------------------- */

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  autoAdvanceMs = AUTO_ADVANCE_DEFAULT_MS,
}) => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const pagerRef = useRef<PagerView>(null);
  const progress = useSharedValue(0);
  const [page, setPage] = useState(0);

  const isLastPage = page === SLIDE_COUNT - 1;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userInteractedRef = useRef(false);
  const pageRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleAdvance = useCallback(() => {
    clearTimer();
    if (!autoAdvanceMs || autoAdvanceMs <= 0) return;
    if (userInteractedRef.current) return;
    if (pageRef.current >= SLIDE_COUNT - 1) return;

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (userInteractedRef.current) return;
      if (pageRef.current >= SLIDE_COUNT - 1) return;
      pagerRef.current?.setPage(pageRef.current + 1);
    }, autoAdvanceMs);
  }, [autoAdvanceMs, clearTimer]);

  const onPageScroll = useCallback(
    (e: PagerViewOnPageScrollEvent) => {
      const { position, offset } = e.nativeEvent;
      progress.value = position + offset;
    },
    [progress],
  );

  const onPageSelected = useCallback((e: PagerViewOnPageSelectedEvent) => {
    setPage(e.nativeEvent.position);
  }, []);

  const onPageScrollStateChanged = useCallback(
    (e: PageScrollStateChangedNativeEvent) => {
      if (e.nativeEvent.pageScrollState === 'dragging') {
        userInteractedRef.current = true;
        clearTimer();
      }
    },
    [clearTimer],
  );

  useEffect(() => {
    pageRef.current = page;
    scheduleAdvance();
    return clearTimer;
  }, [page, scheduleAdvance, clearTimer]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') scheduleAdvance();
      else clearTimer();
    });
    return () => sub.remove();
  }, [scheduleAdvance, clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  const handleFinishOnboarding = useCallback(() => {
    userInteractedRef.current = true;
    clearTimer();
    // Session-only flip. `hasSeenOnboardingThisSession` resets on next
    // cold start — onboarding shows again per Behavior 2 requirement.
    // RootNavigator swaps this stack out to AuthFlow or role home stack.
    dispatch(completeOnboarding());
  }, [clearTimer, dispatch]);

  const topPad = Math.max(insets.top, Spacing.md);
  const bottomPad = Math.max(insets.bottom, Spacing.md);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.topBar}>
        {!isLastPage ? (
          <Pressable
            onPress={handleFinishOnboarding}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
      </View>

      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageScroll={onPageScroll}
        onPageSelected={onPageSelected}
        onPageScrollStateChanged={onPageScrollStateChanged}
        overdrag
      >
        <View key="slide-1" collapsable={false} style={styles.page}>
          <SlideOne />
        </View>
        <View key="slide-2" collapsable={false} style={styles.page}>
          <SlideTwo />
        </View>
      </PagerView>

      {/* Footer no longer has the "Available in 21+ Cities" row — that
          chip moved into SlideOne, right under the tagline. Footer now
          only carries pagination dots (both slides) and the Get Started
          CTA (last slide only). */}
      <View style={[styles.footer, { paddingBottom: bottomPad }]}>
        <Pagination count={SLIDE_COUNT} progress={progress} />

        {isLastPage ? (
          <Animated.View entering={FadeInUp.duration(400)}>
            <Pressable
              onPress={handleFinishOnboarding}
              accessibilityRole="button"
              accessibilityLabel="Get started"
              style={({ pressed }) => [
                styles.cta,
                pressed && styles.ctaPressed,
              ]}
            >
              <Text style={styles.ctaText}>Get Started</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <View style={styles.ctaSpacer} />
        )}
      </View>
    </View>
  );
};

export default OnboardingScreen;

/* -----------------------------------------------------------------
 * Styles
 * ----------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  topBar: {
    height: Dimensions.headerHeight - Spacing.sm,
    paddingHorizontal: Dimensions.screenHorizontalPadding,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  skip: {
    minHeight: Dimensions.touchTargetMinimum,
    minWidth: Dimensions.touchTargetMinimum,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipPlaceholder: { height: Dimensions.touchTargetMinimum },
  skipText: { ...Typography.label, color: Colors.primary, fontSize: 15 },
  pressed: { opacity: 0.55 },

  pager: { flex: 1 },
  page: { flex: 1 },
  slide: { flex: 1, paddingHorizontal: Dimensions.screenHorizontalPadding },

  slideOneContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Spacing.lg,
  },
  brandBlock: { width: '100%', alignItems: 'center' },
  brandLogo: { width: '100%', height: 320 },
  taglineBlock: { marginTop: Spacing.md, alignItems: 'center' },
  taglineLine: { ...Typography.h4, textAlign: 'center' },
  taglinePrimary: { color: Colors.primary, fontWeight: '700' },
  taglineAccent: { color: Colors.accent, fontWeight: '700' },
  taglineDark: { color: Colors.textPrimary, fontWeight: '600' },

  // Availability line under the tagline. "21+ Cities" highlighted in
  // brand primary, "Across India" in brand secondary. Sits with generous
  // breathing room below the tagline as a supporting badge.
  availabilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.huge,
  },
  availabilityText: {
    ...Typography.body,
    fontSize: 18,
    lineHeight: 22,
    color: Colors.textPrimary,
    fontWeight: '600',
    flexShrink: 0,
  },
  availabilityHighlight: {
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 18,
  },
  availabilitySecondary: {
    color: Colors.secondary,
    fontWeight: '700',
    fontSize: 18,
  },

  // Flex column: header block (natural) + heroWrap (flex 1, capped) +
  // grid (natural). Small top padding pulls the header up close to the
  // top bar. Small bottom padding leaves breathing room above the footer.
  slideTwoContent: {
    flex: 1,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  headline: { ...Typography.h3, textAlign: 'center' },
  headlinePrimary: { color: Colors.primary, fontWeight: '700' },
  headlineAccent: { color: Colors.secondary, fontWeight: '700' },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  // THE responsive piece. flex: 1 makes the hero absorb leftover vertical
  // space between the header and grid; minHeight/maxHeight cap it so it
  // never gets too tiny to read or too tall to push the grid off-screen.
  heroWrap: {
    flex: 1,
    minHeight: HERO_MIN_HEIGHT,
    maxHeight: HERO_MAX_HEIGHT,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  // width/height: '100%' so the image fills heroWrap at whatever height
  // the flex layout resolves to. resizeMode="cover" (set on the Image
  // element itself) fills the box edge-to-edge; on short phones the
  // image may crop slightly rather than letterbox.
  hero: { width: '100%', height: '100%' },

  grid: { marginTop: Spacing.sm, gap: Spacing.sm },
  gridRow: { flexDirection: 'row', gap: Spacing.md },
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    ...Shadows.xs,
  },
  cardIconWrap: {
    width: Dimensions.avatarMd,
    height: Dimensions.avatarMd,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
    overflow: 'hidden',
  },
  cardTitle: {
    ...Typography.label,
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 19,
    textAlign: 'center',
  },
  cardDescription: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xxs,
    fontSize: 13,
    lineHeight: 17,
  },

  footer: {
    paddingHorizontal: Dimensions.screenHorizontalPadding,
    paddingTop: Spacing.md,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  dot: { height: DOT_HEIGHT, borderRadius: Radius.pill },

  cta: {
    height: Dimensions.buttonHeightLarge,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  ctaPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  ctaText: {
    ...Typography.button,
    color: Colors.buttonPrimaryText,
    fontSize: 20,
  },
  ctaSpacer: { height: Dimensions.buttonHeightLarge },
});
