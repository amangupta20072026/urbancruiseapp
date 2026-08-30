/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * useAllowScreenshots — screen-level opt-in for capture allowance
 * ------------------------------------------------------------------
 * The primary API screens use to enable screenshots on themselves.
 * Focus-aware: allowance is active only while the screen is FOCUSED,
 * so backgrounding the app or navigating to another screen restores
 * the app-wide block automatically. That's what makes this safe by
 * default — screens can't accidentally leave the block off.
 *
 * Usage:
 *
 *   function BookingReceiptScreen() {
 *     useAllowScreenshots();
 *     return <ReceiptContent />;
 *   }
 *
 * That single line: allows screenshots while the receipt screen is
 * focused; re-blocks the moment the user navigates away or
 * backgrounds the app. No cleanup call needed.
 *
 * ------------------------------------------------------------------
 * WHY useFocusEffect and not useEffect
 * ------------------------------------------------------------------
 * React Navigation keeps previous screens MOUNTED under the current
 * one (unless unmountOnBlur is set). A plain useEffect would allow
 * screenshots for the receipt screen and NEVER release when the user
 * pushes another screen on top — the receipt is still mounted, just
 * not focused. Using useFocusEffect ties the allowance to visibility,
 * which is what the user actually cares about.
 * ------------------------------------------------------------------
 */

import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { allow, block } from './screenshot';

/**
 * Allows screenshots on the calling screen while it is focused.
 *
 * Optional `enabled` param lets a screen toggle its own allowance
 * based on internal state — e.g. a "share receipt" mode. Defaults
 * to `true` so bare calls are the common case.
 */
export function useAllowScreenshots(enabled: boolean = true): void {
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return undefined;

      // Fire the allow but don't await — useFocusEffect callbacks
      // are synchronous. The underlying native toggle is fast (< 5ms)
      // and any transient failure is swallowed by the service.
      void allow();

      // Cleanup: fires on blur (navigation away) AND on unmount.
      return () => {
        void block();
      };
    }, [enabled]),
  );
}
