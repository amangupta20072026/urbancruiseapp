// src/services/deeplinks/drain.ts

/**
 * ------------------------------------------------------------------
 * drain — resolve the pending deep-link against current app state
 * ------------------------------------------------------------------
 * Call this whenever ANY input changes that might unblock a
 * pending deep link:
 *
 *   - NavigationContainer `onReady`     (cold-start race)
 *   - Redux `bootstrapCompleted`         (bootstrap orchestrator done)
 *   - Redux `completeOnboarding`         (onboarding tapped through)
 *   - Redux `loginSuccess` / `reconcileAuth` (auth transitions)
 *   - After a fresh `stash()` from a new incoming URL / FCM tap
 *
 * The function is idempotent and cheap when there's nothing to
 * drain — safe to over-call.
 *
 * NAVIGATION HAND-OFF:
 *   The single cast to `never` when calling `navigate()` is
 *   confined here. Everywhere else in the app calls the fully
 *   typed overloads of `NavigationService.navigate`. Deep-link
 *   dispatch is inherently dynamic (screen chosen at runtime),
 *   which is why the boundary needs one cast.
 *
 * NESTED-NAVIGATOR MOUNT RACE:
 *   RTK's listener middleware fires SYNCHRONOUSLY after the
 *   reducer runs, before React commits the new render. At that
 *   instant, the role navigator (Customer / Vendor / …) has not
 *   yet mounted — even after commit, `React.lazy()` may still be
 *   loading its chunk. During that window `navigate('BookingDetail')`
 *   fails because the screen isn't registered in any currently
 *   mounted navigator.
 *
 *   `dispatchNavigate` polls the root navigation state and waits
 *   until the currently focused Root route has a populated `state`
 *   (i.e. the nested role navigator is mounted). Only then does
 *   it dispatch the navigate. See the schedule constants below
 *   for the backoff.
 * ------------------------------------------------------------------
 */

import { store } from '@store';
import { navigate, navigationRef } from '@navigation/NavigationService';
import { logError } from '@services/telemetry/logError';
import { toast } from '@services/toast';

import { peek, consume } from './pending';
import { gate, type GateContext } from './gate';
import { findCatalogEntryByKind } from './catalog';
import { targetToNavigatePayload, type NavigatePayload } from './toNavigate';
import type { DeepLinkTarget } from './schema';

/**
 * Drain the pending target, if any. Returns:
 *   - 'navigated'    — target was resolved & navigation dispatched
 *                       (dispatch itself is deferred — see below)
 *   - 'held'         — target is still pending (bootstrap, onboarding, auth)
 *   - 'denied'       — target was rejected; fallback dispatched
 *   - 'idle'         — nothing was pending
 */
export type DrainOutcome = 'navigated' | 'held' | 'denied' | 'idle';

export function drainPendingDeepLink(): DrainOutcome {
  const target = peek();
  console.log('[deeplink] drain called, target:', target?.kind ?? 'none');
  if (!target) return 'idle';

  const entry = findCatalogEntryByKind(target.kind);
  if (!entry) {
    // Orphan pending target with no catalog entry — a bug, not user
    // input. Drop it defensively and telemeter.
    consume();
    logError(new Error(`deeplink.drain.orphan_kind:${target.kind}`), {
      boundary: 'deeplink.drain',
    });
    return 'idle';
  }

  const ctx = readContext();
  const g = gate(entry, target, ctx);

  if (!g.ok && g.reason === 'not_bootstrapped') return 'held';
  if (!g.ok && g.reason === 'not_onboarded') return 'held';
  if (!g.ok && g.reason === 'not_authenticated') return 'held';

  // From here on, whether we navigate or fall back, we've made a
  // decision — consume the pending target.
  consume();

  if (!g.ok && g.reason === 'wrong_role') {
    dispatchFallback(g.fallback, ctx);
    return 'denied';
  }

  // Type-narrow to the ok branch.
  dispatchNavigate(g.target);
  return 'navigated';
}

/* ================================================================
 * Helpers
 * ================================================================ */

function readContext(): GateContext {
  const s = store.getState().app;
  return {
    bootstrapped: s.bootstrapped,
    hasSeenOnboardingThisSession: s.hasSeenOnboardingThisSession,
    isAuthenticated: s.isAuthenticated,
    userRole: s.userRole,
  };
}

/* ================================================================
 * Nested-navigator mount detection
 *
 * When RootNavigator conditionally renders CustomerFlow (say), the
 * root state's focused route has `name: 'CustomerFlow'`. If the
 * lazy chunk hasn't loaded yet, the Suspense fallback is showing —
 * no nested navigator exists, so `route.state` is undefined.
 *
 * Once React.lazy() resolves and CustomerNavigator mounts, the
 * nested navigator's state populates `route.state`. That's our
 * signal that navigate('BookingDetail', …) will find the screen.
 * ================================================================ */

function isNestedNavigatorMounted(): boolean {
  if (!navigationRef.isReady()) return false;
  const rootState = navigationRef.getRootState();
  if (!rootState || rootState.routes.length === 0) return false;
  const currentRoute = rootState.routes[rootState.index];
  return currentRoute?.state !== undefined;
}

/* ================================================================
 * Retry schedule
 *
 * On most devices the lazy chunk resolves within the first 100–200
 * ms. The long tail exists for cold cache and slow dev-bundle loads.
 * Total ceiling ≈ 6.85 s across 10 attempts — after which we give
 * up and telemeter, rather than spin forever.
 * ================================================================ */

const NAVIGATE_RETRY_DELAYS_MS = [
  50, 100, 150, 250, 400, 600, 800, 1000, 1500, 2000,
] as const;

function dispatchNavigate(target: DeepLinkTarget): void {
  const p = targetToNavigatePayload(target);
  attemptNavigate(p, 0);
}

function attemptNavigate(p: NavigatePayload, attempt: number): void {
  if (attempt >= NAVIGATE_RETRY_DELAYS_MS.length) {
    logError(new Error(`deeplink.navigate.timeout:${p.screen}`), {
      boundary: 'deeplink.drain',
    });
    console.log('[deeplink] navigate timeout for', p.screen);
    return;
  }

  const delay = NAVIGATE_RETRY_DELAYS_MS[attempt]!;

  setTimeout(() => {
    if (!isNestedNavigatorMounted()) {
      console.log(
        '[deeplink] nested navigator not mounted yet, retry',
        attempt + 1,
      );
      attemptNavigate(p, attempt + 1);
      return;
    }

    console.log(
      '[deeplink] nested navigator mounted, dispatching navigate to',
      p.screen,
    );

    // Boundary cast: navigate() is typed as the intersection of every
    // ParamList; the dynamic screen name doesn't narrow to one of them.
    if (p.params === undefined) {
      (navigate as (s: string) => void)(p.screen);
    } else {
      (navigate as (s: string, params: object) => void)(p.screen, p.params);
    }
  }, delay);
}

function dispatchFallback(
  fallback: DeepLinkTarget | undefined,
  _ctx: GateContext,
): void {
  // Telemeter regardless — a wrong-role tap is a signal worth
  // aggregating (misconfigured push, shared device, phishing link).
  logError(new Error('deeplink.gate.wrong_role'), {
    boundary: 'deeplink.gate',
    extra: { fallbackKind: fallback?.kind ?? null },
  });

  // User-facing surface: a single, non-blocking warning toast. Copy
  // is deliberately generic — we do NOT reveal which role the target
  // belonged to (that would leak account-type structure to whoever
  // sent the link). If the catalog declared a fallback, we surface
  // an action button that jumps there; otherwise the toast is
  // informational only and the user stays put.
  if (fallback) {
    toast.warning('That link is for a different account', {
      description: 'Open the section that applies to your account.',
      action: {
        label: 'Open',
        onPress: () => dispatchNavigate(fallback),
      },
    });
    return;
  }

  toast.warning('That link is for a different account', {
    description: 'Sign in with the matching account to open it.',
  });

  // Intentionally no implicit navigate('Home'): interrupting an
  // in-progress screen (e.g. a driver on a live trip) is worse than
  // leaving the user where they are with an explanatory toast.
}
