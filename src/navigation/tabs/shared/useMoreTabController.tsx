/**
 * ==================================================================
 * useMoreTabController — shared controller for role-specific tab
 * navigators that host the More bottom sheet.
 * ==================================================================
 *
 * SHEET / NAVIGATION CONTRACT (must not be violated):
 *   One-way data flow:  user tap → sheet reacts.
 *
 *   The signal we react to is React Navigation's `tabPress` event,
 *   NOT a change in `state.index`. React Navigation v7 guarantees
 *   `tabPress` fires on every tap of a tab — including the tab that
 *   is already focused — which is the exact case that was broken
 *   when the previous observer watched `state.index` (re-tapping the
 *   focused tab produces no index change, so the sheet never
 *   dismissed and the tap was swallowed). See docs:
 *   https://reactnavigation.org/docs/bottom-tab-navigator/#tabpress
 *
 *   1. Non-More tabs have NO per-screen tabPress listener. When
 *      tapped, react-navigation navigates normally.
 *   2. The More tab's per-screen listener (`openMoreListeners`)
 *      preventDefaults and calls `moreSheetRef.current?.present()`.
 *      That is the ONLY place the sheet is opened. The sheet's
 *      intent-queue reducer (`MoreSheet/sheetReducer.ts`) guarantees
 *      this call always eventually results in the sheet being visible
 *      — even if it lands mid-animation.
 *   3. `screenListeners.tabPress` on the Tab.Navigator is attached
 *      to every screen. For each firing it inspects the tapped
 *      route's name; if it is NOT the More tab, it dismisses the
 *      sheet. Dismiss is idempotent (guarded by the same reducer),
 *      so it is safe when the sheet is already closed.
 *
 * ------------------------------------------------------------------
 * VISUAL-OVERRIDE STATE MODEL (bug fix — READ BEFORE EDITING):
 * ------------------------------------------------------------------
 *
 * The tab bar's "More is visually active" state is tracked by
 * `keepMoreVisualActive`, NOT by `isMoreSheetOpen`. These two are
 * deliberately DIFFERENT concerns:
 *
 *   isMoreSheetOpen         — is the sheet currently visible on screen?
 *                              Used for logging / potential future UI.
 *   keepMoreVisualActive    — should the tab bar render the badge/notch
 *                              on the More tab? Owned by USER INTENT,
 *                              not sheet lifecycle.
 *
 * WHY THE SPLIT (the bug this fixes):
 *
 *   Symptom: User taps More on the Dashboard tab, taps a menu item.
 *   Between the sheet finishing its dismiss animation and the
 *   destination screen mounting on top, the tab bar's badge / notch
 *   springs back to the Dashboard tab for one frame — showing the
 *   Dashboard icon in the floating badge and blanking the Dashboard
 *   slot (icon-in-badge, slot-empty is how CustomTabBar draws the
 *   ACTIVE tab). The user briefly sees "went back to Dashboard"
 *   before the real destination screen mounts.
 *
 *   Root cause: React Nav v7's `tabPress` for More is
 *   `e.preventDefault()`'d in `openMoreListeners`, so `state.index`
 *   never changes when the user opens More. If the tab bar's visual
 *   override is tied to `isMoreSheetOpen`, then the moment the sheet
 *   dismisses (onChange(-1) → setIsMoreSheetOpen(false)) the tab
 *   bar's `activeIndex` falls back to `state.index` — which is still
 *   pointing at Dashboard because the More press was prevented.
 *   Navigation to the destination screen only dispatches ONE FRAME
 *   later (via requestAnimationFrame inside handleDismiss), so
 *   there's a mandatory ~1-frame window where the tab bar is
 *   "correctly" showing Dashboard — but the user is on their way
 *   to a different screen and reads it as a bug.
 *
 * FIX:
 *
 *   Track `keepMoreVisualActive` separately. It becomes `true` when
 *   the sheet opens, and STAYS true until one of these:
 *
 *     (A) The tabs screen blurs (destination mounted on top). The
 *         useFocusEffect cleanup below clears it — but by then the
 *         destination screen covers the tab bar, so the visual
 *         change is unobservable.
 *
 *     (B) MoreSheet fires `onDismissedWithoutAction`, which happens
 *         on backdrop tap / swipe down / hardware back / any menu
 *         item whose action returned 'inline'. In those cases there
 *         is no navigation coming, and releasing the override is the
 *         correct behaviour: badge springs back to the real active
 *         tab, which is where the user actually is.
 *
 *   `onOpenChange(false)` on its own does NOT release the override —
 *   sheet visibility and visual-override lifecycle are decoupled by
 *   design. See MoreSheet.tsx invariant #6 for the contract from
 *   the other side.
 *
 * ------------------------------------------------------------------
 * FOCUS RECONCILIATION (self-healing invariant):
 * ------------------------------------------------------------------
 *   When the tabs screen loses focus (a stack push from anywhere in
 *   the app — including a menu-item navigate), we force-close the
 *   sheet AND clear both `isMoreSheetOpen` and `keepMoreVisualActive`.
 *   That is the (A) path above.
 *
 *   On re-focus (user pops back), the initial focus run does the same
 *   idempotent close/clear. Combined with the UI-thread reaction
 *   inside CustomTabBar, this guarantees that after ANY navigation
 *   the next focus of the tabs screen lands with the notch at the
 *   real active tab.
 *
 * WHY A HOOK — role scalability:
 *   Every role-specific tab navigator (UcTabs, CustomerTabs,
 *   VendorTabs, DriverTabs, ...future) needs identical plumbing:
 *   stable refs, memoised handlers, the MoreSheet element, and a
 *   custom tab bar renderer that reacts to sheet-open state.
 *   Duplicating that across roles is how bugs like the one this
 *   file exists to fix get reintroduced. Centralising it into
 *   `useMoreTabController(role)` collapses each tab file to a
 *   screen list plus one hook call.
 *
 *   Adding a fifth role becomes:
 *
 *     const {
 *       screenOptions, screenListeners, openMoreListeners,
 *       renderTabBar, MoreSheetElement,
 *     } = useMoreTabController('newRole');
 *
 * ==================================================================
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';

import {
  CustomTabBar,
  useTabBarFootprint,
} from '@components/navigation/CustomTabBar';
import {
  MoreSheet,
  type MoreSheetRef,
  type MoreRole,
} from '@components/navigation/MoreSheet';

import { MORE_ROUTE_NAME } from './routeNames';

/* -----------------------------------------------------------------
 * Public surface
 * ----------------------------------------------------------------- */

/**
 * Minimal shape of the `route` object we need. We deliberately don't
 * import RouteProp<...> here because this hook is role-agnostic and
 * each caller's ParamList is different; a structural type keeps the
 * hook reusable while still catching the common typo (`.name`).
 */
type TabRouteMinimal = { name: string };

export type MoreTabController = {
  /** Spread as `screenOptions` on the Tab.Navigator. */
  screenOptions: { headerShown: false; freezeOnBlur: false };
  /** Pass as `screenListeners` on the Tab.Navigator. Dismisses the sheet on any non-More tabPress. */
  screenListeners: (args: { route: TabRouteMinimal }) => {
    tabPress: () => void;
  };
  /** Pass as `listeners` on the More `<Tab.Screen>`. preventDefaults + presents the sheet. */
  openMoreListeners: {
    tabPress: (e: { preventDefault: () => void }) => void;
  };
  /** Pass as `tabBar` on the Tab.Navigator. */
  renderTabBar: (props: BottomTabBarProps) => React.ReactElement;
  /**
   * Render as a SIBLING of the Tab.Navigator (typically inside a
   * fragment: `<><Tab.Navigator … />{MoreSheetElement}</>`).
   * The hook owns the ref used by the listeners above, so this
   * element MUST be mounted for the listeners to have any effect.
   */
  MoreSheetElement: React.ReactElement;
};

/* -----------------------------------------------------------------
 * Hook
 * ----------------------------------------------------------------- */

export function useMoreTabController(role: MoreRole): MoreTabController {
  const moreSheetRef = useRef<MoreSheetRef>(null);
  const bottomInset = useTabBarFootprint();

  /**
   * Sheet-is-visible mirror. Informational — safe to consume from
   * anywhere in the tree, but see the file header: this does NOT
   * drive the tab bar's visual override.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);

  /**
   * Tab bar's "render badge/notch on the More tab" flag. Set true
   * on sheet open, cleared on either:
   *   - blur cleanup (destination mounted), or
   *   - MoreSheet's onDismissedWithoutAction (no navigation coming).
   * See the VISUAL-OVERRIDE STATE MODEL section in the file header
   * for the full lifecycle.
   */
  const [keepMoreVisualActive, setKeepMoreVisualActive] = useState(false);

  const screenOptions = useMemo(
    () => ({
      headerShown: false as const,
      /**
       * freezeOnBlur DISABLED — do not re-enable without testing rapid
       * tab switching. Under high-frequency taps (<200ms apart),
       * react-freeze's freeze/thaw cycle races with react-navigation's
       * focus transitions and leaves tab subtrees paused after re-focus,
       * rendering blank content. See <link to your bug tracker issue>.
       * Re-enable only after react-freeze issue is fixed, or after
       * migrating to react-native-screens' native-side freezing.
       */
      freezeOnBlur: false as const,
    }),
    [],
  );

  /* ---------------------------------------------------------------
   * More tab press — preventDefault + present sheet. Also arms the
   * visual override so the badge/notch slides to More.
   *
   * IMPORTANT: We unconditionally set `keepMoreVisualActive = true`
   * BEFORE calling present(). The sheet's intent-queue reducer
   * (`MoreSheet/sheetReducer.ts`) guarantees this present() intent
   * will eventually execute — either now (if the sheet is closed) or
   * queued and drained when any in-flight animation settles. The
   * visual override therefore always reflects the user's LATEST
   * intent, which is what the tab bar should show.
   * ---------------------------------------------------------------- */
  const openMoreListeners = useMemo(
    () => ({
      tabPress: (e: { preventDefault: () => void }) => {
        e.preventDefault();
        setKeepMoreVisualActive(true);
        moreSheetRef.current?.present();
      },
    }),
    [],
  );

  /* ---------------------------------------------------------------
   * Sheet-open mirror. Only tracks visibility — does NOT touch the
   * visual-override flag. See file header.
   * ---------------------------------------------------------------- */
  const handleOpenChange = useCallback((open: boolean) => {
    setIsMoreSheetOpen(open);
    // Intentionally not touching setKeepMoreVisualActive here.
    // Its lifecycle is governed by open (via openMoreListeners) and
    // by release (via handleDismissedWithoutAction / focus blur).
  }, []);

  /* ---------------------------------------------------------------
   * MoreSheet signals this when the sheet closed WITHOUT navigation:
   * user backdrop-tapped, swiped down, pressed hardware back, or
   * tapped a menu item whose action returned 'inline'. That's our
   * cue to release the visual override — the user isn't going
   * anywhere, so the badge/notch should snap back to the real
   * active tab immediately.
   * ---------------------------------------------------------------- */
  const handleDismissedWithoutAction = useCallback(() => {
    setKeepMoreVisualActive(false);
  }, []);

  /* ---------------------------------------------------------------
   * Non-More tab press → dismiss sheet. Presenter's tab (More) is
   * exempted so present() and dismiss() cannot fire for the same tap.
   * ---------------------------------------------------------------- */
  const screenListeners = useCallback(
    ({ route }: { route: TabRouteMinimal }) => ({
      tabPress: () => {
        // Presenter's territory — do not touch. Any dismiss here
        // would race with openMoreListeners.present() and collapse
        // the sheet instantly on every open.
        if (route.name === MORE_ROUTE_NAME) return;
        // Non-More tap dismisses the sheet AND releases the override,
        // because navigation to a sibling tab is imminent and the
        // badge should already be moving toward the newly-tapped tab.
        moreSheetRef.current?.dismiss();
        setKeepMoreVisualActive(false);
      },
    }),
    [],
  );

  /* ---------------------------------------------------------------
   * Focus reconciliation — see file header. The blur cleanup path
   * is what releases the visual override when a menu-item tap
   * navigates to a stack-pushed screen (customer detail, profile,
   * etc.). By the time this fires, the destination screen has
   * mounted on top of the tabs screen, so clearing the override is
   * unobservable — no wrong-tab flash.
   * ---------------------------------------------------------------- */
  useFocusEffect(
    useCallback(() => {
      // On focus: ensure everything is in a known-clean state. If we
      // just popped back from a menu-item destination, the override
      // has already been cleared by blur. This is defence in depth
      // against deep-link / notification-driven entries that may
      // land here with the sheet already presenting.
      moreSheetRef.current?.dismiss();
      setIsMoreSheetOpen(false);
      setKeepMoreVisualActive(false);

      return () => {
        // On blur: destination mounted. Clear everything.
        moreSheetRef.current?.dismiss();
        setIsMoreSheetOpen(false);
        setKeepMoreVisualActive(false);
      };
    }, []),
  );

  const renderTabBar = useCallback(
    (props: BottomTabBarProps): React.ReactElement => {
      // Derive the More tab's index from the live navigation state
      // instead of hardcoding it. If tabs are reordered or a role
      // uses a different layout, this stays correct with no edits.
      const moreIndex = props.state.routes.findIndex(
        r => r.name === MORE_ROUTE_NAME,
      );
      return (
        <CustomTabBar
          {...props}
          role={role}
          // NOTE: this reads keepMoreVisualActive, NOT isMoreSheetOpen.
          // That decoupling is what fixes the "wrong active tab flash
          // between sheet dismiss and destination screen mount" bug.
          // See the VISUAL-OVERRIDE STATE MODEL section in the file
          // header before changing this line.
          overrideActiveIndex={
            keepMoreVisualActive && moreIndex >= 0 ? moreIndex : undefined
          }
        />
      );
    },
    [keepMoreVisualActive, role],
  );

  const MoreSheetElement = (
    <MoreSheet
      ref={moreSheetRef}
      role={role}
      bottomInset={bottomInset}
      onOpenChange={handleOpenChange}
      onDismissedWithoutAction={handleDismissedWithoutAction}
    />
  );

  return {
    screenOptions,
    screenListeners,
    openMoreListeners,
    renderTabBar,
    MoreSheetElement,
  };
}
