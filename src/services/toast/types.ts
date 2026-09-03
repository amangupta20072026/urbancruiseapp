// src/services/toast/types.ts

/**
 * ------------------------------------------------------------------
 * Toast — public types
 * ------------------------------------------------------------------
 * The `toast` API is intentionally narrow. Call sites cannot pick
 * a colour, a position, an icon, or a font — those are decided by
 * the variant (`ToastKind`). Anything call sites CAN customise
 * lives here:
 *
 *   title / description   — the two lines of text
 *   action                — optional CTA (used sparingly; wrong-role
 *                           deep-link, Retry, Undo)
 *   duration              — override auto-dismiss in ms; special
 *                           value `Infinity` pins the toast
 *   id                    — provide one to REPLACE an existing toast
 *                           (used by `toast.promise` internally)
 *
 * If a caller wants anything beyond these knobs, we escalate the
 * design conversation rather than adding a knob. That's what
 * "centralised like big companies" means in practice.
 * ------------------------------------------------------------------
 */

/** The five semantic variants. Order matches variantStyles.ts. */
export type ToastKind = 'success' | 'error' | 'warning' | 'info' | 'loading';

/**
 * Opaque handle to a live toast. Returned by `toast.success(...)`
 * etc. and accepted by `toast.dismiss(id)` and by other `toast.*`
 * calls that want to replace an existing toast in place.
 *
 * The concrete shape is a string — but typing it as a branded
 * literal would tie every call site to this file; a bare `string`
 * is fine here and keeps the API mobile.
 */
export type ToastId = string;

/**
 * One optional CTA on a toast. Two-action toasts are DELIBERATELY
 * not supported — that pattern belongs to a dialog. If a flow needs
 * two actions, use a dialog.
 */
export type ToastAction = {
  readonly label: string;
  /**
   * Called on press. The toast auto-dismisses AFTER this returns —
   * throwing is caught and logged (a broken action must not orphan
   * the toast on screen).
   */
  onPress: () => void;
};

/**
 * Options accepted by every `toast.*` call. All are optional.
 * `duration: Infinity` pins the toast; `duration: 0` uses the
 * default for that variant.
 */
export type ToastOptions = {
  readonly description?: string;
  readonly action?: ToastAction;
  readonly duration?: number;
  readonly id?: ToastId;
};

/**
 * A live toast in the store. Consumers of the store (the host,
 * tests) get a readonly snapshot of `ToastItem[]`.
 *
 * `createdAt` and `timeoutMs` are kept so the host can render
 * accurate progress if we ever want a countdown bar, and so the
 * dedup check can inspect item age.
 */
export type ToastItem = {
  readonly id: ToastId;
  readonly kind: ToastKind;
  readonly title: string;
  readonly description?: string;
  readonly action?: ToastAction;
  /** Epoch ms at which this item entered the store. */
  readonly createdAt: number;
  /** Auto-dismiss delay in ms. `null` means pinned (loading). */
  readonly timeoutMs: number | null;
};

/**
 * Shape returned by `toast.promise` — matches the pattern established
 * by Sonner et al. `success` and `error` may be plain strings or
 * functions of the settled value / caught error.
 */
export type ToastPromiseMessages<TValue> = {
  readonly loading: string;
  readonly success: string | ((value: TValue) => string);
  readonly error: string | ((err: unknown) => string);
  readonly successDescription?: string | ((value: TValue) => string);
  readonly errorDescription?: string | ((err: unknown) => string);
};
