/**
 * ------------------------------------------------------------------
 * Screenshot / screen-capture protection service
 * ------------------------------------------------------------------
 * Thin wrapper around `react-native-capture-protection`. The rest of
 * the codebase touches THIS module, not the third-party API — that
 * way we can:
 *   - Swap libraries later without hunting call-sites.
 *   - Mock cleanly in tests.
 *   - Add telemetry / policy logic in one place.
 *
 * ------------------------------------------------------------------
 * PLATFORM SEMANTICS (what "block" actually means)
 * ------------------------------------------------------------------
 *
 * Android
 *   Sets WindowManager.LayoutParams.FLAG_SECURE. This is a HARD block
 *   enforced by the OS:
 *     - Screenshots (volume+power)       → black frame
 *     - Screen recording (built-in / 3rd)→ black frames
 *     - Media projection / casting       → blank
 *     - Recent-apps thumbnail            → blank card
 *   No app-level workaround exists on non-rooted Android.
 *
 * iOS
 *   No true equivalent to FLAG_SECURE. The library uses:
 *     - iOS 11+  Screen recording detection → overlay black view
 *     - iOS 13+  Screenshot prevention via a "secure text field"
 *                trick that makes the OS write black pixels
 *     - App switcher blur overlay (opt-in)
 *   Below iOS 13 there is NO prevention — only detection. We log
 *   detected screenshots via telemetry so ops can spot patterns.
 *
 * NOTHING protects against a physical camera pointed at the screen.
 *
 * ------------------------------------------------------------------
 * POLICY (per current product decision)
 * ------------------------------------------------------------------
 *   - Block is ON by default, app-wide.
 *   - Block runs in PRODUCTION ONLY. In development (__DEV__), the
 *     block is skipped entirely so screenshotting bugs, filing
 *     defect reports, and RN dev-menu screen recording all keep
 *     working. Consistency-in-dev was tried and reverted — the
 *     friction wasn't worth the parity.
 *   - Screens that need to allow screenshots opt in via
 *     `useAllowScreenshots()` — a focus-aware hook that restores the
 *     block on unmount / blur.
 *   - iOS screenshot events are logged silently to telemetry. No
 *     user-facing alert.
 * ------------------------------------------------------------------
 */

import { CaptureProtection } from 'react-native-capture-protection';
import { logError, logEvent } from '@services/telemetry';

/* Internal state — tracks whether the global block has been installed.
 * Idempotent by design; re-calling enableGlobalBlock is a no-op. */
let globalBlockInstalled = false;

/* Reference counter for allow() calls. Multiple screens can
 * simultaneously request "allow"; we only re-enable the block when
 * the LAST one releases. Without this, a modal + underlying screen
 * both calling allow/block would fight and leave state wrong.
 *
 * Invariant: allowCount >= 0 always. block() decrements; the guard
 * clamps at zero so a spurious block() cannot push us into a state
 * where the counter thinks nobody is allowed when they still are. */
let allowCount = 0;

/**
 * Install the app-wide capture block. Call ONCE, from App.tsx on
 * mount. Idempotent — subsequent calls are no-ops.
 *
 * On iOS this also installs a screenshot-detection listener that
 * forwards to telemetry (silent; no user-facing alert).
 */
export async function enableGlobalBlock(): Promise<void> {
  /* Skip protection in development so bug screenshots, RN dev menu
   * screen recording, and other dev workflows keep working. In
   * production this branch never runs and the block is fully active. */
  if (__DEV__ || globalBlockInstalled) return;
  globalBlockInstalled = true;

  try {
    // Prevent all three capture surfaces at once. See platform-semantics
    // block above for what each actually does on Android vs iOS.
    await CaptureProtection.prevent({
      screenshot: true,
      record: true,
      appSwitcher: true,
    });

    // iOS-only: subscribe to detected screenshots. Android's FLAG_SECURE
    // means screenshots never happen there, so a listener would never
    // fire. The library handles the platform gate internally — we just
    // register unconditionally.
    /* The listener callback receives a CaptureEventType enum value.
     * Rather than gate on a specific enum member (fragile if the
     * library adds new events), log every event that comes through
     * — the library only fires this when a capture actually happens.
     * Downstream telemetry can differentiate via the `eventType`
     * property if we later care to. */
    CaptureProtection.addListener(event => {
      logEvent('security.screenshot_detected', {
        eventType: String(event),
      });
    });
  } catch (err) {
    // Never let a native failure crash the app. If protection can't
    // be installed (rare — misconfigured native module), we surface
    // the error via telemetry but continue.
    logError(err, {
      boundary: 'Screenshot.enableGlobalBlock',
    });
  }
}

/**
 * Temporarily allow screenshots on the current screen.
 * Reference-counted — safe to call from nested components.
 *
 * Prefer the `useAllowScreenshots()` hook over this imperative API
 * unless you have a specific reason (e.g. a modal that toggles
 * mid-lifecycle). The hook handles cleanup automatically.
 */
export async function allow(): Promise<void> {
  allowCount += 1;
  // Only actually toggle the native state on the first allow. Nested
  // allows just bump the counter.
  if (allowCount === 1) {
    try {
      await CaptureProtection.allow();
    } catch (err) {
      // Roll back the counter so a failed allow doesn't leave us
      // permanently thinking someone allowed.
      allowCount -= 1;
      logError(err, { boundary: 'Screenshot.allow' });
    }
  }
}

/**
 * Release a previous allow() call. When the counter reaches zero,
 * the app-wide block is re-instated.
 *
 * Pairs 1:1 with allow(). A spurious block() (without a matching
 * allow()) is a no-op — safer than crashing.
 */
export async function block(): Promise<void> {
  if (allowCount === 0) return;
  allowCount -= 1;
  if (allowCount === 0) {
    try {
      await CaptureProtection.prevent({
        screenshot: true,
        record: true,
        appSwitcher: true,
      });
    } catch (err) {
      logError(err, { boundary: 'Screenshot.block' });
    }
  }
}

/**
 * Test-only reset. Clears both counters and the install flag so
 * unit / integration tests can start from a clean state.
 * DO NOT CALL FROM APP CODE.
 */
export function __resetForTests(): void {
  globalBlockInstalled = false;
  allowCount = 0;
}
