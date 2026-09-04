/**
 * ------------------------------------------------------------------
 * Sheet Handlers — Pluggable UI hook registry
 * ------------------------------------------------------------------
 * PermissionService is UI-agnostic — it does NOT import Gorhom
 * bottom sheets, Modal components, or any renderer. Instead, it
 * calls into three async handler functions that are registered
 * by App.tsx at bootstrap time.
 *
 * This split exists for three reasons:
 *   1. Tests inject stubs — no UI needed to exercise the state machine.
 *   2. If we switch from Gorhom to a native Modal, PermissionService
 *      doesn't change.
 *   3. Bootstrap owns the wiring; the service stays focused on policy.
 *
 * DEFAULTS: if App.tsx forgets to call `configureSheetHandlers`, the
 * service uses `continue`-returning defaults so nothing blocks. This
 * is deliberate — a missing UI is a bug for a designer, not a fatal
 * runtime crash. The service will still call the OS prompt directly,
 * which is safe (just less polished).
 *
 * ------------------------------------------------------------------
 */

import type { RationaleCopy } from '@rbac/capabilities';

/**
 * The user's choice after a sheet has been shown.
 *   'continue' — proceed to the next step (rationale → OS prompt;
 *                prominent disclosure → OS prompt; blocked → openSettings)
 *   'dismiss'  — user backed out; treat as soft denial
 */
export type SheetChoice = 'continue' | 'dismiss';

/**
 * The user's choice from the blocked-recovery sheet.
 *   'openSettings' — deep-link to Settings (service calls openAppSettings)
 *   'dismiss'      — user backed out; capability stays blocked
 */
export type BlockedRecoveryChoice = 'openSettings' | 'dismiss';

export type SheetHandlers = {
  /** Shown BEFORE the OS prompt for any denied capability. */
  showRationale: (copy: RationaleCopy) => Promise<SheetChoice>;
  /**
   * Shown BEFORE the OS prompt for capabilities with
   * `requiresProminentDisclosure: true` (background location today).
   * Play policy mandates specific wording — see the descriptor.
   */
  showProminentDisclosure: (copy: RationaleCopy) => Promise<SheetChoice>;
  /** Shown when a capability is already blocked and user retries. */
  showBlockedRecovery: (copy: RationaleCopy) => Promise<BlockedRecoveryChoice>;
};

/* -----------------------------------------------------------------
 * Registry (module-level singleton)
 * ----------------------------------------------------------------- */

const DEFAULT_HANDLERS: SheetHandlers = {
  // No UI wired — assume the user WOULD have tapped continue for the
  // regular rationale sheet. The OS prompt / Settings deep-link is
  // still authoritative and safe.
  showRationale: async () => 'continue',

  // Prominent disclosure is DIFFERENT. Google Play policy requires it
  // be shown BEFORE the OS prompt for any capability that declares
  // `requiresProminentDisclosure`. If the app were to reach this
  // default (i.e. App.tsx forgot to wire the real sheet, or a bootstrap
  // race), silently continuing would skip the disclosure and hit the
  // OS prompt — a Play policy violation in production. FAIL CLOSED:
  // the user sees nothing happen, a developer notices, they wire it.
  //
  // This is currently unused (no capability sets
  // requiresProminentDisclosure=true after the ACCESS_BACKGROUND_LOCATION
  // removal — see docs/permissions-audit.md) but the safe default
  // stays in place as defense in depth for any future capability that
  // ever re-enables the flag.
  showProminentDisclosure: async () => 'dismiss',

  showBlockedRecovery: async () => 'dismiss',
};

let current: SheetHandlers = DEFAULT_HANDLERS;

/**
 * Register the real sheet renderers. Called once from App.tsx after
 * BottomSheetModalProvider has mounted, with refs to the actual sheets.
 * Partial patches are supported — e.g. tests can override only
 * `showRationale` and leave the others as defaults.
 */
export function configureSheetHandlers(next: Partial<SheetHandlers>): void {
  current = { ...current, ...next };
}

/** Read-only accessor for the service. */
export function getSheetHandlers(): SheetHandlers {
  return current;
}

/** Test helper — reset to defaults between test runs. */
export function resetSheetHandlers(): void {
  current = DEFAULT_HANDLERS;
}
