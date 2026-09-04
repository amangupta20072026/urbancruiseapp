/* eslint-disable no-void */
/**
 * ==================================================================
 * runBootstrap — Cold-start orchestrator
 * ==================================================================
 *
 * Runs in parallel with the splash animation. Resolves once every
 * bootstrap dependency has either succeeded or fallen back safely.
 * Dispatches ONE final action (`bootstrapCompleted`) that flips the
 * `bootstrapped` flag and hands the app off to RootNavigator's
 * conditional branches.
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
 * dispatch(bootstrapCompleted({ auth, appConfig }))
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
 *      dispatches a "safe" state so the app opens on the Login screen.
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

// Tunables — keep here so ops can adjust without hunting through code.
const AUTH_VALIDATE_TIMEOUT_MS = 3_000;
const APP_CONFIG_TIMEOUT_MS = 3_000;

export async function runBootstrap(dispatch: AppDispatch): Promise<void> {
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

    // ── Phase 4: commit ─────────────────────────────────────────
    // Order matters: hydrate the user slice BEFORE flipping
    // `bootstrapped`, so RootNavigator's first authenticated render
    // already sees state.user.profile populated. Otherwise the home
    // screen paints once with an empty greeting, then again with the
    // real name — the exact bug we saw as "Good afternoon, there".
    if (authResult.value.status === 'authenticated') {
      dispatch(userReceived(authResult.value.profile));
    }
    dispatch(
      bootstrapCompleted({
        appConfig: configResult.value,
        auth: authResult.value,
      }),
    );
  } catch {
    // Absolute last-resort fallback. Should be unreachable — every
    // step above catches its own errors — but if something explodes
    // synchronously we still open the app on Login rather than hang.
    dispatch(
      bootstrapCompleted({
        appConfig: readCachedAppConfig(),
        auth: { status: 'unauthenticated' },
      }),
    );
  }
}
