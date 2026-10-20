/**
 * ------------------------------------------------------------------
 * useUnreadNotificationCount — number on the header bell's badge
 * ------------------------------------------------------------------
 * Used by AppHeader on every role's home screen.
 *
 * TODO(backend): returns a fixed mock value until the real unread
 * count is wired (e.g. a count endpoint, or derived from the
 * NotificationCentre query). This hook is the ONE place to change;
 * every header updates with it.
 * ------------------------------------------------------------------
 */

/** Mock unread count shown on the bell until the real one is wired. */
export const MOCK_UNREAD_COUNT = 3;

export function useUnreadNotificationCount(): number {
  return MOCK_UNREAD_COUNT;
}
