/**
 * Runs after a successful UC unlock or MPIN setup: opens the UC app,
 * then refreshes the profile from /me in the background (cold start
 * skipped /me for UC). A /me failure never blocks the user.
 */
import { validateAuth } from '@app/bootstrap/steps/auth';
import { reconcileAuth, ucUnlocked } from '@store/slices/appSlice';
import { userReceived } from '@store/slices/userSlice';
import { identifyUser } from '@services/telemetry/identify';
import type { AppDispatch } from '@store';

export function completeUcUnlock(dispatch: AppDispatch): void {
  dispatch(ucUnlocked());
  validateAuth()
    .then(auth => {
      if (auth.status !== 'authenticated') return;
      dispatch(userReceived(auth.profile));
      dispatch(reconcileAuth(auth));
      identifyUser({
        userId: auth.userId,
        role: auth.role,
        entityId: auth.entityId,
      });
    })
    .catch(() => {
      // Network trouble: the persisted profile stays on screen.
    });
}
