/* eslint-disable no-void */
/**
 * useCallerIdAutoSync — "sync when the app is opened" (product decision,
 * 23 Nov 2026). Mounted once by UcNavigator, which only renders after
 * the UC MPIN / fingerprint unlock, so this never runs while locked.
 *
 * Checks on mount and every time the app returns to the foreground.
 * syncCallerId() itself skips checks closer than five minutes apart, and
 * an unchanged list costs a 304 with no body.
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { syncCallerId } from '../sync';

export function useCallerIdAutoSync(): void {
  useEffect(() => {
    void syncCallerId();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void syncCallerId();
    });
    return () => subscription.remove();
  }, []);
}
