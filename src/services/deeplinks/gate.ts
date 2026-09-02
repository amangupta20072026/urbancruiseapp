/**
 * ------------------------------------------------------------------
 * Deep-link gate — session & role gating
 * ------------------------------------------------------------------
 * Pure function. Given a catalog entry, a target, and a context
 * snapshot (bootstrapped / auth / role), returns a `GateResult`
 * that tells the drainer exactly what to do.
 *
 * FOUR OUTCOMES:
 *
 *   ok                     → navigate now
 *   not_bootstrapped       → keep stashed; the container's `onReady`
 *                            will drain
 *   not_authenticated      → keep stashed; the drainer's Redux
 *                            subscription will fire again on
 *                            `isAuthenticated: true`
 *   wrong_role             → CONSUME the pending target; navigate
 *                            to fallback (or role home) and surface
 *                            a toast — the user needs a signal that
 *                            their link went somewhere sensible
 *
 * The gate NEVER navigates. It only decides. The caller (`drain.ts`)
 * chooses `stash / consume / navigate`. This separation keeps this
 * module trivially testable — pass in a synthetic context, get a
 * deterministic result.
 * ------------------------------------------------------------------
 */

import type { UserRole } from '@rbac/roles';
import type { DeepLinkTarget } from './schema';
import type { CatalogEntry } from './catalog';

/* ================================================================
 * Context
 * ================================================================ */

export type GateContext = {
  bootstrapped: boolean;
  isAuthenticated: boolean;
  userRole: UserRole | null;
};

/* ================================================================
 * Results
 * ================================================================ */

export type GateOk = {
  ok: true;
  target: DeepLinkTarget;
};

export type GateHold = {
  ok: false;
  reason: 'not_bootstrapped' | 'not_authenticated';
  target: DeepLinkTarget;
};

export type GateDeny = {
  ok: false;
  reason: 'wrong_role';
  target: DeepLinkTarget;
  /** Preferred fallback declared by the catalog entry, if any. */
  fallback: DeepLinkTarget | undefined;
};

export type GateResult = GateOk | GateHold | GateDeny;

/* ================================================================
 * gate()
 * ================================================================ */

export function gate(
  entry: CatalogEntry,
  target: DeepLinkTarget,
  ctx: GateContext,
): GateResult {
  // Bootstrap MUST complete before we know identity — hold.
  if (!ctx.bootstrapped) {
    return { ok: false, reason: 'not_bootstrapped', target };
  }

  // Auth is required and user is not authenticated — hold.
  if (entry.auth === 'authenticated' && !ctx.isAuthenticated) {
    return { ok: false, reason: 'not_authenticated', target };
  }

  // Any-role entries are always allowed once auth passes.
  if (entry.role === 'any') {
    return { ok: true, target };
  }

  // Role-scoped entries: current role must match.
  if (entry.role !== ctx.userRole) {
    return {
      ok: false,
      reason: 'wrong_role',
      target,
      fallback: entry.fallback,
    };
  }

  return { ok: true, target };
}
