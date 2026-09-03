// src/services/toast/variantConstants.ts

/**
 * ------------------------------------------------------------------
 * Toast — variant behaviour constants (no view deps)
 * ------------------------------------------------------------------
 * Split out from `variantStyles.ts` so the store can read the
 * default duration and a11y role without pulling in
 * `lucide-react-native`, `react-native`, or the theme. This keeps
 * store unit tests renderer-free.
 *
 * The view module (`variantStyles.ts`) re-uses these values so
 * durations stay defined in exactly one place.
 * ------------------------------------------------------------------
 */

import type { ToastKind } from './types';

/**
 * Default auto-dismiss in ms per variant. Values chosen from
 * attention-span research (LogRocket / Material writeups):
 *
 *   success  3000  — user already knows what they did
 *   info     3000  — read-once fact
 *   warning  4000  — worth pausing on
 *   error    5000  — user often needs to read + decide
 *   loading  Infinity — dismissed by `toast.promise` / caller
 */
export const DEFAULT_DURATION_MS: Readonly<Record<ToastKind, number>> =
  Object.freeze({
    success: 3000,
    error: 5000,
    warning: 4000,
    info: 3000,
    loading: Infinity,
  });

/** Semantic accessibility role. Mapped to a real RN role in the view. */
export const A11Y_ROLE: Readonly<Record<ToastKind, 'alert' | 'status'>> =
  Object.freeze({
    success: 'status',
    error: 'alert',
    warning: 'alert',
    info: 'status',
    loading: 'status',
  });
