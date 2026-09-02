/**
 * ------------------------------------------------------------------
 * Pending deep-link queue (module-scoped, transient)
 * ------------------------------------------------------------------
 * A deep link can arrive before the navigator is ready — most often
 * during cold-start from a push notification tap — or before the
 * user is authenticated. This queue holds ONE pending target and
 * survives only in memory: it is intentionally NOT persisted to
 * Redux / MMKV.
 *
 *   Why not Redux:
 *     Deep-link intent is ephemeral. Persisting it means a user
 *     who closes the app after a notification tap, then re-opens
 *     it hours later, gets thrown to the target of that old
 *     notification — surprising behaviour. Redux + redux-persist
 *     would also delay the drain until rehydration completes,
 *     adding a race with `onReady`.
 *
 *   Why not a queue of many:
 *     If the user taps two notifications in succession, the SECOND
 *     tap should win — that's their most recent intent. A queue
 *     would surface stale targets. `stash()` overwrites; the newest
 *     tap replaces any pending one.
 *
 *   Draining:
 *     `drain.ts` calls `peek()` first (non-destructive), checks the
 *     gate, and only `consume()`s when it actually navigates (or
 *     definitively cannot). This lets us call the drainer on every
 *     relevant state change without losing intent to a race.
 * ------------------------------------------------------------------
 */

import type { DeepLinkTarget } from './schema';

let pending: DeepLinkTarget | null = null;

/** Overwrite the pending target. Newest deep-link intent wins. */
export function stash(target: DeepLinkTarget): void {
  pending = target;
}

/** Read the pending target WITHOUT clearing it. */
export function peek(): DeepLinkTarget | null {
  return pending;
}

/** Read AND clear the pending target. */
export function consume(): DeepLinkTarget | null {
  const t = pending;
  pending = null;
  return t;
}

/** Test-only reset. Do not use in app code. */
export function __resetForTests(): void {
  pending = null;
}
