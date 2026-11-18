/**
 * ------------------------------------------------------------------
 * VehicleTierTabs — Economy · Premium · Royal · Royal VIP
 * ------------------------------------------------------------------
 *   ┌───────────────────────────────────────────────┐
 *   │ Economy 1 │ Premium 1 │█Royal 2█│ Royal VIP 3• │
 *   └───────────────────────────────────────────────┘
 *
 * A segmented control inside the "Choose Your Vehicle" card. The
 * coloured highlight SLIDES to the tapped tab (and widens / narrows
 * to fit it) and takes that tier's colour from VEHICLE_TIER_PALETTE:
 * Economy green, Premium blue, Royal purple, Royal VIP gold — the
 * same colours as the tier pills everywhere in the app.
 *
 * MARKED TAB
 *   `markedKey` is the tier that holds the customer's selected
 *   vehicle. While they look at ANOTHER tier, that tab shows a small
 *   dot in its colour, so the choice is never out of sight.
 *
 * HOW THE SLIDE WORKS
 *   Each tab reports its x and width (onLayout). The highlight is one
 *   absolutely-placed view whose left, width and colour animate with
 *   withTiming. Before the first layout it is invisible, then it is
 *   placed without animation, so it never slides in from the left
 *   edge on first render.
 * ------------------------------------------------------------------
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Radius, Spacing, Typography } from '@theme';
import type { VehicleTierKey } from '../vehicleTierOptions';

export type VehicleTierTab = {
  key: VehicleTierKey;
  /** Title case, e.g. "Royal VIP". */
  label: string;
  /** How many vehicles the tier has. */
  count: number;
  /** The tier's solid colour (highlight and marker dot). */
  color: string;
};

type Props = {
  tabs: readonly VehicleTierTab[];
  value: VehicleTierKey;
  onChange: (key: VehicleTierKey) => void;
  /** Tier holding the selected vehicle; null when none is selected. */
  markedKey: VehicleTierKey | null;
};

type TabLayout = { x: number; width: number };

const SLIDE_MS = 280;
const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

export const VehicleTierTabs: React.FC<Props> = ({
  tabs,
  value,
  onChange,
  markedKey,
}) => {
  const [layouts, setLayouts] = useState<
    Partial<Record<VehicleTierKey, TabLayout>>
  >({});

  const left = useSharedValue(0);
  const width = useSharedValue(0);
  const opacity = useSharedValue(0);
  const color = useSharedValue<string>(
    tabs.find(t => t.key === value)?.color ?? Colors.primaryDark,
  );

  const activeLayout = layouts[value];
  const activeColor = tabs.find(t => t.key === value)?.color;

  useEffect(() => {
    if (!activeLayout || !activeColor) return;
    if (opacity.value === 0) {
      // First placement: jump into position, then show.
      left.value = activeLayout.x;
      width.value = activeLayout.width;
      color.value = activeColor;
      opacity.value = withTiming(1, { duration: 120 });
      return;
    }
    left.value = withTiming(activeLayout.x, {
      duration: SLIDE_MS,
      easing: EASE,
    });
    width.value = withTiming(activeLayout.width, {
      duration: SLIDE_MS,
      easing: EASE,
    });
    color.value = withTiming(activeColor, { duration: SLIDE_MS });
  }, [activeLayout, activeColor, left, width, color, opacity]);

  const highlightStyle = useAnimatedStyle(() => ({
    left: left.value,
    width: width.value,
    opacity: opacity.value,
    backgroundColor: color.value,
  }));

  const onTabLayout = useCallback(
    (key: VehicleTierKey) => (e: LayoutChangeEvent) => {
      const { x, width: w } = e.nativeEvent.layout;
      setLayouts(prev => {
        const old = prev[key];
        if (old && old.x === x && old.width === w) return prev;
        return { ...prev, [key]: { x, width: w } };
      });
    },
    [],
  );

  return (
    <View style={styles.track} accessibilityRole="tablist">
      <Animated.View
        pointerEvents="none"
        style={[styles.highlight, highlightStyle]}
      />

      {tabs.map(tab => {
        const active = tab.key === value;
        const marked = markedKey === tab.key && !active;

        return (
          <Pressable
            key={tab.key}
            onLayout={onTabLayout(tab.key)}
            onPress={() => onChange(tab.key)}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${tab.label}, ${tab.count} vehicle${
              tab.count === 1 ? '' : 's'
            }${marked ? ', has your selected vehicle' : ''}`}
          >
            <Text
              style={[styles.label, active && styles.labelActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              maxFontSizeMultiplier={1.3}
            >
              {tab.label}
              <Text style={[styles.count, active && styles.countActive]}>
                {` ${tab.count}`}
              </Text>
            </Text>

            {marked ? (
              <View style={[styles.dot, { backgroundColor: tab.color }]} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: Radius.md,
    backgroundColor: Colors.backgroundTertiary,
  },
  highlight: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    borderRadius: Radius.sm + 1,
  },
  tab: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  label: {
    ...Typography.caption,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  labelActive: {
    color: Colors.textOnPrimary,
    fontWeight: '700',
  },
  count: {
    fontWeight: '500',
    color: Colors.textTertiary,
  },
  countActive: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  dot: {
    position: 'absolute',
    top: 5,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: Radius.circle,
  },
});
