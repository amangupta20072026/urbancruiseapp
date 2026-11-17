/**
 * ------------------------------------------------------------------
 * HighlightsStory — the three brand images, as one reusable piece
 * ------------------------------------------------------------------
 * Three full-screen brand images (vehicles → pan-India → why choose
 * us), 5 seconds each, then `onFinish()`. Used in two places:
 *
 *   - HighlightsStoryHost (in-app taps): drawn on top of the quotation
 *     list, see-through until the first image has flipped down, so the
 *     first image lands right over the list.
 *   - QuotationHighlightsScreen (deep links / Pay Now): drawn on a
 *     white screen.
 *
 * It knows nothing about navigation: the caller decides what
 * `onFinish` does and when the story is `active`.
 *
 *   [ ███████ ▓▓▓░░░░ ░░░░░░░ ]   ← progress bars (no Skip button)
 *   ┌────────┬──────────────────┐
 *   │        │                  │
 *   │  tap = │   tap = next     │   whole image always visible
 *   │  back  │   (last image →  │   (resizeMode 'contain')
 *   │ (1/3)  │   onFinish) (2/3)│
 *   │        │                  │   hold 0.2 s anywhere = pause,
 *   └────────┴──────────────────┘   release = continue same point
 *
 * ANIMATIONS (product decisions):
 *   - EVERY image, the first one included, arrives with a "page flip
 *     down": it swings down from its top edge, like turning a notepad
 *     page (HIGHLIGHT_FLIP_DURATION_MS). The first image flips over
 *     whatever is behind the story (the quotation list, or the white
 *     screen); the others flip over the previous image.
 *   - Each image's 5 seconds start only after its flip has finished.
 *   - Previous image (left-side tap): instant, no animation.
 *   - Reduce Motion on: no flips, images change instantly.
 *
 * TIMING — one source of truth:
 *   The progress-bar animation (Reanimated, UI thread) IS the timer.
 *   When it completes, it schedules the advance on the JS thread, so
 *   the bar and the image change can never drift apart.
 *
 * PAUSE / RESUME:
 *   The timer runs only while the app is in the foreground AND the
 *   story is `active` AND no flip is running AND the current image is
 *   ready AND the customer is not holding the screen. Every pause keeps
 *   the image's remaining time, so it continues from the same point.
 *
 * TOUCH (product decisions):
 *   - Hold for HIGHLIGHT_HOLD_TO_PAUSE_MS (0.2 s) anywhere → pause;
 *     lift the finger → continue from the same point.
 *   - Quick tap on the left HIGHLIGHT_BACK_ZONE_RATIO (1/3) → previous
 *     image (starts again from 0); nothing on the first image.
 *   - Quick tap on the right 2/3 → next image; on the last image it
 *     calls onFinish.
 *   - Screen readers: swipe up / down (adjustable) = next / previous.
 *
 * NEVER STUCK:
 *   No Skip button and Android back is consumed while active, so:
 *     - each image's timer starts on onLoad, or after
 *       HIGHLIGHT_LOAD_TIMEOUT_MS if onLoad never arrives;
 *     - an image that fails to load is skipped;
 *     - after the last image it always calls onFinish.
 * ------------------------------------------------------------------
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  BackHandler,
  Image,
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type AppStateStatus,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Colors, Radius, Spacing } from '@theme';

import {
  HIGHLIGHT_BACK_ZONE_RATIO,
  HIGHLIGHT_BAR_HEIGHT,
  HIGHLIGHT_FLIP_DURATION_MS,
  HIGHLIGHT_HOLD_TO_PAUSE_MS,
  HIGHLIGHT_LOAD_TIMEOUT_MS,
  HIGHLIGHT_SLIDE_DURATION_MS,
  HIGHLIGHT_SLIDES,
} from './config';

const SLIDE_COUNT = HIGHLIGHT_SLIDES.length;

/** Slow start, smooth settle — the page "falls" into place. */
const FLIP_EASING = Easing.bezier(0.45, 0.05, 0.2, 1);

/**
 * Pause only on an explicit background / inactive state. At cold
 * start (e.g. from a notification tap) AppState can still report
 * 'unknown' (documented in AppState.d.ts); treating that as "not
 * active" would stop the timer from ever starting.
 */
function isForeground(state: AppStateStatus): boolean {
  return state !== 'background' && state !== 'inactive';
}

export type HighlightsStoryProps = {
  /**
   * False pauses everything (timer, flips waiting to start) and stops
   * consuming Android back — e.g. the screen lost focus.
   */
  active: boolean;
  /** After the last image (or a tap on it). Called at most once. */
  onFinish: () => void;
  /**
   * Called once, when the first image is fully on screen (its flip
   * has finished). The overlay host uses it to turn its see-through
   * background opaque.
   */
  onFirstImageShown?: () => void;
};

export const HighlightsStory: React.FC<HighlightsStoryProps> = ({
  active,
  onFinish,
  onFirstImageShown,
}) => {
  const reduceMotion = useReducedMotion();

  const [index, setIndex] = useState(0);
  const [readySlides, setReadySlides] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [failedSlides, setFailedSlides] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [appActive, setAppActive] = useState(() =>
    isForeground(AppState.currentState),
  );
  // True while the customer holds a finger on the image (long press).
  const [held, setHeld] = useState(false);
  // True while the current image is flipping down (or waiting to start
  // its flip). The first image starts this way.
  const [flipping, setFlipping] = useState(() => !reduceMotion);
  // The image under the flipping one; null = nothing (first image).
  const [under, setUnder] = useState<number | null>(null);

  const progress = useSharedValue(0);
  // 0 → 1 while the current image flips down; 1 when it is at rest.
  const flip = useSharedValue(reduceMotion ? 1 : 0);

  const indexRef = useRef(0);
  const remainingMsRef = useRef(HIGHLIGHT_SLIDE_DURATION_MS);
  const finishedRef = useRef(false);
  const mountedRef = useRef(true);
  const stageWidthRef = useRef(0);
  const failedRef = useRef<ReadonlySet<number>>(new Set());
  const firstFlipStartedRef = useRef(false);
  const firstShownRef = useRef(false);

  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const onFirstShownRef = useRef(onFirstImageShown);
  onFirstShownRef.current = onFirstImageShown;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ---------------- Finish ---------------- */

  const finish = useCallback(() => {
    if (finishedRef.current || !mountedRef.current) return;
    finishedRef.current = true;
    cancelAnimation(progress);
    onFinishRef.current();
  }, [progress]);

  /* ---------------- Flip ---------------- */

  const endFlip = useCallback(() => {
    if (!mountedRef.current) return;
    setFlipping(false);
    setUnder(null);
  }, []);

  const runFlip = useCallback(() => {
    flip.value = 0;
    flip.value = withTiming(
      1,
      { duration: HIGHLIGHT_FLIP_DURATION_MS, easing: FLIP_EASING },
      done => {
        'worklet';
        if (done) scheduleOnRN(endFlip);
      },
    );
  }, [flip, endFlip]);

  // The first image is "shown" once nothing is flipping any more.
  useEffect(() => {
    if (!flipping && !firstShownRef.current) {
      firstShownRef.current = true;
      onFirstShownRef.current?.();
    }
  }, [flipping]);

  /* ---------------- Advance ---------------- */

  const advance = useCallback(() => {
    if (finishedRef.current || !mountedRef.current) return;
    const from = indexRef.current;
    const next = from + 1;
    if (next >= SLIDE_COUNT) {
      finish();
      return;
    }
    indexRef.current = next;
    remainingMsRef.current = HIGHLIGHT_SLIDE_DURATION_MS;
    progress.value = 0;

    // A tap during a flip ends that flip at once; the new flip starts
    // from the image now fully shown.
    cancelAnimation(flip);
    firstFlipStartedRef.current = true;
    if (reduceMotion || failedRef.current.has(next)) {
      flip.value = 1;
      setFlipping(false);
      setUnder(null);
    } else {
      setFlipping(true);
      setUnder(from);
      runFlip();
    }
    setIndex(next);
  }, [finish, progress, flip, reduceMotion, runFlip]);

  /* ---------------- Go back (left-side tap) ---------------- */

  const goBack = useCallback(() => {
    if (finishedRef.current || !mountedRef.current) return;
    // Nearest earlier image that loaded. Failed images are skipped, or
    // the "skip failed image" rule would bounce the customer forward.
    let prev = indexRef.current - 1;
    while (prev >= 0 && failedRef.current.has(prev)) prev -= 1;
    if (prev < 0) return; // First image: do nothing (product decision).
    indexRef.current = prev;
    remainingMsRef.current = HIGHLIGHT_SLIDE_DURATION_MS;
    progress.value = 0;
    // Going back is instant (product decision): stop any flip.
    cancelAnimation(flip);
    flip.value = 1;
    setFlipping(false);
    setUnder(null);
    setIndex(prev);
  }, [progress, flip]);

  /* ---------------- Readiness of the current image ---------------- */

  const markReady = useCallback((i: number) => {
    setReadySlides(prev => {
      if (prev.has(i)) return prev;
      const nextSet = new Set(prev);
      nextSet.add(i);
      return nextSet;
    });
  }, []);

  const markFailed = useCallback((i: number) => {
    setFailedSlides(prev => {
      if (prev.has(i)) return prev;
      const nextSet = new Set(prev);
      nextSet.add(i);
      failedRef.current = nextSet;
      return nextSet;
    });
  }, []);

  // A failed image is skipped as soon as it becomes current.
  useEffect(() => {
    if (failedSlides.has(index)) advance();
  }, [failedSlides, index, advance]);

  // Safety net: treat the image as ready even if onLoad never fires.
  useEffect(() => {
    if (readySlides.has(index)) return;
    const t = setTimeout(() => markReady(index), HIGHLIGHT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [index, readySlides, markReady]);

  // The FIRST image's flip starts once it is decoded (so it never flips
  // in blank) and the story is active.
  useEffect(() => {
    if (
      firstFlipStartedRef.current ||
      !flipping ||
      index !== 0 ||
      !active ||
      !readySlides.has(0)
    ) {
      return;
    }
    firstFlipStartedRef.current = true;
    runFlip();
  }, [flipping, index, active, readySlides, runFlip]);

  /* ---------------- Foreground / background ---------------- */

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      setAppActive(isForeground(s));
    });
    return () => sub.remove();
  }, []);

  /* ---------------- The timer ---------------- */

  const canRun =
    active &&
    appActive &&
    !held &&
    !flipping &&
    readySlides.has(index) &&
    !failedSlides.has(index);

  useEffect(() => {
    if (!canRun) return;
    const startedAt = Date.now();
    progress.value = withTiming(
      1,
      { duration: remainingMsRef.current, easing: Easing.linear },
      finished => {
        'worklet';
        if (finished) scheduleOnRN(advance);
      },
    );
    return () => {
      cancelAnimation(progress);
      // Pause on the SAME image: keep what is left of its time. If
      // advance() already moved on, it has reset the time for the new
      // image, which must not be reduced here.
      if (indexRef.current === index) {
        remainingMsRef.current = Math.max(
          0,
          remainingMsRef.current - (Date.now() - startedAt),
        );
      }
    };
    // `index` restarts the timer for each new image.
  }, [canRun, index, advance, progress]);

  /* ---------------- Block Android back while active ---------------- */

  useEffect(() => {
    if (!active) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [active]);

  /* ---------------- Touch: tap / hold ---------------- */

  const onStageLayout = useCallback((e: LayoutChangeEvent) => {
    stageWidthRef.current = e.nativeEvent.layout.width;
  }, []);

  // Pressable does not call onPress after onLongPress, so a hold never
  // also counts as a tap.
  const onStagePress = useCallback(
    (e: GestureResponderEvent) => {
      const width = stageWidthRef.current;
      const isBack =
        width > 0 &&
        e.nativeEvent.locationX < width * HIGHLIGHT_BACK_ZONE_RATIO;
      if (isBack) goBack();
      else advance();
    },
    [advance, goBack],
  );

  const onStageLongPress = useCallback(() => setHeld(true), []);

  // Fires on release AND when the system cancels the touch (finger
  // slides off, incoming call), so a hold can never leave it paused.
  const onStagePressOut = useCallback(() => setHeld(false), []);

  const onAccessibilityAction = useCallback(
    (e: AccessibilityActionEvent) => {
      if (e.nativeEvent.actionName === 'increment') advance();
      else if (e.nativeEvent.actionName === 'decrement') goBack();
    },
    [advance, goBack],
  );

  /* ---------------- Render ---------------- */

  const barStates = useMemo(
    () =>
      HIGHLIGHT_SLIDES.map(
        (_, i): SegmentState =>
          i < index ? 'done' : i === index ? 'active' : 'todo',
      ),
    [index],
  );

  return (
    <View style={styles.root}>
      <View
        style={styles.bars}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Image ${index + 1} of ${SLIDE_COUNT}`}
      >
        {barStates.map((state, i) => (
          <ProgressSegment
            key={HIGHLIGHT_SLIDES[i]!.key}
            state={state}
            progress={progress}
          />
        ))}
      </View>

      <Pressable
        testID="highlights-stage"
        style={styles.stage}
        onLayout={onStageLayout}
        onPress={onStagePress}
        onLongPress={onStageLongPress}
        onPressOut={onStagePressOut}
        delayLongPress={HIGHLIGHT_HOLD_TO_PAUSE_MS}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={HIGHLIGHT_SLIDES[index]!.accessibilityLabel}
        accessibilityValue={{ text: `Image ${index + 1} of ${SLIDE_COUNT}` }}
        accessibilityHint="Swipe up for the next image, down for the previous one."
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={onAccessibilityAction}
      >
        {/* All images are mounted up front so the next one is already
            decoded when its turn comes. Pages are drawn in slide order,
            so the flipping (newer) page is always on top of the page
            under it. The Pressable above is what screen readers read. */}
        {HIGHLIGHT_SLIDES.map((slide, i) => {
          const role: PageRole =
            i === index
              ? flipping
                ? 'flipping'
                : 'current'
              : i === under
              ? 'under'
              : 'hidden';
          return (
            <SlidePage key={slide.key} role={role} flip={flip}>
              <Image
                source={slide.source}
                resizeMode="contain"
                fadeDuration={0}
                style={styles.image}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                accessibilityElementsHidden
                onLoad={() => markReady(i)}
                onError={() => markFailed(i)}
              />
            </SlidePage>
          );
        })}
      </Pressable>
    </View>
  );
};

/* ================================================================
 * SlidePage — one image as a "page" that can flip down
 * ================================================================
 *   flipping  rotateX -100° → 0° around its TOP edge, with a shade
 *             that lifts as it settles (the page catching the light).
 *             At -100° the page is past vertical, so it starts out of
 *             sight.
 *   under     the previous image, fully shown, with a soft shadow
 *             that peaks while the page above passes over it
 *   current   at rest
 *   hidden    mounted (so it is decoded) but invisible
 * ================================================================ */

type PageRole = 'flipping' | 'under' | 'current' | 'hidden';

/** Perspective depth for the flip; larger = flatter. */
const FLIP_PERSPECTIVE = 1200;
/** Start angle: just past vertical, so the page begins out of sight. */
const FLIP_START_DEG = -100;

const SlidePage: React.FC<{
  role: PageRole;
  flip: SharedValue<number>;
  children: React.ReactNode;
}> = ({ role, flip, children }) => {
  const pageStyle = useAnimatedStyle(() => {
    if (role !== 'flipping') {
      return {
        opacity: role === 'hidden' ? 0 : 1,
        transform: [{ perspective: FLIP_PERSPECTIVE }, { rotateX: '0deg' }],
      };
    }
    const deg = interpolate(flip.value, [0, 1], [FLIP_START_DEG, 0]);
    return {
      opacity: 1,
      transform: [{ perspective: FLIP_PERSPECTIVE }, { rotateX: `${deg}deg` }],
    };
  }, [role]);

  const shadeStyle = useAnimatedStyle(() => {
    const p = flip.value;
    if (role === 'flipping') {
      return { opacity: interpolate(p, [0, 1], [0.45, 0]) };
    }
    if (role === 'under') {
      return { opacity: interpolate(p, [0, 0.5, 1], [0, 0.22, 0]) };
    }
    return { opacity: 0 };
  }, [role]);

  return (
    <Animated.View
      style={[styles.page, pageStyle]}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {children}
      <Animated.View style={[styles.shade, shadeStyle]} />
    </Animated.View>
  );
};

/* ================================================================
 * ProgressSegment
 * ================================================================ */

type SegmentState = 'done' | 'active' | 'todo';

const ProgressSegment: React.FC<{
  state: SegmentState;
  progress: SharedValue<number>;
}> = ({ state, progress }) => {
  const fillStyle = useAnimatedStyle(() => {
    const value =
      state === 'done' ? 1 : state === 'active' ? progress.value : 0;
    return { transform: [{ scaleX: value }] };
  }, [state]);

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, fillStyle]} />
    </View>
  );
};

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  // Transparent: what is behind the story (list or white screen) shows
  // until the first page lands on it.
  root: {
    flex: 1,
  },
  bars: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  track: {
    flex: 1,
    height: HIGHLIGHT_BAR_HEIGHT,
    borderRadius: Radius.pill,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  fill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.primaryDark,
    transformOrigin: 'left',
  },
  stage: {
    flex: 1,
  },
  page: {
    ...StyleSheet.absoluteFill,
    // Opaque page, so the flipping image fully covers what is below.
    backgroundColor: Colors.background,
    transformOrigin: 'top',
    backfaceVisibility: 'hidden',
  },
  image: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  shade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.black,
  },
});
