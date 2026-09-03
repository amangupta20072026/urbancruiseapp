// src/services/toast/variantStyles.ts

/**
 * ------------------------------------------------------------------
 * Toast — variant → visual & behavioural style
 * ------------------------------------------------------------------
 * The single lookup table that turns a `ToastKind` into the icon,
 * colours, default duration, and accessibility role used by the
 * host. Nothing else in the toast module should switch on `kind`
 * for style purposes — everything reaches this map.
 *
 * Durations were picked from the LogRocket / Material writeups on
 * toast attention span (3–8 s):
 *
 *   success  3000 ms  — user already knows what they did
 *   info     3000 ms  — read-once fact
 *   warning  4000 ms  — worth pausing on
 *   error    5000 ms  — user often needs to read + decide
 *   loading  Infinity — dismissed by `toast.promise` / caller
 *
 * `a11yRole` follows RN's supported `AccessibilityRole` values.
 * `alert` triggers assertive announcement on iOS/Android and is
 * reserved for error + warning; the others use `status` (polite).
 * ------------------------------------------------------------------
 */

import type { ComponentType } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  XCircle,
  type LucideProps,
} from 'lucide-react-native';
import { Colors } from '@theme';
import type { ToastKind } from './types';
import { A11Y_ROLE, DEFAULT_DURATION_MS } from './variantConstants';

/** Style descriptor for one variant. */
export type VariantStyle = {
  readonly icon: ComponentType<LucideProps>;
  /**
   * Left accent-bar colour + icon tint. Background stays surface-neutral
   * so long descriptions remain legible on any screen.
   */
  readonly accent: string;
  /** Default auto-dismiss in ms. `Infinity` = pinned. */
  readonly defaultDuration: number;
  /**
   * Accessibility role for screen readers. `'alert'` is announced
   * assertively (interrupts other speech); reserve for error/warning.
   */
  readonly a11yRole: 'alert' | 'status';
};

/**
 * Frozen map. `as const` on the outer object would still let TS
 * infer `any` for a missing key at index-time — `Object.freeze`
 * is a runtime guard on top of the compile-time exhaustive check.
 */
export const VARIANT_STYLES: Readonly<Record<ToastKind, VariantStyle>> =
  Object.freeze({
    success: {
      icon: CheckCircle2,
      accent: Colors.success,
      defaultDuration: DEFAULT_DURATION_MS.success,
      a11yRole: A11Y_ROLE.success,
    },
    error: {
      icon: XCircle,
      accent: Colors.error,
      defaultDuration: DEFAULT_DURATION_MS.error,
      a11yRole: A11Y_ROLE.error,
    },
    warning: {
      icon: AlertTriangle,
      accent: Colors.warning,
      defaultDuration: DEFAULT_DURATION_MS.warning,
      a11yRole: A11Y_ROLE.warning,
    },
    info: {
      icon: Info,
      accent: Colors.info,
      defaultDuration: DEFAULT_DURATION_MS.info,
      a11yRole: A11Y_ROLE.info,
    },
    loading: {
      icon: Loader2,
      accent: Colors.info,
      defaultDuration: DEFAULT_DURATION_MS.loading,
      a11yRole: A11Y_ROLE.loading,
    },
  });
