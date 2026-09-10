/**
 * ------------------------------------------------------------------
 * useLogout — Auth, session teardown
 * ------------------------------------------------------------------
 * Wraps POST /auth/logout, then unconditionally tears the session
 * down on the client:
 *
 *   1. Best-effort call to /auth/logout (server-side session revoke)
 *   2. logEvent('auth.logout', { role }) — emit BEFORE detaching identity
 *      so the event is still tagged with the correct user in Firebase
 *   3. resetIdentity()          — unlink userId + clear user props
 *   4. resetScreenTracker()     — so next login re-fires the first view
 *   5. clearTokens()            — remove JWT + refresh from Keychain
 *   6. dispatch(logout())       — flip Redux back to unauthenticated
 *   7. queryClient.clear()      — drop cached data from the previous
 *                                 user (both memory and MMKV via the
 *                                 persister's next write)
 *
 * "Best effort" is deliberate: if the server call fails (network
 * down, token already expired), we STILL log the user out locally.
 * Refusing to log out because the server is unreachable is a
 * hostile UX — the user asked to leave.
 *
 * RootNavigator picks up the Redux change and swaps to AuthFlow on
 * its next render; the screen doesn't need to navigate anywhere.
 * ------------------------------------------------------------------
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@api/axios';
import { endpoints } from '@api/endpoints';
import { ApiError } from '@api/errors';
import { queryKeys } from '@constants/queryKeys';
import { clearTokens } from '@services/storage/secureStorage';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { logout as logoutAction } from '@store/slices/appSlice';
import { logEvent } from '@services/telemetry/logEvent';
import { resetIdentity } from '@services/telemetry/identify';
import { resetScreenTracker } from '@services/telemetry/screenTracker';

/* ------------------------------------------------------------------ */
/* Fetcher                                                            */
/* ------------------------------------------------------------------ */

async function callServerLogout(): Promise<void> {
  await apiClient.post(endpoints.auth.logout());
}

/* ------------------------------------------------------------------ */
/* Hook                                                               */
/* ------------------------------------------------------------------ */

export function useLogout() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  // Snapshot the current role BEFORE the mutation fires. We need
  // this to attribute the logout event to a segment; by the time
  // mutationFn runs, the user may have tapped again and Redux may
  // be mid-teardown.
  const currentRole = useAppSelector(s => s.app.userRole);

  const mutation = useMutation<void, ApiError, void>({
    mutationKey: queryKeys.auth.logout(),
    mutationFn: async () => {
      // Swallow server errors — local teardown must still happen.
      try {
        await callServerLogout();
      } catch {
        // intentional: see docblock
      }

      // ── Analytics ─────────────────────────────────────────────
      // Emit BEFORE detaching identity so Firebase server-side
      // tags this event with the correct user_id + role. After
      // resetIdentity() we'd be anonymous and lose that tag.
      logEvent('auth.logout', { role: currentRole ?? 'unknown' });
      resetIdentity();
      resetScreenTracker();

      await clearTokens();
      dispatch(logoutAction());
      queryClient.clear();
    },
  });

  return {
    logout: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
