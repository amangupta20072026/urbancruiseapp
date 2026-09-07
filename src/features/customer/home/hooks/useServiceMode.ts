/**
 * ------------------------------------------------------------------
 * useServiceMode — segmented control state for the Home header
 * ------------------------------------------------------------------
 * "Car & Bus Rental" vs "Spiritual Tours" — a visual filter on the
 * same underlying product (Q2 confirmed with product). This hook
 * owns the local state.
 *
 * Extracted as a hook (rather than inline useState) for two reasons:
 *   1. When we later persist the last-selected mode across app
 *      restarts (a natural next iteration), MMKV read/write is a
 *      one-line change here — every consumer keeps the same API.
 *   2. Adds a stable place for analytics (log-on-toggle) without
 *      cluttering the screen file.
 * ------------------------------------------------------------------ */

import { useCallback, useState } from 'react';

import type { ServiceMode } from '../types';
import { logEvent } from '@services/telemetry/logEvent';

const DEFAULT_MODE: ServiceMode = 'car_bus';

export function useServiceMode(initial: ServiceMode = DEFAULT_MODE) {
  const [mode, setMode] = useState<ServiceMode>(initial);

  const change = useCallback((next: ServiceMode) => {
    // Firing inside the functional updater guarantees the event
    // only emits when prev !== next — matches the "no-op on
    // accidental double-tap" contract without a separate diff hook.
    setMode(prev => {
      if (prev === next) return prev;
      logEvent('home.service_mode_changed', { mode: next });
      return next;
    });
  }, []);

  return { mode, change };
}
