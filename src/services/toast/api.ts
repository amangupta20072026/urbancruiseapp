// src/services/toast/api.ts

/**
 * ------------------------------------------------------------------
 * `toast` — the imperative API every caller uses
 * ------------------------------------------------------------------
 * A single frozen object with methods for each variant plus
 * `dismiss`, `dismissAll`, and `promise`. Import from
 * `@services/toast` — never reach into `./store` directly.
 *
 *   toast.success('Booking confirmed')
 *   toast.error('Payment failed', { description: 'Try another method' })
 *   toast.info('Driver is 5 mins away')
 *   toast.warning('Weak signal — retrying')
 *
 *   const id = toast.loading('Uploading receipt…')
 *   toast.success('Uploaded', { id })   // replace-in-place
 *
 *   toast.promise(uploadReceipt(), {
 *     loading: 'Uploading receipt…',
 *     success: 'Uploaded',
 *     error: (e) => e instanceof Error ? e.message : 'Upload failed',
 *   })
 *
 *   toast.dismiss(id)
 *   toast.dismissAll()
 *
 * Contract:
 *   - `toast.*` is safe to call from any thread — React render,
 *     event handler, axios interceptor, notification callback.
 *   - Never throws. A malformed action throwing inside a caller's
 *     `onPress` is caught and logged; the toast still dismisses.
 *   - Returns a `ToastId` for every show call. `promise()` returns
 *     the id of the initial loading toast so callers can `.dismiss()`
 *     it early if needed.
 * ------------------------------------------------------------------
 */

import { logError } from '@services/telemetry';
import { show, dismiss, dismissAll } from './store';
import type { ToastId, ToastOptions, ToastPromiseMessages } from './types';

/* ================================================================
 * Variant helpers
 * ================================================================ */

function success(title: string, opts?: ToastOptions): ToastId {
  return show('success', title, opts);
}

function error(title: string, opts?: ToastOptions): ToastId {
  return show('error', title, opts);
}

function warning(title: string, opts?: ToastOptions): ToastId {
  return show('warning', title, opts);
}

function info(title: string, opts?: ToastOptions): ToastId {
  return show('info', title, opts);
}

/**
 * Loading toasts are pinned by default (`Infinity` duration) — the
 * caller is responsible for replacing or dismissing them. Almost
 * always used with `toast.promise` or manual `{ id }` replace.
 */
function loading(title: string, opts?: ToastOptions): ToastId {
  return show('loading', title, opts);
}

/* ================================================================
 * toast.promise
 *
 * A tiny convenience over `loading + replace`. Handles both plain
 * values and thunks, so callers can pass either:
 *
 *   toast.promise(fetchFoo(), { … })
 *   toast.promise(() => fetchFoo(), { … })
 *
 * The thunk form is useful when the caller wants the loading toast
 * to appear BEFORE the request is actually issued (rare — the eager
 * form is fine for almost all cases).
 * ================================================================ */

function promise<TValue>(
  input: Promise<TValue> | (() => Promise<TValue>),
  msgs: ToastPromiseMessages<TValue>,
): Promise<TValue> {
  const id = loading(msgs.loading);
  const p = typeof input === 'function' ? input() : input;

  return p.then(
    value => {
      const title =
        typeof msgs.success === 'function' ? msgs.success(value) : msgs.success;
      const description =
        typeof msgs.successDescription === 'function'
          ? msgs.successDescription(value)
          : msgs.successDescription;
      show('success', title, { id, description });
      return value;
    },
    err => {
      const title =
        typeof msgs.error === 'function' ? msgs.error(err) : msgs.error;
      const description =
        typeof msgs.errorDescription === 'function'
          ? msgs.errorDescription(err)
          : msgs.errorDescription;
      show('error', title, { id, description });
      // Re-throw so caller-side error handling isn't swallowed.
      throw err;
    },
  );
}

/* ================================================================
 * Frozen surface
 *
 * `Object.freeze` prevents monkey-patching `toast.success = …` at
 * runtime — a foot-gun in a shared imperative singleton.
 * ================================================================ */

export const toast = Object.freeze({
  success,
  error,
  warning,
  info,
  loading,
  promise,
  dismiss,
  dismissAll,
});

export type ToastApi = typeof toast;

/* ================================================================
 * Guarded action-press
 *
 * Exposed for the host to use when the user taps an action. Kept
 * beside the API rather than the host so the "log-and-swallow"
 * policy lives with the rest of the boundary behaviour.
 * ================================================================ */

export function invokeAction(id: ToastId, onPress: () => void): void {
  try {
    onPress();
  } catch (e) {
    logError(e, { boundary: 'toast.action', extra: { id } });
  } finally {
    // Whether the action succeeded, failed, or crashed, the user
    // has interacted with the toast — it should not linger.
    dismiss(id);
  }
}
