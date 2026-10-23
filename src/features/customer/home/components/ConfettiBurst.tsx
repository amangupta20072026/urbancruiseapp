/**
 * ------------------------------------------------------------------
 * ConfettiBurst — one-shot confetti for the first-time welcome
 * ------------------------------------------------------------------
 * Two bursts from the lower-left and lower-right corners, falling
 * under gravity and fading out. Built on Reanimated (already in the
 * app): ONE shared progress value drives every piece on the UI
 * thread, so the JS thread stays free and nothing re-renders per
 * frame. No assets, no extra library.
 *
 * Pieces are generated once per mount from a seeded generator, so
 * the layout is stable across re-renders.
 *
 * The caller must not render this when Reduce Motion is on.
 * ------------------------------------------------------------------
 */

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Colors } from '@theme';

const PIECE_COUNT = 70;
const DURATION_MS = 2800;
/** px / s² — tuned so pieces arc up, then fall off the bottom. */
const GRAVITY = 1400;
/** Last share of the animation over which pieces fade out. */
const FADE_FROM = 0.75;

const PALETTE = [
  Colors.primary,
  Colors.secondary,
  Colors.accent,
  Colors.royal,
  Colors.completed,
  Colors.roleDriver,
] as const;

type Piece = {
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  spin: number;
  width: number;
  height: number;
  radius: number;
  color: string;
};

/**
 * Small deterministic PRNG (Park–Miller, arithmetic only): stable
 * pieces per mount. 16807 × (2^31 − 1) stays below 2^53, so every
 * step is exact in a JS number.
 */
function seeded(seed: number): () => number {
  const M = 2147483647;
  let state = seed % M;
  if (state <= 0) state += M - 1;
  return () => {
    state = (state * 16807) % M;
    return (state - 1) / (M - 1);
  };
}

function makePieces(width: number, height: number): Piece[] {
  const rand = seeded(20261023);
  return Array.from({ length: PIECE_COUNT }, (_, i) => {
    const fromLeft = i % 2 === 0;
    const isStrip = rand() < 0.55;
    const size = 6 + rand() * 6;
    return {
      originX: fromLeft ? -10 : width + 10,
      originY: height * 0.62,
      vx: (fromLeft ? 1 : -1) * (180 + rand() * 320),
      vy: -(700 + rand() * 500),
      spin: (rand() - 0.5) * 1440,
      width: isStrip ? size * 1.6 : size,
      height: isStrip ? size * 0.6 : size,
      radius: isStrip ? 1 : size / 2,
      color: PALETTE[i % PALETTE.length]!,
    };
  });
}

const ConfettiPiece: React.FC<{
  piece: Piece;
  progress: SharedValue<number>;
}> = ({ piece, progress }) => {
  const style = useAnimatedStyle(() => {
    const t = (progress.value * DURATION_MS) / 1000;
    const x = piece.originX + piece.vx * t;
    const y = piece.originY + piece.vy * t + 0.5 * GRAVITY * t * t;
    const opacity =
      progress.value < FADE_FROM
        ? 1
        : Math.max(0, 1 - (progress.value - FADE_FROM) / (1 - FADE_FROM));
    return {
      opacity,
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${piece.spin * t}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: piece.width,
          height: piece.height,
          borderRadius: piece.radius,
          backgroundColor: piece.color,
        },
        style,
      ]}
    />
  );
};

export const ConfettiBurst: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(() => makePieces(width, height), [width, height]);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: DURATION_MS,
      easing: Easing.linear,
    });
  }, [progress]);

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {pieces.map((piece, i) => (
        <ConfettiPiece key={i} piece={piece} progress={progress} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
