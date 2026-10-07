/* eslint-disable @typescript-eslint/no-shadow */
import React, { useCallback, useEffect, useState } from 'react';

import {
  type ImageSourcePropType,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import Svg, {
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import { Colors, FontSize, FontWeight, Spacing } from '@theme';

import { SERVICE_MODE_LABEL, type ServiceMode } from '../types';

/* ------------------------------------------------------------------
 * ServiceSwitcher — Swiggy-style service tabs on Customer Home
 * ------------------------------------------------------------------
 *
 *   ┌──────────────┐ ╭──────────────╮
 *   │  inactive    │ │   ACTIVE     │      ← active tile has no
 *   │  (grey fill) │ │ (page fill)  │        bottom edge; its corners
 * ──┴──────────────┴─╯              ╰──    flare into the baseline
 *
 * States:
 *   value = 'car_bus'         → left tile active
 *   value = 'spiritual_tour'  → right tile active
 *   value = null              → both inactive (neutral / initial)
 *
 * Visual rules:
 *   - Inactive tiles are filled grey with a light border and sit ON
 *     the edge-to-edge baseline.
 *   - The active tile takes the page colour (`backgroundColor` prop)
 *     and is drawn last, so it covers the baseline beneath it and
 *     reads as opening into the content below.
 *   - Active icon springs up to ACTIVE_SCALE; inactive icons rest at
 *     INACTIVE_SCALE. Active label is bold, inactive is regular grey.
 *
 * Animation model (mirrors CustomTabBar — see the notes there):
 *   The JS-thread `selected` flag is synced into a shared value via
 *   useEffect, and a UI-thread useAnimatedReaction starts the spring.
 *   The trigger never races React commits or navigation.
 *
 * Layout:
 *   The switcher spans the full screen width so the baseline runs
 *   edge to edge. Tiles are inset by SIDE_PADDING.
 * ------------------------------------------------------------------ */

type Props = {
  /** Selected mode, or `null` for the neutral state (both inactive). */
  value: ServiceMode | null;
  onChange: (next: ServiceMode) => void;
  /**
   * Colour of the surface directly below the switcher. The active
   * tile is filled with it so the two merge seamlessly.
   * Defaults to the Customer Home scroll background.
   */
  backgroundColor?: string;
};

type Option = {
  value: ServiceMode;
  image: ImageSourcePropType;
  /** Rest height of the image box; balances the two artworks. */
  imageHeight: number;
};

const OPTIONS: readonly Option[] = [
  {
    value: 'car_bus',
    image: require('@assets/images/service-car.png'),
    imageHeight: 58,
  },
  {
    value: 'spiritual_tour',
    image: require('@assets/images/service-temple.png'),
    imageHeight: 46,
  },
];

/* -------- Geometry -------- */

const TILE_HEIGHT = 82;
const TOP_RADIUS = 22;
/** How far each side leans inward from bottom to top. */
const SIDE_LEAN = 9;
/** Size of the active tile's outward bottom flare. */
const FLARE = 14;
/** Head-room above the tiles so the scaled-up icon never clips. */
const TOP_SPACE = 6;
const SIDE_PADDING = Spacing.md;

const CANVAS_HEIGHT = TOP_SPACE + TILE_HEIGHT + 1;

/** Horizontal offset of the leaning side at the flare's top. */
const FLARE_SIDE_X = (SIDE_LEAN * FLARE) / (TILE_HEIGHT - TOP_RADIUS);

/* -------- Strokes -------- */

const ACTIVE_STROKE_WIDTH = 1.5;
const INACTIVE_STROKE_WIDTH = 1;

/* -------- Icon animation -------- */

const ACTIVE_SCALE = 1.06;
const INACTIVE_SCALE = 0.84;
const ACTIVE_LIFT = -1;
const SPRING = { damping: 12, stiffness: 220, mass: 0.6 } as const;

const IMAGE_WIDTH = 96;
const LABEL_LINE_HEIGHT = 17;

const INACTIVE_GRADIENT_ID = 'serviceSwitcherInactiveFill';

/* ------------------------------------------------------------------
 * Path builders
 * ------------------------------------------------------------------ */

/** Closed tile: leaning sides, rounded top, flat bottom on baseline. */
export function buildInactivePath(x: number, w: number): string {
  const h = TILE_HEIGHT;
  const r = TOP_RADIUS;
  const t = SIDE_LEAN;

  return [
    `M ${x} ${h}`,
    `L ${x + t} ${r}`,
    `C ${x + t} ${r * 0.45} ${x + t + r * 0.45} 0 ${x + t + r} 0`,
    `L ${x + w - t - r} 0`,
    `C ${x + w - t - r * 0.45} 0 ${x + w - t} ${r * 0.45} ${x + w - t} ${r}`,
    `L ${x + w} ${h}`,
    'Z',
  ].join(' ');
}

/**
 * Open tile: same silhouette, but the bottom corners flare outward by
 * FLARE into the baseline and the path is left open, so no bottom
 * edge is stroked. The fill still closes along the baseline.
 */
export function buildActivePath(x: number, w: number): string {
  const h = TILE_HEIGHT;
  const r = TOP_RADIUS;
  const t = SIDE_LEAN;
  const f = FLARE;
  const s = FLARE_SIDE_X;

  return [
    `M ${x - f} ${h}`,
    `C ${x - f * 0.4} ${h} ${x + s} ${h - f * 0.4} ${x + s} ${h - f}`,
    `L ${x + t} ${r}`,
    `C ${x + t} ${r * 0.45} ${x + t + r * 0.45} 0 ${x + t + r} 0`,
    `L ${x + w - t - r} 0`,
    `C ${x + w - t - r * 0.45} 0 ${x + w - t} ${r * 0.45} ${x + w - t} ${r}`,
    `L ${x + w - s} ${h - f}`,
    `C ${x + w - s} ${h - f * 0.4} ${x + w + f * 0.4} ${h} ${x + w + f} ${h}`,
  ].join(' ');
}

/* ------------------------------------------------------------------
 * ServiceSwitcher
 * ------------------------------------------------------------------ */

export const ServiceSwitcher: React.FC<Props> = ({
  value,
  onChange,
  backgroundColor = Colors.backgroundSecondary,
}) => {
  const [rowWidth, setRowWidth] = useState(0);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    setRowWidth(prev => (prev === next ? prev : next));
  }, []);

  const tileWidth = (rowWidth - SIDE_PADDING * 2) / OPTIONS.length;
  const activeIndex = OPTIONS.findIndex(option => option.value === value);

  return (
    <View
      style={styles.row}
      onLayout={handleLayout}
      accessibilityRole="radiogroup"
    >
      {rowWidth > 0 ? (
        <>
          <Svg
            width={rowWidth}
            height={CANVAS_HEIGHT}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            <Defs>
              <LinearGradient
                id={INACTIVE_GRADIENT_ID}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <Stop offset="0" stopColor={Colors.switcherInactiveTop} />
                <Stop offset="1" stopColor={Colors.switcherInactiveBottom} />
              </LinearGradient>
            </Defs>

            <G translateY={TOP_SPACE}>
              {/* 1. Inactive tiles */}
              {OPTIONS.map((option, index) =>
                index === activeIndex ? null : (
                  <Path
                    key={option.value}
                    d={buildInactivePath(
                      SIDE_PADDING + index * tileWidth,
                      tileWidth,
                    )}
                    fill={`url(#${INACTIVE_GRADIENT_ID})`}
                    stroke={Colors.switcherInactiveBorder}
                    strokeWidth={INACTIVE_STROKE_WIDTH}
                    strokeLinejoin="round"
                  />
                ),
              )}

              {/* 2. Edge-to-edge baseline */}
              <Line
                x1={0}
                y1={TILE_HEIGHT - 0.5}
                x2={rowWidth}
                y2={TILE_HEIGHT - 0.5}
                stroke={Colors.switcherBaseline}
                strokeWidth={INACTIVE_STROKE_WIDTH}
              />

              {/* 3. Active tile last — covers the baseline beneath it */}
              {activeIndex >= 0 ? (
                <Path
                  d={buildActivePath(
                    SIDE_PADDING + activeIndex * tileWidth,
                    tileWidth,
                  )}
                  fill={backgroundColor}
                  stroke={Colors.primary}
                  strokeWidth={ACTIVE_STROKE_WIDTH}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ) : null}
            </G>
          </Svg>

          {OPTIONS.map((option, index) => (
            <ServiceTab
              key={option.value}
              option={option}
              selected={index === activeIndex}
              left={SIDE_PADDING + index * tileWidth}
              width={tileWidth}
              onPress={onChange}
            />
          ))}
        </>
      ) : null}
    </View>
  );
};

/* ------------------------------------------------------------------
 * ServiceTab — touch target + animated icon + label for one tile
 * ------------------------------------------------------------------ */

type ServiceTabProps = {
  option: Option;
  selected: boolean;
  left: number;
  width: number;
  onPress: (value: ServiceMode) => void;
};

const ServiceTab = React.memo(function ServiceTab({
  option,
  selected,
  left,
  width,
  onPress,
}: ServiceTabProps) {
  const label = SERVICE_MODE_LABEL[option.value];

  // Start at the resting state so the first paint never animates.
  const target = useSharedValue(selected ? 1 : 0);
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    target.value = selected ? 1 : 0;
  }, [selected, target]);

  useAnimatedReaction(
    () => target.value,
    (next, prev) => {
      if (prev !== null && next !== prev) {
        progress.value = withSpring(next, SPRING);
      }
    },
  );

  const imageStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      transform: [
        { translateY: ACTIVE_LIFT * p },
        { scale: INACTIVE_SCALE + (ACTIVE_SCALE - INACTIVE_SCALE) * p },
      ],
    };
  });

  const handlePress = useCallback(() => {
    onPress(option.value);
  }, [onPress, option.value]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, selected }}
      style={({ pressed }) => [
        styles.tab,
        { left, width },
        pressed && styles.pressed,
      ]}
    >
      <Animated.Image
        source={option.image}
        resizeMode="contain"
        style={[styles.image, { height: option.imageHeight }, imageStyle]}
      />

      <Text
        numberOfLines={1}
        style={[
          styles.label,
          selected ? styles.activeLabel : styles.inactiveLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    width: '100%',
    height: CANVAS_HEIGHT,
    marginBottom: Spacing.lg,
  },

  tab: {
    position: 'absolute',
    top: 0,
    height: CANVAS_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: Spacing.sm + 2,
    paddingHorizontal: SIDE_LEAN,
  },

  pressed: {
    opacity: 0.85,
  },

  image: {
    width: IMAGE_WIDTH,
    marginBottom: Spacing.xxs,
    // Scale from the bottom so the icon grows upward, away from the label.
    transformOrigin: 'bottom',
  },

  label: {
    fontSize: FontSize.md,
    lineHeight: LABEL_LINE_HEIGHT,
    textAlign: 'center',
  },

  activeLabel: {
    color: Colors.primaryDark,
    fontWeight: FontWeight.bold,
  },

  inactiveLabel: {
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
});
