// src/services/toast/index.ts

/**
 * ------------------------------------------------------------------
 * Toast — public surface
 * ------------------------------------------------------------------
 * Callers outside this folder should ONLY reach in through this
 * barrel. Internal helpers (the store, variantStyles, the item
 * view) are intentionally not re-exported.
 *
 *   toast            — the imperative API. Import as
 *                      `import { toast } from '@services/toast'`.
 *   ToastHost        — the single mount point. Rendered in App.tsx.
 *   types            — call sites usually don't need them, but
 *                      exposing them keeps helper wrappers ergonomic
 *                      (e.g. an axios interceptor that types its
 *                      error mapper).
 * ------------------------------------------------------------------
 */

export { toast } from './api';
export type { ToastApi } from './api';
export { ToastHost } from './ToastHost';
export type {
  ToastId,
  ToastKind,
  ToastItem,
  ToastAction,
  ToastOptions,
  ToastPromiseMessages,
} from './types';
