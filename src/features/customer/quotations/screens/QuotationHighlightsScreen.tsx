/**
 * ------------------------------------------------------------------
 * QuotationHighlightsScreen (Customer)
 * ------------------------------------------------------------------
 * Shows three full-screen brand images (vehicles → pan-India → why
 * choose us), 5 seconds each, then REPLACES itself with
 * QuotationDetail using the same params. `replace` means Back on the
 * details screen returns to where the customer came from, never to
 * these images.
 *
 *   [ ███████ ▓▓▓░░░░ ░░░░░░░ ]   ← progress bars (no Skip, by design)
 *   ┌───────────────────────────┐
 *   │                           │
 *   │   image, resizeMode       │   whole image always visible
 *   │   'contain' (nothing cut) │
 *   │                           │
 *   └───────────────────────────┘
 *
 * TIMING — one source of truth:
 *   The progress-bar animation (Reanimated, UI thread) IS the timer.
 *   When it completes, it schedules the advance on the JS thread, so
 *   the bar and the image change can never drift apart.
 *
 * PAUSE / RESUME:
 *   The timer runs only while the app is in the foreground AND this
 *   screen is focused AND the current image is ready. If the customer
 *   leaves the app, the image keeps its remaining time and continues
 *   on return — same behaviour as OnboardingScreen's auto-advance.
 *
 * NO WAY OUT (product decision):
 *   No Skip button, Android back is consumed (BackHandler), iOS
 *   swipe-back is off (gestureEnabled: false in CustomerNavigator).
 *   Because of that, the screen must never get stuck:
 *     - each image's timer starts on onLoad, or after
 *       HIGHLIGHT_LOAD_TIMEOUT_MS if onLoad never arrives;
 *     - an image that fails to load is skipped;
 *     - after the last image it always goes to the details screen.
 *
 * ENTRY GATE:
 *   In-app callers decide before navigating (useOpenQuotationDetail).
 *   Deep links / notification taps always land here, so the screen
 *   re-applies the same rule (shouldShowHighlights) and goes straight
 *   to details for Expired or unknown quotations.
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
  StyleSheet,
  View,
  type AppStateStatus,
} from 'react-native';
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { SafeScreen } from '@shared/components';
import { Colors, Radius, Spacing } from '@theme';
import type { CustomerStackParamList } from '@navigation/types';

import {
  HIGHLIGHT_LOAD_TIMEOUT_MS,
  HIGHLIGHT_SLIDE_DURATION_MS,
  HIGHLIGHT_SLIDES,
} from '../highlights/config';
import { shouldShowHighlights } from '../highlights/rules';

type Nav = NativeStackNavigationProp<
  CustomerStackParamList,
  'QuotationHighlights'
>;
type Route = RouteProp<CustomerStackParamList, 'QuotationHighlights'>;

const SLIDE_COUNT = HIGHLIGHT_SLIDES.length;

/**
 * Pause only on an explicit background / inactive state. At cold
 * start (e.g. from a notification tap) AppState can still report
 * 'unknown' (documented in AppState.d.ts); treating that as "not
 * active" would stop the timer from ever starting.
 */
function isForeground(state: AppStateStatus): boolean {
  return state !== 'background' && state !== 'inactive';
}

const QuotationHighlightsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const isFocused = useIsFocused();

  // Decided once per mount: the rule must not flip mid-sequence.
  const [eligible] = useState(() => shouldShowHighlights(params.quotationId));

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

  const progress = useSharedValue(0);
  const indexRef = useRef(0);
  const remainingMsRef = useRef(HIGHLIGHT_SLIDE_DURATION_MS);
  const finishedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ---------------- Finish → details ---------------- */

  const finish = useCallback(() => {
    if (finishedRef.current || !mountedRef.current) return;
    finishedRef.current = true;
    cancelAnimation(progress);
    navigation.replace('QuotationDetail', params);
  }, [navigation, params, progress]);

  // Deep-link entry for an Expired / unknown quotation.
  useEffect(() => {
    if (!eligible) finish();
  }, [eligible, finish]);

  /* ---------------- Advance ---------------- */

  const advance = useCallback(() => {
    if (finishedRef.current || !mountedRef.current) return;
    const next = indexRef.current + 1;
    if (next >= SLIDE_COUNT) {
      finish();
      return;
    }
    indexRef.current = next;
    remainingMsRef.current = HIGHLIGHT_SLIDE_DURATION_MS;
    progress.value = 0;
    setIndex(next);
  }, [finish, progress]);

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
      return nextSet;
    });
  }, []);

  // A failed image is skipped as soon as it becomes current.
  useEffect(() => {
    if (eligible && failedSlides.has(index)) advance();
  }, [eligible, failedSlides, index, advance]);

  // Safety net: start the timer even if onLoad never fires.
  useEffect(() => {
    if (!eligible || readySlides.has(index)) return;
    const t = setTimeout(() => markReady(index), HIGHLIGHT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [eligible, index, readySlides, markReady]);

  /* ---------------- Foreground / background ---------------- */

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      setAppActive(isForeground(s));
    });
    return () => sub.remove();
  }, []);

  /* ---------------- The timer ---------------- */

  const canRun =
    eligible &&
    isFocused &&
    appActive &&
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

  /* ---------------- Block Android back ---------------- */

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => sub.remove();
    }, []),
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

  // Expired / unknown: blank screen for the instant before `replace`.
  if (!eligible) {
    return <SafeScreen>{null}</SafeScreen>;
  }

  return (
    <SafeScreen>
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

      <View style={styles.stage}>
        {/* All images are mounted up front so the next one is already
            decoded when its turn comes; only the current one is
            visible and exposed to screen readers. */}
        {HIGHLIGHT_SLIDES.map((slide, i) => {
          const current = i === index;
          return (
            <Image
              key={slide.key}
              source={slide.source}
              resizeMode="contain"
              fadeDuration={0}
              style={[styles.image, !current && styles.hidden]}
              accessible={current}
              accessibilityRole="image"
              accessibilityLabel={slide.accessibilityLabel}
              importantForAccessibility={
                current ? 'yes' : 'no-hide-descendants'
              }
              accessibilityElementsHidden={!current}
              onLoad={() => markReady(i)}
              onError={() => markFailed(i)}
            />
          );
        })}
      </View>
    </SafeScreen>
  );
};

export default QuotationHighlightsScreen;

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

const BAR_HEIGHT = 3;

const styles = StyleSheet.create({
  bars: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  track: {
    flex: 1,
    height: BAR_HEIGHT,
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
  image: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  hidden: {
    opacity: 0,
  },
});
