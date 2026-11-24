/* eslint-disable no-void */
/**
 * useCallerIdStatus — what the Caller ID screen shows: is it on, which
 * Android settings are missing, how many customers, when last synced.
 *
 * Read from the phone (CallerIdModule.getStatus), never from the server.
 * Re-read when the screen mounts, when the app comes back to the
 * foreground (the user may have just changed a setting in Android
 * Settings), and after every sync or clear.
 */
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { callerIdNative, type CallerIdNativeStatus } from '@/native/callerId';

import { onCallerIdChanged } from '../sync';

export function useCallerIdStatus() {
  const [status, setStatus] = useState<CallerIdNativeStatus | null>(null);

  const refresh = useCallback(async () => {
    const next = await callerIdNative.getStatus();
    setStatus(next);
    return next;
  }, []);

  useEffect(() => {
    void refresh();
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') void refresh();
    });
    const unsubscribe = onCallerIdChanged(() => {
      void refresh();
    });
    return () => {
      appState.remove();
      unsubscribe();
    };
  }, [refresh]);

  return { status, refresh };
}
