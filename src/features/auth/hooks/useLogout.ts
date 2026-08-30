/**
 * ------------------------------------------------------------------
 * useLogout — Auth, session teardown
 * ------------------------------------------------------------------
 * Wraps POST /auth/logout, then unconditionally tears the session
 * down on the client:
 *
 *   1. Best-effort call to /auth/logout (server-side session revoke)
 *   2. clearTokens()           — remove JWT + refresh from Keychain
 *   3. dispatch(logout())      — flip Redux back to unauthenticated
 *   4. queryClient.clear()     — drop cached data from the previous
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
 *
 * Backend swap:
 *   Flip USE_MOCK to false. No other changes needed.
 * ------------------------------------------------------------------
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@api/axios';
import { endpoints } from '@api/endpoints';
import { ApiError } from '@api/errors';
import { queryKeys } from '@constants/queryKeys';
import { clearTokens } from '@services/storage/secureStorage';
import { useAppDispatch } from '@store/hooks';
import { logout as logoutAction } from '@store/slices/appSlice';

/* ------------------------------------------------------------------ */
/* Toggle                                                             */
/* ------------------------------------------------------------------ */

const USE_MOCK = true;

/* ------------------------------------------------------------------ */
/* Fetcher                                                            */
/* ------------------------------------------------------------------ */

async function callServerLogout(): Promise<void> {
  if (USE_MOCK) {
    await new Promise<void>(resolve => setTimeout(resolve, 200));
    return;
  }
  await apiClient.post(endpoints.auth.logout());
}

/* ------------------------------------------------------------------ */
/* Hook                                                               */
/* ------------------------------------------------------------------ */

export function useLogout() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const mutation = useMutation<void, ApiError, void>({
    mutationKey: queryKeys.auth.logout(),
    mutationFn: async () => {
      // Swallow server errors — local teardown must still happen.
      try {
        await callServerLogout();
      } catch {
        // intentional: see docblock
      }
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
