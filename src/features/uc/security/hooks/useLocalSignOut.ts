/**
 * Ends the session on this phone (no server call) and shows `message`.
 * Used when the server has already ended it (MPIN lockout) or it can't
 * continue (Forgot MPIN, phone not registered). RootNavigator then
 * shows the login flow.
 */
import { useCallback } from 'react';
import { useAppDispatch } from '@store/hooks';
import { completeOnboarding } from '@store/slices/appSlice';
import { toast } from '@services/toast';
import { teardownLocalSession } from '@features/auth/session/teardownSession';

export function useLocalSignOut() {
  const dispatch = useAppDispatch();
  return useCallback(
    async (message: string | null) => {
      await teardownLocalSession(dispatch);
      // Straight to Login, also when signed out from the onboarding sheet.
      dispatch(completeOnboarding());
      if (message) {
        setTimeout(() => toast.info(message), 0);
      }
    },
    [dispatch],
  );
}
