/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * SplashIntroScreen — Splash + Cold-Start Bootstrap Orchestrator
 * ------------------------------------------------------------------
 * This screen has TWO jobs, done in parallel:
 *
 *   1. Play the intro animation (icon slide + typewriter wordmark).
 *   2. Resolve the bootstrap DAG (Firebase, Keychain, /me, config)
 *      via resolveBootstrap() — which does NOT touch Redux.
 *
 * Only when BOTH are done do we call commitBootstrap(), which
 * dispatches bootstrapCompleted → `bootstrapped = true` → RootNavigator
 * swaps this screen out. No navigation calls are made from here — the
 * swap is fully declarative.
 *
 * WHY THE "WAIT FOR BOTH" GATE (bug this fixes):
 *   Previously bootstrap dispatched bootstrapCompleted itself, the
 *   moment it finished. Bootstrap time varies with network / token
 *   state (≈100ms … 3s+), so the splash was unmounted at a random
 *   point of the animation:
 *     - bootstrap < ~650ms    → only the UC logo was seen
 *     - ~650ms … ~1.8s        → logo + partial text ("Urban")
 *     - > ~1.8s               → full "Urban Cruise"
 *   Now the hand-off is gated on the typewriter ACTUALLY completing
 *   (plus a short hold), so the full wordmark is always shown, while
 *   a slow network still extends the splash instead of being cut off.
 *
 * Gate is driven by the animation's real completion, not a fixed
 * timer, so changing the wordmark or timings can never reintroduce
 * the truncation. A hard ceiling (MAX_ANIMATION_WAIT_MS) guarantees
 * the animation gate can never block the app forever.
 *
 * StrictMode / Fast Refresh safe: bootstrap is started once per
 * component instance (ref-guarded) and every effect fully cleans up
 * and can re-run; the commit is guarded so it happens exactly once.
 *
 * The native launch screen (iOS storyboard / Android drawable) MUST
 * use the same background color + logo position as this screen so
 * the handoff is invisible. That's the "no bootsplash library"
 * production pattern.
 * ------------------------------------------------------------------
 */

import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View, Platform } from 'react-native';

import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '../../theme';
import { useAppDispatch } from '../../store/hooks';
import {
  resolveBootstrap,
  commitBootstrap,
  type BootstrapResult,
} from '@app/bootstrap';
import { markAppReady } from '@/native/splashReady';

/* ------------------------------------------------------------------
 * Assets
 * ------------------------------------------------------------------ */

const UC_ICON = require('../../assets/icons/uc-icon.png');

/* ------------------------------------------------------------------
 * Animation configuration
 * ------------------------------------------------------------------ */

const ICON_SLIDE_MS = 750;
const TEXT_START_DELAY_MS = 650;
const TYPEWRITER_INTERVAL_MS = 95;
const OFFSCREEN_X = 420;
const WORDMARK = 'Urban Cruise';
const AUDIOWIDE_FONT = Platform.select({
  android: 'audiowide',
  default: 'Audiowide',
});

/**
 * How long the completed wordmark stays fully visible before the
 * hand-off, so the user can actually read it rather than seeing the
 * last letter appear and the screen vanish in the same instant.
 */
const HOLD_AFTER_TYPING_MS = 400;

/**
 * Hard ceiling for the ANIMATION gate only (measured from mount).
 * Normal sequence ≈ TEXT_START_DELAY_MS + WORDMARK.length *
 * TYPEWRITER_INTERVAL_MS + HOLD_AFTER_TYPING_MS ≈ 650 + 1140 + 400
 * ≈ 2.2s. If the animation gate somehow never opens (e.g. a future
 * regression in the animation code), we stop waiting for it here.
 * Bootstrap still has to resolve — it has its own timeouts and never
 * rejects, so the app can never hang on this screen.
 */
const MAX_ANIMATION_WAIT_MS = 5000;

/* ------------------------------------------------------------------
 * Component
 * ------------------------------------------------------------------ */

const SplashIntroScreen: React.FC = () => {
  const dispatch = useAppDispatch();

  // Gate 1: intro animation finished (full wordmark + hold).
  const [animationDone, setAnimationDone] = useState(false);
  // Gate 2: bootstrap resolved (holds the result to commit).
  const [bootstrapResult, setBootstrapResult] =
    useState<BootstrapResult | null>(null);

  // One bootstrap run per component instance. Kept in a ref so a
  // StrictMode / Fast Refresh effect re-run re-subscribes to the SAME
  // in-flight promise instead of starting a second run.
  const bootstrapPromise = useRef<Promise<BootstrapResult> | null>(null);
  // Guarantees commitBootstrap() is dispatched exactly once.
  const committed = useRef(false);

  // Animation values
  const iconX = useSharedValue(OFFSCREEN_X);
  const iconOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0.88);
  const textOpacity = useSharedValue(1);
  const [typedText, setTypedText] = useState('');

  /* ------------------------------------------------------------------
   * Gate 2 — resolve bootstrap (no Redux writes) on mount.
   * ------------------------------------------------------------------ */

  useEffect(() => {
    if (bootstrapPromise.current === null) {
      bootstrapPromise.current = resolveBootstrap();
    }

    let active = true;
    void bootstrapPromise.current.then(result => {
      if (active) setBootstrapResult(result);
    });

    // Tell native it's safe to dismiss the system splash — this
    // screen has now mounted and rendered a frame that visually
    // matches the native launch theme (same background + icon),
    // so the handoff is invisible. Idempotent. See MainActivity.kt.
    markAppReady();

    return () => {
      active = false;
    };
  }, []);

  /* ------------------------------------------------------------------
   * Gate 1 — intro animation. Opens `animationDone` only after the
   * full wordmark has been typed and held on screen.
   * ------------------------------------------------------------------ */

  useEffect(() => {
    iconX.value = withTiming(0, {
      duration: ICON_SLIDE_MS,
      easing: Easing.out(Easing.cubic),
    });
    iconOpacity.value = withTiming(1, {
      duration: ICON_SLIDE_MS,
      easing: Easing.out(Easing.cubic),
    });
    iconScale.value = withTiming(1, {
      duration: ICON_SLIDE_MS,
      easing: Easing.out(Easing.back(1.15)),
    });

    let typewriterInterval: ReturnType<typeof setInterval> | undefined;
    let holdTimeout: ReturnType<typeof setTimeout> | undefined;

    const typewriterTimeout = setTimeout(() => {
      let currentIndex = 0;
      typewriterInterval = setInterval(() => {
        currentIndex += 1;
        setTypedText(WORDMARK.substring(0, currentIndex));

        if (currentIndex >= WORDMARK.length) {
          clearInterval(typewriterInterval);
          typewriterInterval = undefined;
          holdTimeout = setTimeout(() => {
            setAnimationDone(true);
          }, HOLD_AFTER_TYPING_MS);
        }
      }, TYPEWRITER_INTERVAL_MS);
    }, TEXT_START_DELAY_MS);

    // Safety ceiling — never let the animation gate block forever.
    const ceilingTimeout = setTimeout(() => {
      setTypedText(WORDMARK);
      setAnimationDone(true);
    }, MAX_ANIMATION_WAIT_MS);

    return () => {
      clearTimeout(typewriterTimeout);
      clearTimeout(ceilingTimeout);
      if (typewriterInterval !== undefined) clearInterval(typewriterInterval);
      if (holdTimeout !== undefined) clearTimeout(holdTimeout);
    };
    // Shared values are stable refs; run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------------
   * Commit — only when BOTH gates are open. Dispatching
   * bootstrapCompleted flips `bootstrapped`, and RootNavigator swaps
   * this screen out with its fade transition.
   * ------------------------------------------------------------------ */

  useEffect(() => {
    if (!animationDone || bootstrapResult === null) return;
    if (committed.current) return;
    committed.current = true;
    commitBootstrap(dispatch, bootstrapResult);
  }, [animationDone, bootstrapResult, dispatch]);

  /* ------------------------------------------------------------------
   * Animated styles
   * ------------------------------------------------------------------ */

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: iconX.value }, { scale: iconScale.value }],
    opacity: iconOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const urbanText = typedText.substring(0, Math.min(5, typedText.length));
  const cruiseText = typedText.length > 6 ? typedText.substring(6) : '';

  return (
    <View style={styles.flex}>
      <View style={styles.center}>
        <Animated.View style={iconStyle}>
          <Image
            source={UC_ICON}
            style={styles.icon}
            resizeMode="contain"
            accessible
            accessibilityRole="image"
            accessibilityLabel="Urban Cruise"
          />
        </Animated.View>

        <Animated.View style={[styles.wordmarkContainer, textStyle]}>
          <Text style={styles.wordmark}>
            <Text style={styles.wordmarkUrban}>{urbanText}</Text>
            {typedText.length > 5 && <Text style={styles.space}> </Text>}
            <Text style={styles.wordmarkCruise}>{cruiseText}</Text>
          </Text>
        </Animated.View>
      </View>
    </View>
  );
};

export default SplashIntroScreen;

/* ------------------------------------------------------------------
 * Styles
 * ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 320,
    height: 320,
    marginBottom: -55,
  },
  wordmarkContainer: {
    minHeight: 48,
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: AUDIOWIDE_FONT,
    fontSize: 38,
    lineHeight: 36,
    letterSpacing: 0.2,
  },
  wordmarkUrban: {
    color: Colors.primary,
    fontFamily: AUDIOWIDE_FONT,
  },
  wordmarkCruise: {
    color: Colors.secondary,
    fontFamily: AUDIOWIDE_FONT,
  },
  space: {
    color: Colors.textPrimary,
    fontFamily: AUDIOWIDE_FONT,
  },
});
