// src/services/toast/ToastItemView.tsx

/**
 * ------------------------------------------------------------------
 * ToastItemView — one visible toast row
 * ------------------------------------------------------------------
 * A single, self-contained row. Owns:
 *
 *   - Pan gesture (swipe UP to dismiss — matches top-anchored
 *     placement so the motion moves the toast off-screen naturally).
 *   - Tap-to-dismiss (unless the caller provided an `action` — then
 *     only the action button dismisses).
 *   - Spinner rotation for the `loading` variant.
 *   - Accessibility role + live announcement.
 *
 * DELIBERATELY does NOT own:
 *   - Timers (the store owns them, so tests can drive them
 *     deterministically without mounting React).
 *   - Positioning / safe-area (the host owns those — the row is
 *     layout-agnostic).
 *   - Stacking layout (also the host).
 * ------------------------------------------------------------------
 */

import React, { useEffect } from 'react';
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { X } from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { invokeAction } from './api';
import { dismiss } from './store';
import { VARIANT_STYLES } from './variantStyles';
import type { ToastItem } from './types';

/* ================================================================
 * Tunables (visual only — behaviour tunables live in store.ts)
 * ================================================================ */

/** How far the user must drag up before we treat it as a dismiss. */
const DISMISS_VELOCITY = -500; // px/s
const DISMISS_TRANSLATION = -40; // px

type Props = {
  readonly item: ToastItem;
};

const ToastItemViewInner: React.FC<Props> = ({ item }) => {
  const style = VARIANT_STYLES[item.kind];
  const Icon = style.icon;

  /* --- Pan-to-dismiss --------------------------------------------
   * `translateY` drives both the finger-follow gesture and the
   * final exit animation. React Native Reanimated layout animations
   * handle the tail-end fade-out at the host level.
   *
   * NOTE ON THE RNGH 3 HOOK API:
   *   `usePanGesture(config)` is the current (RNGH 3+) replacement
   *   for the deprecated builder `Gesture.Pan()`. Configuration is
   *   passed as a plain object rather than chained methods.
   *
   *   Callback rename per the official migration guide:
   *     onStart  -> onActivate
   *     onEnd    -> onDeactivate     ← we use this one
   *     onUpdate -> onUpdate         (unchanged)
   *
   *   The hook memoises its result internally, so no `useMemo`
   *   wrapper is needed.
   * ------------------------------------------------------------- */
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  const runDismiss = (): void => {
    dismiss(item.id);
  };

  const panGesture = usePanGesture({
    activeOffsetY: -6,
    failOffsetY: 12,
    onUpdate: e => {
      // Only respond to upward motion; ignore downward drags.
      translateY.value = Math.min(0, e.translationY);
      opacity.value = 1 - Math.min(1, -translateY.value / 80);
    },
    onDeactivate: e => {
      const shouldDismiss =
        e.velocityY < DISMISS_VELOCITY ||
        translateY.value < DISMISS_TRANSLATION;
      if (shouldDismiss) {
        translateY.value = withTiming(-120, { duration: 180 });
        opacity.value = withTiming(0, { duration: 180 }, () => {
          // `scheduleOnRN` (react-native-worklets) is the current
          // replacement for the deprecated `runOnJS` from Reanimated.
          // It hops from the UI thread back to the JS thread so we
          // can call the store's `dismiss` action safely.
          scheduleOnRN(runDismiss);
        });
      } else {
        translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
        opacity.value = withSpring(1, { damping: 18, stiffness: 220 });
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  /* --- Loading spinner rotation ---------------------------------
   * Reanimated's `withRepeat(withTiming(360, …), -1)` is the
   * canonical infinite spin. We start it lazily on mount for
   * loading variants and cancel on unmount to avoid a leaked
   * animation frame.
   * ------------------------------------------------------------- */
  const spin = useSharedValue(0);
  useEffect(() => {
    if (item.kind !== 'loading') return;
    spin.value = 0;
    spin.value = withRepeat(
      withTiming(360, { duration: 900, easing: Easing.linear }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(spin);
    };
  }, [item.kind, spin]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  /* --- Accessibility announcement -------------------------------
   * Two-pronged strategy so both platforms actually SPEAK the toast:
   *
   *   Android — `accessibilityLiveRegion` (assertive | polite) tells
   *             TalkBack to announce when the node appears or its
   *             text changes. This prop is Android-only.
   *
   *   iOS     — VoiceOver ignores live regions. It only announces
   *             when the focus changes or when we imperatively call
   *             `AccessibilityInfo.announceForAccessibility(msg)`.
   *             We fire that in a useEffect on mount (see below).
   *
   *   Both    — `accessibilityRole="alert"` for error/warning gives
   *             the item the right semantic weight in the a11y tree.
   *             The label combines title + description so screen
   *             readers get the full message in one utterance.
   * ------------------------------------------------------------- */
  const a11yRole = style.a11yRole === 'alert' ? ('alert' as const) : undefined;
  const a11yLiveRegion =
    style.a11yRole === 'alert' ? ('assertive' as const) : ('polite' as const);

  const a11yMessage = item.description
    ? `${item.title}. ${item.description}`
    : item.title;

  /**
   * iOS VoiceOver announcement.
   *
   * We check `isScreenReaderEnabled` first so we don't spam the
   * announcement queue when nobody's listening — the API is cheap
   * but a bounded queue is polite. On Android the live-region prop
   * already handles announcement, so we skip this branch.
   *
   * `queue: true` (iOS 13+) appends to the announcement queue instead
   * of interrupting whatever VoiceOver is currently speaking, which
   * matches the toast's non-blocking nature.
   */
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let cancelled = false;
    AccessibilityInfo.isScreenReaderEnabled().then(enabled => {
      if (cancelled || !enabled) return;
      AccessibilityInfo.announceForAccessibilityWithOptions(a11yMessage, {
        queue: true,
      });
    });
    return () => {
      cancelled = true;
    };
    // Announce once per item id. Title/description changes on the
    // SAME id (rare — only via replace-in-place) intentionally do
    // not re-announce, matching the visual "reset timer, keep row"
    // behaviour in the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const hasAction = item.action !== undefined;

  /* --- Body press ------------------------------------------------ */
  const onBodyPress = (): void => {
    if (hasAction) return; // action button owns dismissal in that case
    dismiss(item.id);
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        accessible
        accessibilityRole={a11yRole}
        accessibilityLiveRegion={a11yLiveRegion}
        accessibilityLabel={a11yMessage}
        style={[styles.card, animatedStyle]}
      >
        {/* Accent bar — carries variant colour without tinting the whole
            card, so descriptions remain legible on any background. */}
        <View style={[styles.accent, { backgroundColor: style.accent }]} />

        {/* Icon */}
        <View style={styles.iconWrap}>
          {item.kind === 'loading' ? (
            <Animated.View style={spinStyle}>
              <Icon size={20} color={style.accent} strokeWidth={2.25} />
            </Animated.View>
          ) : (
            <Icon size={20} color={style.accent} strokeWidth={2.25} />
          )}
        </View>

        {/* Text + action */}
        <TouchableOpacity
          activeOpacity={hasAction ? 1 : 0.7}
          onPress={onBodyPress}
          style={styles.body}
        >
          <Text
            style={styles.title}
            numberOfLines={2}
            ellipsizeMode="tail"
            allowFontScaling
          >
            {item.title}
          </Text>
          {item.description !== undefined && item.description.length > 0 && (
            <Text
              style={styles.description}
              numberOfLines={3}
              ellipsizeMode="tail"
              allowFontScaling
            >
              {item.description}
            </Text>
          )}
        </TouchableOpacity>

        {/* Action or close */}
        {hasAction ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={item.action!.label}
            onPress={() => invokeAction(item.id, item.action!.onPress)}
            style={styles.actionBtn}
            hitSlop={HIT_SLOP}
          >
            <Text style={[styles.actionText, { color: style.accent }]}>
              {item.action!.label}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            onPress={() => dismiss(item.id)}
            style={styles.closeBtn}
            hitSlop={HIT_SLOP}
          >
            <X size={16} color={Colors.iconSecondary} />
          </TouchableOpacity>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

/**
 * `React.memo` on identity of the item object. The store always
 * produces a NEW item object on any relevant change, so referential
 * equality is the right comparator — no need for a custom prop diff.
 */
export const ToastItemView = React.memo(ToastItemViewInner);

/* ================================================================
 * Styles
 * ================================================================ */

const HIT_SLOP = { top: 8, right: 8, bottom: 8, left: 8 } as const;

const styles = StyleSheet.create({
  card: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    overflow: 'hidden',
    paddingRight: Spacing.sm,
    ...(Shadows.md as ViewStyle),
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
  },
  iconWrap: {
    width: 40,
    paddingTop: Spacing.md,
    alignItems: 'center',
  },
  body: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingRight: Spacing.sm,
  },
  title: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  description: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actionBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    alignSelf: 'center',
  },
  actionText: {
    ...Typography.label,
    fontWeight: '600',
  },
  closeBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    alignSelf: 'flex-start',
  },
});
