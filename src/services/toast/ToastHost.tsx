// src/services/toast/ToastHost.tsx

/**
 * ------------------------------------------------------------------
 * ToastHost — the single mounted stack of visible toasts
 * ------------------------------------------------------------------
 * Mount ONCE, near the root of the tree. Owns:
 *
 *   - Subscribing to the toast store via `useSyncExternalStore`.
 *   - Safe-area top inset (below the notch / Dynamic Island).
 *   - Enter / exit / reflow animations for the stack.
 *   - Absolute-positioned overlay so screens don't have to reserve
 *     space for it.
 *
 * MOUNT LOCATION (see App.tsx):
 *   Inside `SafeAreaProvider` (so it can read insets), OUTSIDE
 *   `NavigationContainer` (so it survives navigator crashes and
 *   sits above every mounted screen). It shares that level with
 *   the root `ErrorBoundary`.
 *
 * WHY NOT INSIDE NAVIGATIONCONTAINER:
 *   A screen inside the navigator can crash and unmount its
 *   subtree. Toasts announcing "Something went wrong" would go
 *   with it. Hosting above the container makes the toast surface
 *   the LAST thing to disappear.
 *
 * WHY NOT INSIDE A `Modal`:
 *   `Modal` on Android steals focus and interferes with the
 *   back button. Absolute positioning + `pointerEvents="box-none"`
 *   on the wrapper lets the underlying UI keep all input except
 *   inside toast rects.
 * ------------------------------------------------------------------
 */

import React, { useSyncExternalStore } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInUp,
  FadeOutUp,
  LinearTransition,
} from 'react-native-reanimated';

import { Spacing } from '@theme';
import { ToastItemView } from './ToastItemView';
import { getSnapshot, subscribe } from './store';

/**
 * Extra padding beneath the safe-area top inset. Feels right on
 * both notch and non-notch devices. On Android, `useSafeAreaInsets`
 * returns 0 for the top on most devices — this constant is what
 * keeps toasts off the status bar there.
 */
const TOP_GAP = 8;

/** Cap horizontal width for tablet / foldable inner display. */
const MAX_WIDTH = 480;

export const ToastHost: React.FC = () => {
  const items = useSyncExternalStore(subscribe, getSnapshot);
  const insets = useSafeAreaInsets();

  if (items.length === 0) return null;

  // Android status bar height fallback — SafeAreaProvider is
  // sometimes 0 on Android even when a status bar is visible.
  // Adding Platform-specific fudge is safer than trusting insets
  // alone here.
  const topOffset =
    (insets.top > 0 ? insets.top : Platform.OS === 'android' ? 24 : 0) +
    TOP_GAP;

  return (
    <View
      // `box-none` lets taps pass through everywhere except children.
      pointerEvents="box-none"
      style={[styles.overlay, { paddingTop: topOffset }]}
    >
      <View pointerEvents="box-none" style={styles.stack}>
        {items.map(item => (
          <Animated.View
            key={item.id}
            layout={LinearTransition.springify().damping(20).stiffness(200)}
            entering={FadeInUp.duration(220)}
            exiting={FadeOutUp.duration(180)}
            style={styles.itemWrap}
          >
            <ToastItemView item={item} />
          </Animated.View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    // Elevated above bottom sheets, modals inside the navigator, etc.
    // Value chosen to sit above @gorhom/bottom-sheet's default
    // portal (10) with headroom.
    zIndex: 9999,
    elevation: 9999,
  },
  stack: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: Spacing.lg,
  },
  itemWrap: {
    marginBottom: Spacing.xs,
  },
});
