/* eslint-disable react-native/no-inline-styles */
/**
 * ==================================================================
 * MoreSheet — Production-Grade "More" Bottom Sheet
 * ==================================================================
 *
 * DESIGN INVARIANTS (do not violate):
 *
 *   1. DETERMINISTIC HEIGHT.
 *      Sheet snap point is computed statically from the menu-item
 *      count for the given role, using known layout constants.
 *      `enableDynamicSizing` is explicitly set to `false` below — in
 *      @gorhom/bottom-sheet v5 it defaults to `true`, which silently
 *      ignores `snapPoints` and grows the sheet to fit its content
 *      instead. Left at its default, that's exactly what caused the
 *      sheet to expand to full screen once a role's menu (e.g. UC's
 *      5 groups) grew taller than the 60% snap point. With it off,
 *      the sheet stays fixed at 60% and BottomSheetScrollView handles
 *      the overflow by scrolling internally, as intended.
 *      (Ref: https://gorhom.dev/react-native-bottom-sheet/dynamic-sizing)
 *
 *   2. IDEMPOTENT & RACE-SAFE IMPERATIVE API.
 *      `present()` / `dismiss()` are safe to call at any time in any
 *      order. All animation-phase transitions and user-intent queuing
 *      go through a pure reducer (`sheetReducer.ts`) with test
 *      coverage. If a call arrives mid-animation it's QUEUED and
 *      drained the moment the animation settles — animations are
 *      never interrupted, intents are never rejected. This is what
 *      makes the sheet survive rapid double-taps and the "tab bar
 *      and sheet visibility disagree" class of bug.
 *
 *   3. ACTIONS FIRE POST-DISMISS.
 *      When the user taps a menu item, we DO NOT navigate synchronously.
 *      Instead we stash the actionId, dismiss the sheet, and — inside
 *      the sheet's onDismiss callback (which fires only after the
 *      close animation has fully retired) — schedule the action via
 *      `requestAnimationFrame`. That gives React one frame to commit
 *      the `setIsMoreSheetOpen(false)` update from onChange(-1) and
 *      flush its passive effects (including CustomTabBar's shared
 *      value sync) BEFORE the destination screen mounts on top.
 *
 *   4. TAB BAR VISIBLE + INTERACTIVE.
 *      `bottomInset` = tab bar footprint. Sheet renders ABOVE the tab
 *      bar. Backdrop is contained within the sheet's inset container,
 *      so the tab bar stays undimmed and tappable (Option B UX).
 *
 *   5. ROLE-SCOPED CONTENT.
 *      Menu items come from `getMoreMenu(role)` — data only. Behavior
 *      lives in `useMoreActions.ts`. Neither depends on the other's
 *      internals.
 *
 *   6. VISUAL-OVERRIDE HANDOFF (bug-fix contract with parent).
 *      The tab bar's "More is visually active" state (owned by the
 *      parent via `overrideActiveIndex`) must persist THROUGH the
 *      handoff to the destination screen — NOT through the sheet's
 *      dismiss animation. Otherwise, for one frame between:
 *
 *        (a) onChange(-1) → parent flips isMoreSheetOpen false
 *        (b) requestAnimationFrame → run(action) dispatches navigate
 *        (c) destination screen mounts and covers the tab bar
 *
 *      the badge/notch springs back to the PRE-More tab (the tab that
 *      was visually active before the user tapped More — Dashboard,
 *      typically, since More's tabPress is preventDefaulted and never
 *      changes state.index). That produces the visible "wrong active
 *      tab flash" bug this contract exists to prevent.
 *
 *      Signalling model:
 *        - `onOpenChange(true)`         — sheet became visible.
 *        - `onDismissedWithoutAction()` — sheet closed AND no action
 *                                         will run (backdrop tap,
 *                                         swipe-down, hardware back,
 *                                         or an 'inline' action that
 *                                         did not navigate). Parent
 *                                         releases the override now.
 *        - `onOpenChange(false)` on its own means "sheet not visible"
 *          for logging/telemetry — it does NOT authorise the parent
 *          to release the override. Release is gated by either the
 *          tabs-screen blur (destination mounted) or the explicit
 *          `onDismissedWithoutAction` call above.
 *
 *      This split is what makes the visual state track the USER's
 *      intent (which tab they're going to) rather than the SHEET's
 *      lifecycle (a mechanical detail the user shouldn't perceive).
 * ==================================================================
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import type {
  BottomSheetBackdropProps,
  BottomSheetModal as BottomSheetModalType,
} from '@gorhom/bottom-sheet';

import { Colors, Spacing, Typography } from '@theme';
import {
  MORE_GROUP_LABEL,
  MORE_GROUP_ORDER,
  getMoreMenu,
  groupMoreMenu,
  type MoreActionId,
  type MoreGroup,
  type MoreItem,
  type MoreRole,
} from './moreMenuConfig';
import { useMoreActions } from './useMoreActions';
import {
  INITIAL_SHEET_STATE,
  reduceSheet,
  type SheetEvent,
  type SheetState,
} from './sheetReducer';

/* =================================================================
 * Public ref API
 * ================================================================= */

export type MoreSheetRef = {
  /**
   * Request the sheet to open. Idempotent and race-safe: if the
   * sheet is currently animating (opening or closing) the intent is
   * queued and executed as soon as the in-flight animation settles.
   * See `sheetReducer.ts` for the full state machine.
   */
  present: () => void;
  /**
   * Request the sheet to close. Same semantics as `present`: safe to
   * call at any time in any order, queues if mid-animation.
   */
  dismiss: () => void;
};

type Props = {
  role: MoreRole;
  /**
   * Fires when the sheet transitions between visually open and closed.
   * Informational only — does NOT authorise releasing the tab bar
   * visual override. See invariant #6 in the file header.
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * Fires when the sheet has closed AND no navigation is coming.
   * Cases:
   *   - Backdrop tap.
   *   - Swipe-down / handle-drag close.
   *   - Hardware back on Android.
   *   - Menu-item tap whose action returned 'inline' (did not navigate).
   *
   * The parent (useMoreTabController) uses this as the signal to
   * release the tab bar's "More visually active" override. See
   * invariant #6.
   */
  onDismissedWithoutAction?: () => void;
  /**
   * Space below the sheet (tab bar footprint). Sheet renders above
   * this inset; tab bar stays visible and interactive underneath.
   */
  bottomInset?: number;
};

/* =================================================================
 * Utilities
 * ================================================================= */

const withAlpha = (hex: string, alpha: number): string => {
  const clamped = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  const suffix = clamped.toString(16).padStart(2, '0');
  return `${hex}${suffix}`;
};

/* =================================================================
 * Component
 * ================================================================= */

const MoreSheet = forwardRef<MoreSheetRef, Props>(
  ({ role, onOpenChange, onDismissedWithoutAction, bottomInset = 0 }, ref) => {
    const sheetRef = useRef<BottomSheetModalType>(null);
    const items = useMemo(() => getMoreMenu(role), [role]);
    const grouped = useMemo(() => groupMoreMenu(items), [items]);
    const { run } = useMoreActions();

    /* ---------------------------------------------------------------
     * Snap point — fixed 60% of screen, modal-style.
     * ---------------------------------------------------------------- */
    const snapPoints = useMemo(() => ['60%'], []);

    /* ---------------------------------------------------------------
     * Intent-queue state machine.
     *
     * All animation-phase and user-intent transitions go through
     * `dispatch()` → `reduceSheet()` (pure, tested). Side-effects
     * that the reducer requests ('call_present' / 'call_dismiss')
     * are applied here by calling into gorhom's imperative API.
     *
     * The core invariant this fixes:
     *   - Animations are NEVER interrupted mid-flight (both attempts
     *     to do so — the original "allow reverse" and the later
     *     "reject during animation" — produced their own bugs).
     *   - User intents are NEVER rejected. If one arrives during an
     *     animation, it's queued and drained the moment the animation
     *     settles.
     *
     * See `sheetReducer.ts` for the full transition table and
     * `__tests__/sheetReducer.test.ts` for the scenario coverage.
     * ---------------------------------------------------------------- */
    const stateRef = useRef<SheetState>(INITIAL_SHEET_STATE);
    const pendingActionRef = useRef<MoreActionId | null>(null);

    /**
     * Watchdog — arms whenever we transition into a transient phase
     * ('opening' or 'closing') and fires if we don't hear back from
     * gorhom within a generous budget. Guards against silent native-
     * side drops (rare, but observed when the app is backgrounded
     * mid-animation). When it fires we hard-reset state.
     */
    const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const clearWatchdog = useCallback(() => {
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
    }, []);

    /**
     * Dispatch is defined via ref so it can call itself recursively
     * (a settle event whose side effect calls back into the machine)
     * without needing to close over its own identity — and so all
     * memoized callbacks (openMoreListeners, handleChange, …) can
     * capture a stable reference.
     */
    const dispatchRef = useRef<(event: SheetEvent) => void>(() => {});
    dispatchRef.current = (event: SheetEvent): void => {
      const { state: next, sideEffect } = reduceSheet(stateRef.current, event);
      stateRef.current = next;

      // Watchdog lifecycle mirrors phase transitions.
      if (next.phase === 'opening' || next.phase === 'closing') {
        clearWatchdog();
        watchdogRef.current = setTimeout(() => {
          if (__DEV__) {
            console.log(
              '[MoreSheet] Animation watchdog fired — forcing RESET. ' +
                'Sheet was stuck in phase=%s for >2s. This usually means ' +
                'gorhom dropped an onChange callback (backgrounded mid-anim?).',
              next.phase,
            );
          }
          dispatchRef.current({ type: 'RESET' });
        }, 2000);
      } else {
        clearWatchdog();
      }

      // Apply side effects. These call back into gorhom which will
      // eventually fire onChange, producing another dispatch.
      if (sideEffect === 'call_present') {
        sheetRef.current?.present();
      } else if (sideEffect === 'call_dismiss') {
        sheetRef.current?.dismiss();
      }
    };

    /* ---------------------------------------------------------------
     * Idempotent imperative API — thin adapter over dispatch.
     * ---------------------------------------------------------------- */
    useImperativeHandle(
      ref,
      () => ({
        present: () => dispatchRef.current({ type: 'PRESENT' }),
        dismiss: () => dispatchRef.current({ type: 'DISMISS' }),
      }),
      [],
    );

    /* ---------------------------------------------------------------
     * Latest-callback refs.
     *
     * `onDismissedWithoutAction` is invoked from inside `handleDismiss`
     * and from the unmount cleanup below. Both paths need the LATEST
     * callback identity even though the containing memoised functions
     * intentionally have stable deps. Ref-in-effect pattern keeps the
     * memoisation and the freshness both correct.
     * ---------------------------------------------------------------- */
    const onDismissedWithoutActionRef = useRef(onDismissedWithoutAction);
    useEffect(() => {
      onDismissedWithoutActionRef.current = onDismissedWithoutAction;
    }, [onDismissedWithoutAction]);

    const onOpenChangeRef = useRef(onOpenChange);
    useEffect(() => {
      onOpenChangeRef.current = onOpenChange;
    }, [onOpenChange]);

    /* ---------------------------------------------------------------
     * Cleanup on unmount — if the sheet unmounts while animating
     * (rare, but happens on logout / role swap), force-clear internal
     * state and signal the parent BOTH channels:
     *
     *   - onOpenChange(false): mirror the visible state.
     *   - onDismissedWithoutAction(): explicitly release the visual
     *     override. Unmount is terminal — there is no action pending
     *     that will ever run, so the parent must not stay "waiting
     *     for blur." Without this, a logout while the sheet is
     *     open-and-animating leaves isMoreSheetOpen / keepMoreVisual-
     *     Active in the parent as `true` forever (until the parent
     *     also unmounts, which does happen for logout — but not for
     *     every unmount path we might add later).
     * ---------------------------------------------------------------- */
    useEffect(() => {
      return () => {
        clearWatchdog();
        pendingActionRef.current = null;
        dispatchRef.current({ type: 'RESET' });
        onOpenChangeRef.current?.(false);
        onDismissedWithoutActionRef.current?.();
      };
      // Empty deps — cleanup fires ONLY on unmount. Refs above give
      // us the latest callbacks without needing them in the dep list.
    }, [clearWatchdog]);

    /* ---------------------------------------------------------------
     * Backdrop — dims content above the sheet.
     *
     * CRITICAL BUG FIX (per @gorhom/bottom-sheet source + issue #2680):
     *
     *   The default BottomSheetBackdrop is `StyleSheet.absoluteFill`
     *   inside the sheet's Portal container. The Portal container is
     *   ALWAYS full-screen — `bottomInset` on BottomSheetModal only
     *   insets the sheet's snap position, NOT the backdrop's bounds.
     *
     *   So even though the sheet visually sits above the tab bar,
     *   the backdrop still covers the tab bar area with
     *   `pointerEvents='auto'` + `pressBehavior='close'`, meaning:
     *     - Taps on the tab bar area hit the BACKDROP, not the bar.
     *     - Backdrop closes the sheet; navigation is never called.
     *     - Result: user thinks the app "returns to previous tab"
     *       when actually navigation just never fired.
     *
     * FIX: Constrain the backdrop's bottom edge to end at
     * `bottomInset`. Below that, no backdrop → the tab bar
     * receives its own touches directly.
     * ---------------------------------------------------------------- */
    const backdropStyle = useMemo(
      () => ({ bottom: bottomInset }),
      [bottomInset],
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.45}
          pressBehavior="close"
          style={backdropStyle}
        />
      ),
      [backdropStyle],
    );

    /* ---------------------------------------------------------------
     * Item tap handler.
     *
     * Sequence:
     *   1. Stash actionId in ref.
     *   2. Dispatch DISMISS — the reducer decides whether to call
     *      sheet.dismiss() now (if opened) or queue it (if opening).
     *   3. handleChange fires with -1 → reducer transitions to closed.
     *   4. handleDismiss runs the stashed action AFTER interactions
     *      settle → no animation clash, no orphan sheet.
     * ---------------------------------------------------------------- */
    const handleItemPress = useCallback((item: MoreItem) => {
      pendingActionRef.current = item.actionId;
      dispatchRef.current({ type: 'DISMISS' });
    }, []);

    /* ---------------------------------------------------------------
     * onChange — authoritative source for phase settle events. Fires
     * when gorhom's internal animation reaches an integer snap index
     * (0 = opened, -1 = closed). Feeds the reducer with SETTLED_*
     * events which drive both phase transitions and the drain-on-
     * settle logic for queued intents.
     *
     * We also mirror the visible state to the parent via onOpenChange.
     * IMPORTANT: this only signals "sheet is visible" — release of the
     * tab bar's visual override is gated on handleDismiss (which knows
     * whether an action was pending).
     * ---------------------------------------------------------------- */
    const handleChange = useCallback(
      (index: number) => {
        if (index >= 0) {
          dispatchRef.current({ type: 'SETTLED_OPEN' });
          onOpenChange?.(true);
        } else {
          dispatchRef.current({ type: 'SETTLED_CLOSED' });
          onOpenChange?.(false);
        }
      },
      [onOpenChange],
    );

    /* ---------------------------------------------------------------
     * onDismiss — runs after the sheet is fully offscreen. Safe time
     * to dispatch navigation / redux side-effects.
     *
     * Branches:
     *
     *   (a) No pending action — user cancelled (backdrop tap /
     *       swipe / handle drag / hardware back). No navigation will
     *       fire, so we RELEASE the visual override immediately:
     *       badge/notch springs back to the real active tab, which
     *       is the correct behaviour for a cancellation.
     *
     *   (b) Pending action, ran and returned 'navigated' — a screen
     *       is about to mount. We do NOT call
     *       onDismissedWithoutAction; the visual override is held by
     *       the parent until the tabs screen blurs (destination
     *       mounted). This prevents the pre-More tab from flashing
     *       as active for the intermediate frame.
     *
     *   (c) Pending action, ran and returned 'inline' — action did
     *       not navigate (e.g. placeholder no-op). Tabs won't blur,
     *       so we must release the override manually, right after
     *       the action ran.
     *
     * The action itself still runs inside `requestAnimationFrame` so
     * React can commit the preceding onChange(-1) →
     * `setIsMoreSheetOpen(false)` update and flush its passive
     * effects before the destination screen mounts. See the
     * companion comment in CustomTabBar for the other half of the
     * animation-timing story.
     * ---------------------------------------------------------------- */
    const handleDismiss = useCallback(() => {
      // Note: `phase` has already been set to 'closed' by the
      // preceding SETTLED_CLOSED dispatch from handleChange. This
      // callback only owns the pending-action side of things.
      onOpenChange?.(false);

      const action = pendingActionRef.current;
      pendingActionRef.current = null;

      if (!action) {
        // Cancellation path (a). No navigation coming — release override.
        onDismissedWithoutAction?.();
        return;
      }

      // Menu-item path. Defer by one frame so React commits the
      // pre-dispatch state before we push the destination screen.
      requestAnimationFrame(() => {
        const result = run(action);
        if (result === 'inline') {
          // Path (c). No blur will happen. Release the override so
          // the tab bar snaps back to the real active tab.
          onDismissedWithoutAction?.();
        }
        // Path (b) — 'navigated': intentionally do nothing. The
        // parent's useFocusEffect blur cleanup will release the
        // override once the destination screen mounts and the tabs
        // screen blurs.
      });
    }, [onOpenChange, onDismissedWithoutAction, run]);

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        index={0}
        bottomInset={bottomInset}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.background}
        onChange={handleChange}
        onDismiss={handleDismiss}
        enablePanDownToClose
        stackBehavior="replace"
        enableOverDrag={false}
        enableDynamicSizing={false}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {MORE_GROUP_ORDER.map(group => {
            const groupItems = grouped[group];
            if (groupItems.length === 0) return null;
            return (
              <MoreSection
                key={group}
                group={group}
                items={groupItems}
                onItemPress={handleItemPress}
              />
            );
          })}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

MoreSheet.displayName = 'MoreSheet';

export default MoreSheet;

/* =================================================================
 * Section — memoized so unrelated re-renders don't rebuild the grid.
 * ================================================================= */

const MoreSection: React.FC<{
  group: MoreGroup;
  items: MoreItem[];
  onItemPress: (item: MoreItem) => void;
}> = React.memo(({ group, items, onItemPress }) => (
  <View style={styles.section}>
    <Text style={styles.sectionLabel}>
      {MORE_GROUP_LABEL[group].toUpperCase()}
    </Text>
    <View style={styles.grid}>
      {items.map(item => (
        <MenuCell key={item.key} item={item} onPress={onItemPress} />
      ))}
    </View>
  </View>
));
MoreSection.displayName = 'MoreSection';

/* =================================================================
 * Menu Cell
 * ================================================================= */

const MenuCell: React.FC<{
  item: MoreItem;
  onPress: (item: MoreItem) => void;
}> = React.memo(({ item, onPress }) => {
  const { Icon, label, color, group } = item;
  const isLogout = item.actionId === 'logout';

  const handlePress = useCallback(() => onPress(item), [item, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        style={[styles.iconCircle, { backgroundColor: withAlpha(color, 0.12) }]}
      >
        <Icon color={color} size={22} strokeWidth={2} />
      </View>
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          isLogout && { color: Colors.error, fontWeight: '600' },
          group === 'support' && !isLogout && styles.labelSubtle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
});
MenuCell.displayName = 'MenuCell';

/* =================================================================
 * Styles
 * ================================================================= */

const CIRCLE_SIZE = 52;

const styles = StyleSheet.create({
  background: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
  handle: {
    backgroundColor: Colors.border,
    width: 44,
    height: 5,
  },

  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.xs,
  },
  cell: {
    width: '33.333%',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
  },
  cellPressed: {
    opacity: 0.6,
  },
  iconCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  label: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '500',
    textAlign: 'center',
  },
  labelSubtle: {
    color: Colors.textSecondary,
  },
});
