// src/services/toast/store.ts

/**
 * ------------------------------------------------------------------
 * Toast store — module-scoped, subscribable, timer-owning
 * ------------------------------------------------------------------
 * A tiny observable store, exposed to React via `useSyncExternalStore`
 * and to the imperative API via plain function calls. NOT Redux —
 * same reasoning as `services/deeplinks/pending.ts`:
 *
 *   1. Toasts are transient UI state. Persisting them across cold
 *      starts (which redux-persist would do) would surface stale
 *      messages after a kill.
 *   2. Toasts must be dispatchable from non-React code — axios
 *      interceptors, TanStack Query onError, deep-link drainer.
 *      A module singleton is the shortest path.
 *   3. Every listener update must be O(1). A Redux round-trip through
 *      the reducer + subscription tree is fine, but overkill for a
 *      surface where callers fire during error storms.
 *
 * INVARIANTS the store enforces:
 *   - At most MAX_VISIBLE items live at once. Overflow drops the
 *     OLDEST — the most recent intent always wins.
 *   - Duplicate `(kind, title, description)` within DEDUP_WINDOW_MS
 *     resets the existing item's timer instead of pushing a new one.
 *     Prevents error-storm spam.
 *   - Every item has at most one live timer. `dismiss(id)`,
 *     `dismissAll()`, and item replacement always clear the previous
 *     timer before scheduling the new one — no orphan setTimeouts.
 *   - `show()` returns the id even for dedup hits, so callers can
 *     rely on the return value.
 *
 * TESTING contract:
 *   - `_resetForTests()` wipes state + timers so a `beforeEach` can
 *     restore a clean slate. Never called outside jest.
 * ------------------------------------------------------------------
 */

import { DEFAULT_DURATION_MS } from './variantConstants';
import type { ToastId, ToastItem, ToastKind, ToastOptions } from './types';

/* ================================================================
 * Tunables
 *
 * If a call site "needs" these tweaked, that's a design conversation.
 * Kept as module constants (not props) precisely so no call site can
 * override them ad-hoc.
 * ================================================================ */

const MAX_VISIBLE = 3;
const DEDUP_WINDOW_MS = 1500;

/* ================================================================
 * State
 *
 * `items` is the readonly snapshot returned by `getSnapshot()`.
 * Every mutation produces a NEW array reference so React's
 * `useSyncExternalStore` fires and shallow-equal libraries don't
 * miss the change.
 * ================================================================ */

let items: readonly ToastItem[] = [];

/**
 * Listeners for state changes. A Set gives O(1) add / remove and
 * dedup for pathological double-subscribes.
 */
const listeners = new Set<() => void>();

/**
 * Auto-dismiss timers, keyed by toast id. Never persisted to state —
 * timer handles are non-serialisable and belong beside the store,
 * not inside it.
 */
const timers = new Map<ToastId, ReturnType<typeof setTimeout>>();

/**
 * Monotonic counter behind `nextId()`. Cheap and collision-free
 * within a single JS realm.
 */
let idCounter = 0;

/* ================================================================
 * ID generation
 * ================================================================ */

function nextId(): ToastId {
  idCounter += 1;
  return `t${idCounter.toString(36)}`;
}

/* ================================================================
 * Subscription (useSyncExternalStore contract)
 * ================================================================ */

/** Subscribe. Returns an unsubscribe function. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Read the current items. React expects reference equality. */
export function getSnapshot(): readonly ToastItem[] {
  return items;
}

function emit(): void {
  // Snapshot into an array first — a listener could unsubscribe
  // during iteration, which would corrupt the Set traversal.
  const ls = Array.from(listeners);
  for (const l of ls) {
    try {
      l();
    } catch {
      // A subscriber that throws must not kill sibling subscribers.
      // The React reconciler already handles its own render errors;
      // here we simply refuse to propagate.
    }
  }
}

/* ================================================================
 * Timer helpers
 * ================================================================ */

function clearTimer(id: ToastId): void {
  const t = timers.get(id);
  if (t) {
    clearTimeout(t);
    timers.delete(id);
  }
}

function scheduleTimer(id: ToastId, ms: number): void {
  // Guard against Infinity (pinned) and non-finite / non-positive
  // values — those imply "don't auto-dismiss".
  if (!Number.isFinite(ms) || ms <= 0) return;
  clearTimer(id);
  timers.set(
    id,
    setTimeout(() => {
      timers.delete(id);
      dismiss(id);
    }, ms),
  );
}

/* ================================================================
 * Dedup lookup
 *
 * We match on `(kind, title, description)` because that's the
 * user-visible identity of a toast. Two calls with the same
 * (kind, title) but different descriptions are legitimately
 * different messages.
 * ================================================================ */

function findDedupTarget(
  kind: ToastKind,
  title: string,
  description: string | undefined,
  now: number,
): ToastItem | undefined {
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i]!;
    if (
      it.kind === kind &&
      it.title === title &&
      it.description === description &&
      now - it.createdAt <= DEDUP_WINDOW_MS
    ) {
      return it;
    }
  }
  return undefined;
}

/* ================================================================
 * Duration resolution
 *
 * A caller-provided duration wins EXCEPT `0` (interpreted as
 * "use the variant default" for ergonomic reasons — callers who
 * pass `0` almost always mean "leave it alone"). `Infinity` pins.
 * Anything else, if finite and non-negative, is respected.
 * ================================================================ */

function resolveDuration(
  kind: ToastKind,
  requested: number | undefined,
): number {
  if (requested === undefined) return DEFAULT_DURATION_MS[kind];
  if (requested === 0) return DEFAULT_DURATION_MS[kind];
  if (requested === Infinity) return Infinity;
  if (!Number.isFinite(requested) || requested < 0) {
    return DEFAULT_DURATION_MS[kind];
  }
  return requested;
}

/* ================================================================
 * Public mutations
 * ================================================================ */

/**
 * Create or replace a toast.
 *
 * If `opts.id` is provided AND matches an existing item, that item
 * is replaced in place (kind, title, description, action, timer).
 * This is how `toast.promise` swaps a loading toast for a success
 * or error one without a visible flicker.
 *
 * If `opts.id` is absent, a new id is minted, unless a dedup match
 * exists within the window — in which case the existing item's
 * timer is reset and its id is returned unchanged.
 */
export function show(
  kind: ToastKind,
  title: string,
  opts: ToastOptions = {},
): ToastId {
  const now = Date.now();
  const description = opts.description;
  const action = opts.action;
  const timeoutMs = (() => {
    const d = resolveDuration(kind, opts.duration);
    return d === Infinity ? null : d;
  })();

  /* --- Replace-in-place path (explicit id) --------------------- */
  if (opts.id !== undefined) {
    const existingIdx = items.findIndex(i => i.id === opts.id);
    if (existingIdx >= 0) {
      const replaced: ToastItem = {
        id: opts.id,
        kind,
        title,
        description,
        action,
        createdAt: now,
        timeoutMs,
      };
      const next = items.slice();
      next[existingIdx] = replaced;
      items = next;
      clearTimer(opts.id);
      if (timeoutMs !== null) scheduleTimer(opts.id, timeoutMs);
      emit();
      return opts.id;
    }
    // Fall through to insert with the requested id.
  }

  /* --- Dedup path ---------------------------------------------- */
  const dedup = findDedupTarget(kind, title, description, now);
  if (dedup) {
    // Reset the timer; keep the item where it is in the stack.
    if (dedup.timeoutMs !== null) scheduleTimer(dedup.id, dedup.timeoutMs);
    return dedup.id;
  }

  /* --- Insert new ---------------------------------------------- */
  const id = opts.id ?? nextId();
  const item: ToastItem = {
    id,
    kind,
    title,
    description,
    action,
    createdAt: now,
    timeoutMs,
  };

  let next = items.concat(item);

  // Overflow: drop oldest until we're at MAX_VISIBLE. `slice()`
  // above already produced a new array, so we mutate it freely.
  while (next.length > MAX_VISIBLE) {
    const dropped = next.shift();
    if (dropped) clearTimer(dropped.id);
  }

  items = next;
  if (timeoutMs !== null) scheduleTimer(id, timeoutMs);
  emit();
  return id;
}

/**
 * Dismiss a specific toast. Safe to call for an id that no longer
 * exists — a no-op. Clears any live timer for that id.
 */
export function dismiss(id: ToastId): void {
  clearTimer(id);
  const idx = items.findIndex(i => i.id === id);
  if (idx < 0) return;
  const next = items.slice(0, idx).concat(items.slice(idx + 1));
  items = next;
  emit();
}

/** Dismiss every visible toast and cancel every pending timer. */
export function dismissAll(): void {
  if (items.length === 0 && timers.size === 0) return;
  for (const [, t] of timers) clearTimeout(t);
  timers.clear();
  items = [];
  emit();
}

/* ================================================================
 * Test hook
 *
 * The store owns two pieces of side-effectful state (the array and
 * the timer map) plus a monotonic counter. Tests need a total wipe
 * between cases; production code has no legitimate reason to call
 * this. The underscore prefix + name should be enough of a fence.
 * ================================================================ */

export function _resetForTests(): void {
  for (const [, t] of timers) clearTimeout(t);
  timers.clear();
  items = [];
  idCounter = 0;
  // Note: we do NOT drop listeners — a test may subscribe first,
  // reset state, then assert emissions. Callers who want a truly
  // clean slate can also re-import in a fresh module registry.
}
