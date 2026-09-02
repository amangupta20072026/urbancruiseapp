/**
 * ------------------------------------------------------------------
 * Deep-link drain listener
 * ------------------------------------------------------------------
 * The pending deep-link queue holds intent that arrived before the
 * app could act on it — most often a link tapped while the user was
 * on the auth flow. The gate returns `not_bootstrapped` or
 * `not_authenticated` in that window; the drainer needs to be
 * re-invoked when either input changes so the held target can fire.
 *
 * This listener is the ONLY drain trigger for Redux state
 * transitions. Two other trigger points exist and are intentionally
 * kept separate so responsibility is obvious at each site:
 *
 *   - `App.tsx`                → cold-start drain via
 *                                 NavigationContainer's `onReady`
 *   - `deeplinks.handleResolved` → drain immediately after a fresh
 *                                 stash from an incoming URL or FCM
 *                                 tap
 *
 * Together they cover every input that could unblock a pending
 * target.
 *
 * Change detection:
 *   We compare previous vs current state and only drain when a
 *   field the gate actually reads (`bootstrapped`,
 *   `isAuthenticated`, `userRole`) has changed. This keeps the
 *   listener idempotent without waking the gate on every unrelated
 *   app-slice edit.
 *
 * Logout:
 *   A separate listener clears the pending queue on `logout`. A
 *   target stashed under the previous identity must never fire
 *   after a fresh login as a different user.
 *
 * Typing note:
 *   We type `startAppListening` via `TypedStartListening` rather
 *   than `withTypes({ state, dispatch })`. The object form of
 *   `withTypes` is unreliable across RTK 2.x minor versions and
 *   can leak the config shape into `getOriginalState()`'s return
 *   type. The `TypedStartListening` cast is the pattern the RTK
 *   docs used before `withTypes` shipped and remains fully
 *   equivalent at runtime.
 * ------------------------------------------------------------------
 */

import {
  createListenerMiddleware,
  isAnyOf,
  type TypedStartListening,
} from '@reduxjs/toolkit';

import {
  bootstrapCompleted,
  loginSuccess,
  reconcileAuth,
  logout,
} from '@store/slices/appSlice';
import { drainPendingDeepLink } from '@services/deeplinks/drain';
import { clear as clearPendingDeepLink } from '@services/deeplinks/pending';

import type { RootState, AppDispatch } from '@store';

/* ================================================================
 * Middleware
 * ================================================================ */

export const deeplinkListenerMiddleware = createListenerMiddleware();

type AppStartListening = TypedStartListening<RootState, AppDispatch>;

const startAppListening =
  deeplinkListenerMiddleware.startListening as AppStartListening;

/* ================================================================
 * Drain on any auth / role / bootstrap transition.
 *
 * Fires after the reducer has run, so `getState()` reflects the
 * new values the gate will read.
 * ================================================================ */

startAppListening({
  matcher: isAnyOf(bootstrapCompleted, loginSuccess, reconcileAuth),
  effect: (_action, api) => {
    const prev = api.getOriginalState().app;
    const next = api.getState().app;

    const changed =
      prev.bootstrapped !== next.bootstrapped ||
      prev.isAuthenticated !== next.isAuthenticated ||
      prev.userRole !== next.userRole;

    if (changed) {
      drainPendingDeepLink();
    }
  },
});

/* ================================================================
 * On logout, drop any stashed target.
 *
 * It was for the previous identity and would be wrong to fire
 * after the next login as a different user.
 * ================================================================ */

startAppListening({
  actionCreator: logout,
  effect: () => {
    clearPendingDeepLink();
  },
});
