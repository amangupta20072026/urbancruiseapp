/* eslint-disable no-bitwise */
/**
 * ------------------------------------------------------------------
 * Idempotency-Key generator
 * ------------------------------------------------------------------
 * Used on POST /auth/otp/request. The server keeps a Redis snapshot
 * of the first response for every key it sees (TTL 24h) — a retry
 * that reuses the same key gets the same reply back, so a flaky
 * network cannot accidentally send two OTPs.
 *
 * A key is generated ONCE per user intent (one "Send OTP" tap =
 * one key), and reused for network-level retries of that same tap.
 * A different tap on the same screen must get a NEW key — otherwise
 * the server will short-circuit the second request as a replay.
 *
 * INVARIANT: whoever CALLS the mutation owns the key. Do NOT
 * generate the key inside the mutationFn — TanStack Query would
 * mint a fresh one on every internal retry, defeating the entire
 * point of idempotency.
 * ------------------------------------------------------------------
 */

/**
 * RFC 4122 v4 UUID.
 *
 * Prefer `crypto.randomUUID()` when the runtime exposes it (Hermes
 * on RN 0.86 + iOS 15+ / recent Androids do). Fall back to a
 * `Math.random`-based generator elsewhere — the goal here is
 * COLLISION RESISTANCE across a single install, not cryptographic
 * strength. Any 128-bit random value with 4-bit version/variant
 * fields set does the job.
 */
export function newIdempotencyKey(): string {
  const g = globalThis as typeof globalThis & {
    crypto?: { randomUUID?: () => string };
  };
  if (typeof g.crypto?.randomUUID === 'function') {
    return g.crypto.randomUUID();
  }
  return uuidV4Fallback();
}

/* -----------------------------------------------------------------
 * Fallback — Math.random-based v4 UUID.
 * ~64 bits of entropy in practice (JS RNG isn't cryptographic), but
 * for an idempotency key with a 24h server-side TTL that's plenty.
 * ----------------------------------------------------------------- */

function uuidV4Fallback(): string {
  // Template: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx  (14 = version 4,
  // y = 8/9/a/b per the spec's variant bits)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
