/**
 * ------------------------------------------------------------------
 * useServiceMode — segmented control state for the Home header
 * ------------------------------------------------------------------
 * "Car & Bus Rental" vs "Spiritual Tour" — a visual filter on the
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

const DEFAULT_MODE: ServiceMode = 'car_bus';

export function useServiceMode(initial: ServiceMode = DEFAULT_MODE) {
  const [mode, setMode] = useState<ServiceMode>(initial);

  const change = useCallback((next: ServiceMode) => {
    /* No-op if the same mode is re-selected — avoids a wasted
     * re-render on the accidental double-tap. */
    setMode(prev => (prev === next ? prev : next));
    /* Future analytics hook:
     *   if (next !== previous) logEvent('home.service_mode_changed', { next });
     * Wired via useEffect(prev, next) diff when we care. */
  }, []);

  return { mode, change };
}
