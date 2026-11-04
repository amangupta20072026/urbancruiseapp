/**
 * ------------------------------------------------------------------
 * Session events — lets the axios layer talk to the app without
 * importing Redux (which would create an import cycle).
 * ------------------------------------------------------------------
 *   'ucUnlockRequired' — a UC token refresh was refused because the
 *                        last MPIN / fingerprint unlock is older than
 *                        24 h. The app shows the unlock sheet.
 *   'sessionEnded'     — the session can't continue (refresh failed).
 *                        The app runs the full local logout.
 *
 * App.tsx registers the listener and the role getter once.
 * ------------------------------------------------------------------
 */
import type { UserRole } from '@rbac/roles';

export type SessionEvent = 'ucUnlockRequired' | 'sessionEnded';
type Listener = (event: SessionEvent) => void;

const listeners = new Set<Listener>();
let roleGetter: () => UserRole | null = () => null;

export function onSessionEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitSessionEvent(event: SessionEvent): void {
  listeners.forEach(l => {
    try {
      l(event);
    } catch {
      // A listener must never break the caller (an interceptor).
    }
  });
}

export function registerSessionRoleGetter(getter: () => UserRole | null): void {
  roleGetter = getter;
}

/** Role of the signed-in user, as Redux knows it. */
export function currentSessionRole(): UserRole | null {
  return roleGetter();
}
