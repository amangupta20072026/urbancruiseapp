/* eslint-disable react-native/no-inline-styles */
/**
 * ------------------------------------------------------------------
 * CustomTabBar — Scooped bar with floating badge (gap around circle)
 * ------------------------------------------------------------------
 *   ╭──╮
 *   │🏠│           ← badge floats above a NOTCH cut into the bar's
 *   ╰──╯              top edge. Notch radius > badge radius, so the
 *  ⌢    📄   📅   💳   👤   screen background shows through as a
 * Home Quo. Book. Pay. Prof.  visible ring/gap around the circle —
 *                              not just a shadow on a flat bar.
 *
 * The bar is drawn as a single animated SVG <Path> (rounded rect +
 * a bezier "valley" around the active tab's x position). The notch
 * position and the badge's translateX are driven by the SAME
 * Reanimated shared value, so they always stay in sync as the
 * active tab changes.
 *
 * Tune the gap by adjusting NOTCH_GAP below.
 * ------------------------------------------------------------------
 * ANIMATION MODEL (do not regress):
 * ------------------------------------------------------------------
 * The badge's horizontal position is driven by a UI-THREAD reaction,
 * not a JS-thread `useEffect + withSpring`. Rationale (this is the
 * bug fix commit):
 *
 * The previous model was:
 *   const cx = useSharedValue(targetCx);
 *   useEffect(() => { cx.value = withSpring(targetCx, SPRING); },
 *             [targetCx, cx]);
 *
 * That coupled the animation to JS-thread commit ordering. When the
 * user tapped a MoreSheet menu item, three async events fired within
 * a couple of frames:
 *   (1) MoreSheet.handleChange(-1) → setIsMoreSheetOpen(false)
 *   (2) React re-renders CustomTabBar with a new targetCx
 *   (3) MoreSheet.handleDismiss → raf(() => navigate('Profile'))
 *
 * If (3) executed before React's passive-effect flush for (2), the
 * spring was never kicked off. `navigate` then pushed the destination
 * screen, react-native-screens detached UcTabs (activityState=0), and
 * the shared value `cx` sat frozen at the More-tab x-coordinate.
 * When the user popped back, nothing re-drove `cx` — the effect deps
 * hadn't changed since blur — so the notch stayed on More even
 * though state.index (and therefore the icon *inside* the notch) had
 * long since resolved to Dashboard.
 *
 * The new model:
 *   1. Sync JS-thread inputs (targetCx, derived from activeIndex +
 *      barWidth + routes.length) into a shared value via a JS-thread
 *      `useEffect`. React 18+ flushes passive effects synchronously
 *      after commit and before paint, so the shared value is up to
 *      date well before any UI thread frame processes it. Writing
 *      during render was tempting for zero-latency sync — Reanimated
 *      4's strict mode rightly flags that pattern because React may
 *      bail on or retry renders in concurrent mode, turning render-
 *      time writes into subtle correctness bugs. `useEffect` is the
 *      officially-supported sync pattern.
 *   2. A single `useAnimatedReaction` on the UI thread observes the
 *      derived target, and calls `cx.value = withSpring(target)`
 *      whenever it changes. Crucially, the animation trigger lives
 *      on the UI thread — not inside a JS-thread effect — so it
 *      cannot race with React commits or the JS thread stalling
 *      during navigation.
 *   3. `useFocusEffect` re-drives the spring toward the current
 *      target every time the screen regains focus. If any future
 *      change ever leaves cx in a stale state, focus heals it.
 *      This is the "self-healing UI" principle used by every
 *      production tab bar (React Nav's own default TabBar does the
 *      equivalent internally).
 *
 * The final piece — timing of the deferred `navigate()` inside
 * MoreSheet.handleDismiss — uses `InteractionManager.runAfterInter-
 * actions`, which fires strictly AFTER useEffect flush. So the spring
 * is always in-flight before navigation dispatches. See MoreSheet.tsx
 * for that half of the fix.
 *
 * If you need to change how the active tab is computed, edit the
 * `activeIndex` line — the animation model above will react.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';

import { Colors, Spacing, Typography } from '@theme';
import { getTabConfig, type TabRoleName } from './tabConfig';

/* -----------------------------------------------------------------
 * Geometry
 * ----------------------------------------------------------------- */

const BAR_HEIGHT = 68;
const BAR_HORIZONTAL_MARGIN = 12;
const BAR_BOTTOM_MARGIN = 8;
const BAR_RADIUS = 26;

const BADGE_SIZE = 54;
const BADGE_RADIUS = BADGE_SIZE / 2;
const BADGE_BORDER_WIDTH = 1.5;

/**
 * How much of the badge protrudes above the bar's top edge (measured
 * from the bar's flat top, not the bottom of the notch).
 */
const BADGE_OVERFLOW_TOP = 26;

/**
 * Total vertical footprint of the tab bar, safe-area bottom included.
 * Parents use this when they present a bottom sheet (like MoreSheet)
 * that must stop above the tab bar via `bottomInset`.
 *
 *   footprint = badge overflow + bar height + bottom margin + safeArea
 *
 * Wrapped in a hook so it stays in sync with orientation / safe-area
 * changes.
 */
export function useTabBarFootprint(): number {
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, 8);
  return BADGE_OVERFLOW_TOP + BAR_HEIGHT + BAR_BOTTOM_MARGIN + safeBottom;
}

/**
 * Extra radius the notch has over the badge — this is what creates
 * the visible background "ring" gap in the reference image.
 *   larger → wider gap between circle and bar
 *   smaller → gap shrinks, closer to the old flush-overlap look
 */
const NOTCH_GAP = 8;
const NOTCH_RADIUS = BADGE_RADIUS + NOTCH_GAP;

/** How far the scoop's shoulders spread out horizontally before
 * flattening back into the bar's straight top edge. */
const NOTCH_SPREAD = 26;

/** How deep the scoop dips into the bar. */
const NOTCH_DEPTH = NOTCH_RADIUS * 0.92;

const SPRING = { damping: 15, stiffness: 180, mass: 0.6 } as const;

const AnimatedPath = Animated.createAnimatedComponent(Path);

/* -----------------------------------------------------------------
 * Bar path builder
 * ----------------------------------------------------------------- */

function buildBarPath(
  width: number,
  height: number,
  cx: number,
  radius: number,
) {
  'worklet';
  // A "normal" scoop needs this much flat top on each side of cx to fit
  // both the shoulder spread and the notch radius. When cx sits closer
  // to either edge than this, the shoulder would collide with — or run
  // past — the bar's rounded corner. In that case we swap the two-part
  // shoulder-plus-scoop for a SINGLE smooth cubic that runs directly
  // from the rounded corner into the notch bottom, so the edge tabs
  // read as one continuous curve instead of a sticky, clipped shoulder.
  const cornerZone = radius + NOTCH_RADIUS;
  const isLeftEdge = cx < cornerZone;
  const isRightEdge = cx > width - cornerZone;

  const leftSide = isLeftEdge
    ? // Corner arc → straight into a single sweeping curve down to
      // the notch bottom. Control-point x is proportional to cx so the
      // curve stays smooth as cx shrinks toward 0.
      `M0,${radius} C0,0 ${cx * 0.4},0 ${cx},${NOTCH_DEPTH}`
    : (() => {
        const left = cx - NOTCH_RADIUS - NOTCH_SPREAD;
        return (
          `M0,${radius} Q0,0 ${radius},0 L${left},0 ` +
          `C${left + NOTCH_SPREAD * 0.55},0 ${
            cx - NOTCH_RADIUS
          },${NOTCH_DEPTH} ${cx},${NOTCH_DEPTH}`
        );
      })();

  const rightSide = isRightEdge
    ? // Mirror of the left-edge case — sweep from notch bottom directly
      // into the right rounded corner.
      `C${width - (width - cx) * 0.4},0 ${width},0 ${width},${radius}`
    : (() => {
        const right = cx + NOTCH_RADIUS + NOTCH_SPREAD;
        return (
          `C${cx + NOTCH_RADIUS},${NOTCH_DEPTH} ${
            right - NOTCH_SPREAD * 0.55
          },0 ${right},0 ` +
          `L${width - radius},0 Q${width},0 ${width},${radius}`
        );
      })();

  return (
    `${leftSide} ${rightSide} ` +
    `L${width},${height - radius} ` +
    `Q${width},${height} ${width - radius},${height} ` +
    `L${radius},${height} ` +
    `Q0,${height} 0,${height - radius} Z`
  );
}

/* -----------------------------------------------------------------
 * Component
 * ----------------------------------------------------------------- */

type Props = BottomTabBarProps & {
  role: TabRoleName;
  /**
   * Optional index to visually treat as active, overriding
   * React Navigation's `state.index`. Used when the More sheet is
   * open — the sheet's presence doesn't change navigation state, but
   * the badge/notch should slide onto the More tab so the user has a
   * visual anchor. Falls back to `state.index` when undefined.
   */
  overrideActiveIndex?: number;
};

const CustomTabBar: React.FC<Props> = ({
  state,
  navigation,
  role,
  overrideActiveIndex,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const config = getTabConfig(role);

  const initialWidth = screenWidth - BAR_HORIZONTAL_MARGIN * 2;
  const [barWidth, setBarWidth] = useState(initialWidth);

  const activeIndex =
    typeof overrideActiveIndex === 'number' &&
    overrideActiveIndex >= 0 &&
    overrideActiveIndex < state.routes.length
      ? overrideActiveIndex
      : state.index;
  const tabWidth = barWidth / state.routes.length;
  const targetCx = tabWidth * activeIndex + tabWidth / 2;

  // Edge tabs (first / last) use a smooth single-curve notch instead of
  // the symmetric shoulder-scoop. Lifting the badge slightly on those
  // tabs keeps the curve visually wrapping the badge without the notch
  // depth clipping into it.
  const cornerZone = BAR_RADIUS + NOTCH_RADIUS;
  const isEdgeTab = targetCx < cornerZone || targetCx > barWidth - cornerZone;
  const badgeTopOffset = isEdgeTab
    ? BADGE_OVERFLOW_TOP - 4
    : BADGE_OVERFLOW_TOP;

  /* ---------------------------------------------------------------
   * UI-thread animation model. See file header for the WHY.
   *
   * targetCxSV mirrors the JS-thread `targetCx` value onto the UI
   * thread via a JS-thread useEffect. The animation itself runs on
   * the UI thread via useAnimatedReaction below — the effect only
   * pipes JS → shared value; it does NOT trigger the animation
   * directly. That separation is what keeps this race-free:
   *
   *   - React commit installs new targetCx.
   *   - useEffect flushes right after commit (before paint) and
   *     writes targetCxSV.value.
   *   - useAnimatedReaction observes the shared value change on the
   *     UI thread's next tick and starts the spring.
   *   - MoreSheet.handleDismiss defers `navigate()` via
   *     InteractionManager.runAfterInteractions, which fires STRICTLY
   *     AFTER useEffect flush. So the spring is already in-flight by
   *     the time navigation dispatches — no interruption.
   *
   * A previous revision wrote `targetCxSV.value = targetCx` during
   * render for zero-latency sync. Reanimated 4's strict mode
   * (checkInvalidWriteDuringRender) rightly flags this: React may
   * bail on the render, retry it (concurrent mode), or interleave
   * it with other commits — any of which turn a render-time write
   * into a subtle correctness bug in the general case. The
   * useEffect pattern is the officially-supported sync pattern.
   *
   * `cx` is what the SVG path and badge translate consume. It's
   * animated by useAnimatedReaction below.
   * ---------------------------------------------------------------- */
  const targetCxSV = useSharedValue(targetCx);
  useEffect(() => {
    targetCxSV.value = targetCx;
  }, [targetCx, targetCxSV]);

  const cx = useSharedValue(targetCx);

  useAnimatedReaction(
    () => targetCxSV.value,
    (next, prev) => {
      if (prev === null) {
        // First run after mount — snap without animating so the notch
        // doesn't slide in from x=0 on cold start.
        cx.value = next;
        return;
      }
      if (next !== prev) {
        cx.value = withSpring(next, SPRING);
      }
    },
    // Deps left empty on purpose — useAnimatedReaction re-subscribes
    // to whichever shared values are read in the prepare function.
    [],
  );

  /* ---------------------------------------------------------------
   * Self-healing on focus. If the animation was ever interrupted
   * (screen detached mid-spring, JS thread stalled, etc.), regaining
   * focus forces a fresh spring to the current target. Idempotent
   * when cx is already at target — Reanimated no-ops in that case.
   * ---------------------------------------------------------------- */
  useFocusEffect(
    useCallback(() => {
      // Cancel any leftover spring, then re-drive toward the current
      // target. Reading targetCxSV.value directly from JS is safe —
      // shared values expose their current value synchronously.
      cancelAnimation(cx);
      cx.value = withSpring(targetCxSV.value, SPRING);
      return undefined;
      // cx and targetCxSV are stable across renders (useSharedValue
      // returns the same object). Empty deps would be equivalent;
      // listing them makes the linter happy without changing behavior.
    }, [cx, targetCxSV]),
  );

  const badgeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: cx.value - BADGE_RADIUS }],
  }));

  const animatedPathProps = useAnimatedProps(() => ({
    d: buildBarPath(barWidth, BAR_HEIGHT, cx.value, BAR_RADIUS),
  }));

  const activeRoute = state.routes[activeIndex];
  const activeMeta = activeRoute ? config[activeRoute.name] : undefined;
  const ActiveIcon = activeMeta?.Icon;
  const activeColor = activeMeta?.color ?? Colors.textPrimary;

  const onBarLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = e.nativeEvent.layout.width;
      if (w > 0 && Math.abs(w - barWidth) > 1) setBarWidth(w);
    },
    [barWidth],
  );

  return (
    <View
      style={[
        styles.root,
        {
          paddingBottom:
            Math.max(insets.bottom, Spacing.sm) + BAR_BOTTOM_MARGIN,
          paddingHorizontal: BAR_HORIZONTAL_MARGIN,
          paddingTop: BADGE_OVERFLOW_TOP,
        },
      ]}
    >
      <View style={styles.barWrap} onLayout={onBarLayout}>
        {/* Bar drawn as a single scooped SVG path (no flat rect) */}
        <Svg
          width={barWidth}
          height={BAR_HEIGHT}
          style={StyleSheet.absoluteFill}
        >
          <AnimatedPath
            animatedProps={animatedPathProps}
            fill={Colors.surface}
            stroke={Colors.border}
            strokeWidth={1}
          />
        </Svg>

        {/* Row of tab hit-targets, laid over the SVG */}
        <View style={styles.tabRow}>
          {state.routes.map((route, index) => {
            const meta = config[route.name];
            if (!meta) return <View key={route.key} style={styles.tab} />;

            const focused = activeIndex === index;
            const { Icon, label, color } = meta;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              // Compare against the REAL navigation state here — even
              // when overrideActiveIndex marks this tab as visually
              // focused (More sheet open), tapping it again should
              // still fire the tabPress event so listeners like
              // preventDefault + present() can run.
              if (state.index !== index && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params as never);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={label}
                style={({ pressed }) => [
                  styles.tab,
                  pressed && styles.tabPressed,
                ]}
              >
                <View style={styles.iconSlot}>
                  {focused ? (
                    // Icon rendered inside the floating badge; keep a
                    // placeholder of the same size so the label sits
                    // at the same y as inactive tabs.
                    <View style={styles.iconPlaceholder} />
                  ) : (
                    <Icon
                      color={Colors.textSecondary}
                      size={22}
                      strokeWidth={2}
                    />
                  )}
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.label,
                    focused && { color, fontWeight: '700' },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Floating badge — sits inside the notch's gap, slides horizontally.
            Edge tabs lift the badge a few px so the smooth single-curve
            notch wraps around it cleanly instead of clipping its bottom. */}
        <Animated.View
          pointerEvents="none"
          style={[styles.badge, { top: -badgeTopOffset }, badgeAnimStyle]}
        >
          {ActiveIcon ? (
            <ActiveIcon color={activeColor} size={24} strokeWidth={2.2} />
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
};

export default CustomTabBar;

/* -----------------------------------------------------------------
 * Styles
 * ----------------------------------------------------------------- */

const styles = StyleSheet.create({
  root: {
    backgroundColor: 'transparent',
  },
  barWrap: {
    position: 'relative',
    height: BAR_HEIGHT,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: BAR_HEIGHT,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabPressed: {
    opacity: 0.7,
  },
  iconSlot: {
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholder: {
    width: 22,
    height: 22,
  },
  label: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    left: 0,
    top: -BADGE_OVERFLOW_TOP,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_RADIUS,
    backgroundColor: Colors.surface,
    borderWidth: BADGE_BORDER_WIDTH,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
