/* eslint-disable no-void */
/**
 * ==================================================================
 * Bootstrap — Cold-start orchestrator
 * ==================================================================
 *
 * Two public phases:
 *
 *   resolveBootstrap()          — async work only, NO Redux writes.
 *                                 Runs in parallel with the splash
 *                                 animation. Never rejects.
 *   commitBootstrap(dispatch,r) — writes the result in ONE
 *                                 `bootstrapCompleted` dispatch, which
 *                                 flips `bootstrapped` and hands the
 *                                 app off to RootNavigator.
 *
 * SplashIntroScreen calls commit only after BOTH bootstrap has
 * resolved AND the intro animation has finished, so the splash is
 * never cut off mid-animation. `runBootstrap()` (resolve + commit)
 * remains for callers that have no splash to wait for.
 *
 * Dependency DAG:
 *
 *   ┌─ Firebase init (fire-and-forget, never blocks)
 *   │
 *   ├─ Keychain read ─────┐
 *   │                     ▼
 *   ├─ Cached config read → Axios is already usable (module singleton)
 *   │                     │
 *   │              ┌──────┴──────┐
 *   │              ▼             ▼
 *   │         Fetch fresh    Validate /me
 *   │         config (3s     (3s timeout,
 *   │         timeout,       fallback = provisional
 *   │         fallback =     if tokens exist,
 *   │         cached)        unauthenticated if not)
 *   │              │             │
 *   │              └─────┬───────┘
 *   ▼                    ▼
 * resolveBootstrap() returns { auth, appConfig }
 *                        ▼   (caller waits for splash animation)
 * commitBootstrap() → dispatch(bootstrapCompleted({ auth, appConfig }))
 *
 * NOTE ON ONBOARDING:
 *   `hasSeenOnboardingThisSession` is NO LONGER read from MMKV or
 *   included in the dispatch. Onboarding is now session-only — it
 *   shows on every cold start regardless of prior sessions. See
 *   appSlice.ts and RootNavigator.tsx.
 *
 * Rules that make this production-grade:
 *   1. Every network call has a timeout + fallback → cold-start never hangs.
 *   2. Independent steps run under Promise.all → total time ≈ max(step time).
 *   3. Bootstrap NEVER throws to the caller. On unexpected failure it
 *      resolves a "safe" state so the app opens on the Login screen.
 *   4. All results are written to Redux in ONE dispatch → RootNavigator
 *      swaps stacks exactly once, no flicker.
 * ==================================================================
 */

import type { AppDispatch } from '@store';
import { bootstrapCompleted } from '@store/slices/appSlice';
import { userReceived } from '@store/slices/userSlice';

import { withTimeout } from './timeouts';
import { initFirebase } from './steps/firebase';
import { readKeychainTokens } from './steps/keychain';
import {
  readCachedAppConfig,
  fetchFreshAppConfig,
  type AppConfig,
} from './steps/appConfig';
import { validateAuth, type AuthResolution } from './steps/auth';
import { identifyUser } from '@services/telemetry/identify';

// Tunables — keep here so ops can adjust without hunting through code.
const AUTH_VALIDATE_TIMEOUT_MS = 3_000;
const APP_CONFIG_TIMEOUT_MS = 3_000;

/**
 * Everything bootstrap resolved, ready to be committed to Redux.
 * Produced by `resolveBootstrap()`, consumed by `commitBootstrap()`.
 */
export type BootstrapResult = {
  appConfig: AppConfig;
  auth: AuthResolution;
};

/**
 * Phase 1–3 of the DAG: performs all async work and RETURNS the
 * result WITHOUT touching Redux.
 *
 * Splitting "resolve" from "commit" lets the caller (SplashIntroScreen)
 * decide WHEN the app leaves the splash. Previously bootstrap committed
 * as soon as it finished, which flipped `bootstrapped` and unmounted
 * the splash mid-animation, so the wordmark was cut off at a random
 * point depending on network speed.
 *
 * NEVER rejects. On unexpected failure it resolves with the same safe
 * fallback as before (cached config + unauthenticated → Login).
 */
export async function resolveBootstrap(): Promise<BootstrapResult> {
  try {
    // Fire-and-forget — telemetry init should never block boot.
    void initFirebase();

    // ── Phase 1: synchronous / cheap reads ──────────────────────
    const cachedConfig = readCachedAppConfig();

    // ── Phase 2: Keychain (fast, but async) ─────────────────────
    const tokens = await readKeychainTokens();

    // ── Phase 3: parallel network work ──────────────────────────
    // Both calls guarded by timeout + safe fallback. No hangs.
    const [configResult, authResult] = await Promise.all([
      withTimeout<AppConfig>(
        fetchFreshAppConfig(),
        APP_CONFIG_TIMEOUT_MS,
        cachedConfig,
      ),
      tokens
        ? withTimeout<AuthResolution>(
            validateAuth(),
            AUTH_VALIDATE_TIMEOUT_MS,
            { status: 'provisional' },
          )
        : Promise.resolve({
            ok: true as const,
            value: { status: 'unauthenticated' as const },
          }),
    ]);

    return { appConfig: configResult.value, auth: authResult.value };
  } catch {
    // Absolute last-resort fallback. Should be unreachable — every
    // step above catches its own errors — but if something explodes
    // synchronously we still open the app on Login rather than hang.
    return {
      appConfig: readCachedAppConfig(),
      auth: { status: 'unauthenticated' },
    };
  }
}

/**
 * Phase 4 of the DAG: writes the resolved result to Redux.
 *
 * Must be called EXACTLY ONCE per cold start (the caller guards this).
 * Dispatching `bootstrapCompleted` flips `bootstrapped`, which makes
 * RootNavigator swap the splash out.
 */
export function commitBootstrap(
  dispatch: AppDispatch,
  result: BootstrapResult,
): void {
  const { appConfig, auth } = result;

  // Order matters: hydrate the user slice BEFORE flipping
  // `bootstrapped`, so RootNavigator's first authenticated render
  // already sees state.user.profile populated. Otherwise the home
  // screen paints once with an empty greeting, then again with the
  // real name — the exact bug we saw as "Good afternoon, there".
  if (auth.status === 'authenticated') {
    dispatch(userReceived(auth.profile));
  }

  dispatch(bootstrapCompleted({ appConfig, auth }));

  if (auth.status === 'authenticated') {
    // Telemetry must never break the app's hand-off out of the splash.
    try {
      identifyUser({
        userId: auth.userId,
        role: auth.role,
        subRole: auth.subRole,
        entityId: auth.entityId,
      });
    } catch {
      // Swallow — analytics identity is best-effort.
    }
  }
}

/**
 * Resolve + commit in one call, with no animation gating.
 * Kept for callers that don't render a splash (e.g. tests).
 * SplashIntroScreen uses resolveBootstrap / commitBootstrap directly.
 */
export async function runBootstrap(dispatch: AppDispatch): Promise<void> {
  commitBootstrap(dispatch, await resolveBootstrap());
}
