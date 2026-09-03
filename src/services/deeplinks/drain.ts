// src/services/deeplinks/drain.ts

/**
 * ------------------------------------------------------------------
 * drain — resolve the pending deep-link against current app state
 * ------------------------------------------------------------------
 * Call this whenever ANY input changes that might unblock a
 * pending deep link:
 *
 *   - NavigationContainer `onReady`     (cold-start race)
 *   - Redux `isAuthenticated` transition (login completes)
 *   - Redux `userRole` transition        (post-bootstrap role reveal)
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
 * ------------------------------------------------------------------
 */

import { store } from '@store';
import { navigate } from '@navigation/NavigationService';
import { logError } from '@services/telemetry/logError';
import { toast } from '@services/toast';

import { peek, consume } from './pending';
import { gate, type GateContext } from './gate';
import { findCatalogEntryByKind } from './catalog';
import { targetToNavigatePayload } from './toNavigate';
import type { DeepLinkTarget } from './schema';

/**
 * Drain the pending target, if any. Returns:
 *   - 'navigated'    — target was resolved & navigation dispatched
 *   - 'held'         — target is still pending (bootstrap or auth)
 *   - 'denied'       — target was rejected; fallback dispatched
 *   - 'idle'         — nothing was pending
 */
export type DrainOutcome = 'navigated' | 'held' | 'denied' | 'idle';

export function drainPendingDeepLink(): DrainOutcome {
  const target = peek();
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
    isAuthenticated: s.isAuthenticated,
    userRole: s.userRole,
  };
}

function dispatchNavigate(target: DeepLinkTarget): void {
  const p = targetToNavigatePayload(target);
  // Boundary cast: navigate() is typed as the intersection of every
  // ParamList; the dynamic screen name doesn't narrow to one of them.
  // Runtime is safe — NavigationService.navigate is a no-op when the
  // container isn't ready or the route isn't currently mounted.
  if (p.params === undefined) {
    (navigate as (s: string) => void)(p.screen);
  } else {
    (navigate as (s: string, params: object) => void)(p.screen, p.params);
  }
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
