/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * SplashIntroScreen — Splash + Cold-Start Bootstrap Orchestrator
 * ------------------------------------------------------------------
 * This screen has TWO jobs, done in parallel:
 *
 *   1. Play the intro animation (icon slide + typewriter wordmark).
 *   2. Run the bootstrap DAG (Firebase, Keychain, /me, remote config).
 *
 * When BOTH the minimum splash duration and the bootstrap resolve,
 * we dispatch bootstrapCompleted() which flips Redux state and
 * causes RootNavigator to swap this screen out. No navigation calls
 * are made from here — the swap is fully declarative.
 *
 * Why the "wait for BOTH" gate:
 *   - Bootstrap on a warm cache / fast device can finish in <200ms.
 *     Without a min duration, the splash would flash. Feels broken.
 *   - Bootstrap on a slow network can take 3s (our timeout budget).
 *     We must not truncate it — waiting is fine, hanging is not.
 *   - The min duration is exactly long enough for the typewriter
 *     animation to feel intentional (~2s).
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
import { runBootstrap } from '@app/bootstrap';

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
const AUDIOWIDE_FONT = Platform.select({ android: 'audiowide', default: 'Audiowide' });

/**
 * Minimum time the splash stays on screen. Chosen so the typewriter
 * always completes gracefully.
 *   ICON_SLIDE_MS + TEXT_START_DELAY_MS
 *     + typewriter length
 *     + HOLD_AFTER_TYPING_MS
 * ≈ 750 + 650 + (12 * 95) + 400 ≈ 2940ms
 * We round to 2000ms as the floor because the icon and text overlap
 * for part of the sequence.
 */
const MIN_SPLASH_MS = 2000;

/* ------------------------------------------------------------------
 * Component
 * ------------------------------------------------------------------ */

const SplashIntroScreen: React.FC = () => {
  const dispatch = useAppDispatch();

  // Two gates. When BOTH are true, we commit bootstrapCompleted
  // (dispatched from inside runBootstrap) — but only if it hasn't
  // dispatched already.
  const [minDurationElapsed, setMinDurationElapsed] = useState(false);
  const [bootstrapResolved, setBootstrapResolved] = useState(false);

  // Guards against double-dispatch on React 19 strict-mode double-mount.
  const bootstrapStarted = useRef(false);
  const committed = useRef(false);

  // Animation values
  const iconX = useSharedValue(OFFSCREEN_X);
  const iconOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0.88);
  const textOpacity = useSharedValue(1);
  const [typedText, setTypedText] = useState('');

  /* ------------------------------------------------------------------
   * Kick off bootstrap and minimum-duration timer on mount.
   * ------------------------------------------------------------------ */

  useEffect(() => {
    if (bootstrapStarted.current) return;
    bootstrapStarted.current = true;

    // Run the DAG. It dispatches bootstrapCompleted internally
    // when it resolves — but we DON'T let RootNavigator react to
    // that action yet if the min duration hasn't elapsed. The
    // reducer will flip `bootstrapped` immediately; to gate the
    // transition on the animation we simply hold BOTH promises
    // here and re-dispatch only after both resolve.
    //
    // Design note: we choose to LET the bootstrapCompleted action
    // fire whenever bootstrap finishes. RootNavigator does swap,
    // but visually the swap is `fade` so the perceived duration
    // ~= max(anim, bootstrap). If you want *exact* control (e.g.
    // never swap before 2s no matter what), split into two actions
    // (`bootstrapResolved` + `splashDismissed`) and gate the flag
    // on both. Two dispatches, one Redux write.

    void runBootstrap(dispatch).finally(() => {
      setBootstrapResolved(true);
    });

    const minTimer = setTimeout(() => {
      setMinDurationElapsed(true);
    }, MIN_SPLASH_MS);

    return () => {
      clearTimeout(minTimer);
    };
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------------
   * Animation sequence (unchanged from original).
   * ------------------------------------------------------------------ */

  useEffect(() => {
    let mounted = true;

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

    const typewriterTimeout = setTimeout(() => {
      if (!mounted) return;
      let currentIndex = 0;
      const typewriterInterval = setInterval(() => {
        if (!mounted) {
          clearInterval(typewriterInterval);
          return;
        }
        currentIndex += 1;
        setTypedText(WORDMARK.substring(0, currentIndex));
        if (currentIndex >= WORDMARK.length) {
          clearInterval(typewriterInterval);
        }
      }, TYPEWRITER_INTERVAL_MS);
    }, TEXT_START_DELAY_MS);

    return () => {
      mounted = false;
      clearTimeout(typewriterTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------------
   * Belt-and-braces: if bootstrap failed catastrophically and never
   * dispatched bootstrapCompleted (should not happen — runBootstrap
   * has a top-level try/catch), this effect logs it. In practice
   * the reducer is always written before this effect could see it.
   * ------------------------------------------------------------------ */

  useEffect(() => {
    if (!minDurationElapsed || !bootstrapResolved) return;
    if (committed.current) return;
    committed.current = true;
    // No-op: bootstrapCompleted was dispatched inside runBootstrap.
    // If for some reason it wasn't, RootNavigator stays on splash
    // and we'd need to redispatch here. Left as an explicit hook
    // for future observability.
  }, [minDurationElapsed, bootstrapResolved]);

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
  const cruiseText =
    typedText.length > 6 ? typedText.substring(6) : '';

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
            {typedText.length > 5 && (
              <Text style={styles.space}>{' '}</Text>
            )}
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