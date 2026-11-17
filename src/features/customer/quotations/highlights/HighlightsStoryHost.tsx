/**
 * ------------------------------------------------------------------
 * HighlightsStoryHost — the brand images over the current screen
 * ------------------------------------------------------------------
 * Mounted ONCE in App.tsx, right after NavigationContainer, so it
 * draws on top of every screen and the tab bar. Driven through
 * `storyOverlay.ts`; see that file for the full sequence.
 *
 *   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
 *   │ ▓▓ ░░ ░░      │   │ ▓▓ ░░ ░░      │   │ ███ ▓▓ ░░     │
 *   │ quotation     │ → │ image 1 flips │ → │ images 2, 3   │ → details
 *   │ list (seen    │   │ down over the │   │ flip over the │   (fade)
 *   │ through)      │   │ list          │   │ previous one  │
 *   └───────────────┘   └───────────────┘   └───────────────┘
 *
 * BACKGROUND:
 *   See-through until the first image has fully flipped down, so the
 *   list stays visible behind the bars and under the falling page.
 *   Then opaque (the brand background), like the screen version.
 *
 * END:
 *   After the last image it calls the request's `onFinish` (which
 *   opens QuotationDetail underneath, with its fade-up), then fades
 *   itself out so the details screen shows through.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Colors } from '@theme';

import { HIGHLIGHT_OVERLAY_FADE_OUT_MS } from './config';
import { HighlightsStory } from './HighlightsStory';
import { registerHighlightsStoryHost } from './storyOverlay';

/** idle → playing → closing → idle */
type Phase = 'idle' | 'playing' | 'closing';

export const HighlightsStoryHost: React.FC = () => {
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<Phase>('idle');
  const [opaque, setOpaque] = useState(false);
  // New key per run, so every run starts a fresh story.
  const [runKey, setRunKey] = useState(0);

  const phaseRef = useRef<Phase>('idle');
  const onFinishRef = useRef<(() => void) | null>(null);
  const fade = useSharedValue(1);

  const setPhaseBoth = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const toIdle = useCallback(() => {
    onFinishRef.current = null;
    setOpaque(false);
    setPhaseBoth('idle');
  }, [setPhaseBoth]);

  const start = useCallback(
    (onFinish: () => void): boolean => {
      if (phaseRef.current !== 'idle') return false;
      onFinishRef.current = onFinish;
      fade.value = 1;
      setOpaque(false);
      setRunKey(k => k + 1);
      setPhaseBoth('playing');
      return true;
    },
    [fade, setPhaseBoth],
  );

  useEffect(() => registerHighlightsStoryHost({ start }), [start]);

  /* After the last image: open details underneath, then fade away. */
  const onStoryFinish = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    setPhaseBoth('closing');
    const cb = onFinishRef.current;
    onFinishRef.current = null;
    cb?.();
    fade.value = withTiming(
      0,
      {
        duration: HIGHLIGHT_OVERLAY_FADE_OUT_MS,
        easing: Easing.out(Easing.quad),
      },
      done => {
        'worklet';
        if (done) scheduleOnRN(toIdle);
      },
    );
  }, [fade, setPhaseBoth, toIdle]);

  const onFirstImageShown = useCallback(() => setOpaque(true), []);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  if (phase === 'idle') return null;

  return (
    <Animated.View
      // While closing, taps go to the details screen underneath.
      pointerEvents={phase === 'playing' ? 'auto' : 'none'}
      style={[
        styles.overlay,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
        opaque ? styles.opaque : styles.seeThrough,
        fadeStyle,
      ]}
    >
      <HighlightsStory
        key={runKey}
        active={phase === 'playing'}
        onFinish={onStoryFinish}
        onFirstImageShown={onFirstImageShown}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    elevation: 1000,
  },
  // Until the first image has flipped down: the list shows through.
  seeThrough: {
    backgroundColor: 'transparent',
  },
  opaque: {
    backgroundColor: Colors.background,
  },
});
