/**
 * ------------------------------------------------------------------
 * teardownLocalSession — local logout without a server call
 * ------------------------------------------------------------------
 * Used when the session is already over on the server, or can't be
 * used any more: refresh failed, UC MPIN lockout, UC "Forgot MPIN",
 * UC phone no longer registered. useLogout() runs the same steps after
 * its best-effort server call.
 *
 * Safe to call more than once.
 * ------------------------------------------------------------------
 */
import { queryClient } from '@app/queryClient';
import { clearTokens } from '@services/storage/secureStorage';
import { deleteAllUcKeys } from '@services/ucSecurity/keys';
import { clearCallerId } from '@features/uc/callerId/sync';
import { resetIdentity } from '@services/telemetry/identify';
import { resetScreenTracker } from '@services/telemetry/screenTracker';
import { logout } from '@store/slices/appSlice';
import type { AppDispatch } from '@store';

export async function teardownLocalSession(
  dispatch: AppDispatch,
): Promise<void> {
  resetIdentity();
  resetScreenTracker();
  await clearTokens();
  // UC phone keys: the server removes this phone's registration on
  // logout / lockout, so the old keys are useless. Harmless no-op for
  // other roles (no keys exist).
  await deleteAllUcKeys();
  // UC caller ID: delete this phone's customer list. No-op for other
  // roles and on phones without caller ID.
  await clearCallerId();
  dispatch(logout());
  queryClient.clear();
}
