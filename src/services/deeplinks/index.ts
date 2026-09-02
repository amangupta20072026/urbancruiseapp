/**
 * ------------------------------------------------------------------
 * Deep-links — public surface
 * ------------------------------------------------------------------
 * Callers outside this folder should ONLY reach in through this
 * barrel. Internal helpers (matchPath, allow-lists, pending queue)
 * are intentionally not re-exported.
 *
 *   handleResolved     — call after a resolver produced ok = true.
 *                        Stashes the target and drains against
 *                        the current app state.
 *   handleUrl          — string URL entry (share intents, custom
 *                        callers). The linking config already
 *                        covers OS-delivered URLs; this exists for
 *                        programmatic use.
 *   handleFcmClick     — bridge for FCM data payloads.
 *   buildLinkingConfig — for App.tsx wiring.
 *   drainPendingDeepLink — for onReady + Redux subscriptions.
 * ------------------------------------------------------------------
 */

import { logError } from '@services/telemetry/logError';

import { resolveUrl, resolveFcmClick, type ResolveResult } from './resolve';
import { stash } from './pending';
import { drainPendingDeepLink } from './drain';

export { buildLinkingConfig } from './linkingConfig';
export { drainPendingDeepLink } from './drain';
export type { DeepLinkTarget, DeepLinkKind } from './schema';

/* ================================================================
 * handleResolved
 * ================================================================ */

export function handleResolved(r: ResolveResult): void {
  if (!r.ok) {
    logError(new Error(`deeplink.resolve.${r.reason}`), {
      boundary: 'deeplink.entry',
    });
    return;
  }
  stash(r.target);
  drainPendingDeepLink();
}

/* ================================================================
 * handleUrl — for programmatic callers (share intents, tests)
 * ================================================================ */

export function handleUrl(url: string): void {
  handleResolved(resolveUrl(url));
}

/* ================================================================
 * handleFcmClick — bridge for FCM data payloads
 *
 * The FCM handler layer in `services/notifications/deeplink.ts`
 * imports this. Kept in the barrel so the two folders have exactly
 * one edge between them.
 * ================================================================ */

export function handleFcmClick(clickJson: string | undefined): void {
  handleResolved(resolveFcmClick(clickJson));
}
