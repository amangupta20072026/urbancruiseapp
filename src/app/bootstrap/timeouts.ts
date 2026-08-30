/**
 * ------------------------------------------------------------------
 * Bootstrap — Timeout helpers
 * ------------------------------------------------------------------
 * Every networked bootstrap step MUST have a timeout so cold-start
 * never hangs on a bad network. If the timeout fires OR the promise
 * rejects, we resolve with a caller-supplied fallback (cached data,
 * provisional auth state, etc.) — the app opens; the fresh data
 * catches up later.
 *
 * TimeoutResult<T> discriminant:
 *   { ok: true,  value }                     → promise succeeded
 *   { ok: false, value, timedOut: true }     → timeout won the race
 *   { ok: false, value, timedOut: false }    → promise rejected
 *
 * `sleep(ms)` enforces a minimum splash duration so the animation
 * always looks intentional, even on fast devices where bootstrap
 * resolves in <200ms.
 * ------------------------------------------------------------------
 */

export type TimeoutResult<T> =
  | { ok: true; value: T }
  | { ok: false; value: T; timedOut: boolean };

/**
 * Race a promise against a timeout. If the timeout wins OR the
 * promise rejects, resolve with `fallback`. `timedOut` distinguishes
 * the two failure modes (useful for telemetry). The original promise
 * is NOT cancelled — axios has its own timeout, and abandoning the
 * promise is acceptable at bootstrap time.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<TimeoutResult<T>> {
  return new Promise(resolve => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ ok: false, value: fallback, timedOut: true });
    }, ms);

    promise
      .then(value => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ ok: true, value });
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        // On error, fall back — same policy as timeout.
        resolve({ ok: false, value: fallback, timedOut: false });
      });
  });
}

/** Awaitable delay. */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
