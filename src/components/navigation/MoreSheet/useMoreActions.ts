/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * useMoreActions — Behavior for MoreSheet items
 * ------------------------------------------------------------------
 * The single place that resolves a `MoreActionId` (from
 * moreMenuConfig.tsx) into a real side-effect: navigation, Redux
 * dispatch, logout, etc.
 *
 * WHY THIS EXISTS:
 *   - Keeps `moreMenuConfig.tsx` as pure data (safe for anyone to edit).
 *   - All behavior — navigation targets, redux actions, keychain
 *     clears — lives in ONE spot, so changes are easy to reason about.
 *   - New actions? Add to the switch. TypeScript's exhaustiveness
 *     check will warn if you forget to handle one.
 *
 * WIRING:
 *   - Uses the imperative `navigate()` helper from NavigationService,
 *     the same one already used by the axios refresh interceptor.
 *     Works from anywhere, including inside modals/sheets that sit
 *     outside the navigation stack. As of the typing widening in
 *     NavigationService, `navigate` accepts any route declared
 *     anywhere in the app — no `as never` casts needed.
 *   - Uses `useAppDispatch()` for redux (logout).
 *
 * ACTION RESULT CONTRACT (read before touching this file):
 *
 *   `run()` returns a discriminated result:
 *
 *     'navigated' — the action pushed a screen or triggered a role
 *                   flow swap. The tabs screen containing MoreSheet
 *                   will BLUR imminently. The parent (MoreSheet →
 *                   useMoreTabController) uses this signal to KEEP
 *                   the tab bar's "More is visually active" override
 *                   in place until the tabs screen actually blurs.
 *
 *     'inline'    — the action did NOT navigate (a no-op today, or a
 *                   toggle / modal / clipboard write). The tabs screen
 *                   will stay focused. The parent must release the
 *                   visual override immediately so the badge/notch
 *                   snaps back to the real active tab.
 *
 *   Every case in the switch MUST return one of these two values.
 *   The exhaustiveness check at the bottom keeps that honest.
 *
 * SHARED-SCREEN REGISTRATION STATUS:
 *   `Profile`, `Settings`, `NotificationCentre`, `Feedback` all live
 *   in `features/shared/*` and are meant to be reused by every role.
 *   For `navigate('Profile')` to actually push a screen, the current
 *   role's navigator must REGISTER that route with a component.
 *
 *   Currently registered in:
 *     - UC       ✅ (all four)
 *     - Customer ✅ (Profile, Settings, NotificationCentre; Feedback
 *                     is booking-scoped — see customer.feedback below)
 *     - Vendor   ❌ (Profile / Settings / Notifications / Feedback all
 *                     silently no-op)
 *     - Driver   ❌ (same as Vendor)
 *
 *   To wire a new role, mirror the ComingSoon-registration block used
 *   by UcNavigator / CustomerNavigator.
 * ------------------------------------------------------------------
 */

import { useCallback } from 'react';

import { navigate } from '@navigation/NavigationService';
import { useAppDispatch } from '@store/hooks';
import { logout } from '@store/slices/appSlice';
import { clearTokens } from '@services/storage/secureStorage';

import type { MoreActionId } from './moreMenuConfig';

/* -----------------------------------------------------------------
 * Public types
 * ----------------------------------------------------------------- */

/**
 * Outcome of running a More menu action. See the file header for the
 * full contract. Used by MoreSheet to decide whether to hold or
 * release the tab bar's visual "More active" override.
 */
export type MoreActionResult = 'navigated' | 'inline';

/* -----------------------------------------------------------------
 * Hook
 * ----------------------------------------------------------------- */

export function useMoreActions() {
  const dispatch = useAppDispatch();

  /**
   * `run` receives an actionId, executes the mapped behavior, and
   * returns whether the action navigated ('navigated') or stayed on
   * the current screen ('inline').
   *
   * Called by MoreSheet AFTER the sheet has finished dismissing, so
   * navigation animations don't fight the sheet's slide-out.
   */
  const run = useCallback(
    (actionId: MoreActionId): MoreActionResult => {
      switch (actionId) {
        /* ---- Shared (Profile / Settings / Notifications / Feedback / Support / Logout) ---- */
        case 'profile':
          navigate('Profile');
          return 'navigated';

        case 'notifications':
          navigate('NotificationCentre');
          return 'navigated';

        case 'support':
          // Support is registered in AuthParamList and in every role
          // stack. `navigate` (widened) resolves it against the
          // currently mounted tree.
          navigate('Support');
          return 'navigated';

        case 'feedback':
          navigate('Feedback');
          return 'navigated';

        case 'settings':
          navigate('Settings');
          return 'navigated';

        case 'logout':
          // Clear secure tokens first, then dispatch redux logout —
          // RootNavigator swaps to AuthFlow automatically. That swap
          // unmounts this whole role navigator, which triggers
          // useMoreTabController's useFocusEffect cleanup and releases
          // the override anyway. Return 'navigated' so the visual
          // override holds during the swap transition.
          void clearTokens();
          dispatch(logout());
          return 'navigated';

        /* ---- Customer ---- */
        case 'customer.referrals':
          navigate('Referrals');
          return 'navigated';

        case 'customer.feedback':
          // General customer feedback — decoupled from the booking-
          // scoped `Feedback` route (which requires a bookingId). The
          // More-sheet "Feedback" tile lands here; post-trip rating
          // uses the booking-scoped `Feedback` route independently.
          navigate('CustomerFeedback');
          return 'navigated';

        /* ---- Vendor ---- */
        case 'vendor.fleet':
        case 'vendor.drivers':
        case 'vendor.payouts':
        case 'vendor.maintenance':
        case 'vendor.reports':
          noop();
          return 'inline';

        /* ---- Driver ---- */
        case 'driver.routes':
        case 'driver.fuelLog':
        case 'driver.incidents':
        case 'driver.rewards':
          noop();
          return 'inline';

        /* ---- UC ---- */
        /**
         * The old Customers / Vendors / Drivers cases were folded into
         * a single Directory hub — a top-tabs screen at route
         * 'Directory'. The stack screens (CustomersList, VendorsList,
         * DriversList) are still registered in UcNavigator so deep
         * links keep working, but the More sheet only exposes the
         * Directory entry now.
         */
        case 'uc.directory':
          navigate('Directory');
          return 'navigated';

        case 'uc.payments':
          navigate('Payments');
          return 'navigated';

        case 'uc.issues':
          navigate('Issues');
          return 'navigated';

        case 'uc.performance':
          navigate('Performance');
          return 'navigated';

        default: {
          // Exhaustiveness check — if you add a new MoreActionId
          // without handling it here, TypeScript will error on this
          // line. That's intentional: it forces you to wire behavior
          // AND declare the result kind for every new item.
          const _exhaustive: never = actionId;
          void _exhaustive;
          return 'inline';
        }
      }
    },
    [dispatch],
  );

  return { run };
}

/* -----------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------- */

/** Placeholder for actions whose target screen doesn't exist yet. */
function noop(): void {
  // Intentionally empty.
}
