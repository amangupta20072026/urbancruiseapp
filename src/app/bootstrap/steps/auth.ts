/**
 * ------------------------------------------------------------------
 * Bootstrap Step — Auth validation
 * ------------------------------------------------------------------
 * Called only when Keychain returned tokens. Hits /auth/me to confirm
 * the session is still valid server-side and to fetch the identity
 * (userId, role, subRole, entityId).
 *
 * Three outcomes:
 *
 *   'authenticated'   → /me returned 200 → full trust, use returned identity
 *   'provisional'     → network timed out or unreachable → trust the local
 *                       token FOR NOW; a background refetch will confirm or
 *                       reject later. Prevents cold-start hang on bad network.
 *   'unauthenticated' → /me returned 401/403 → tokens are dead, clear them
 *
 * The refresh interceptor already handles 401 during regular app usage;
 * here we only care about the "session is valid at all?" question.
 * ------------------------------------------------------------------
 */

import { apiClient } from '@api/axios';
import { endpoints } from '@api/endpoints';
import { ApiError } from '@api/errors';
import { clearTokens } from '@services/storage/secureStorage';
import type { UserRole, SubRole } from '@rbac/roles';
import type { UserProfile } from '@store/slices/userSlice';

export type AuthResolution =
  | {
      status: 'authenticated';
      userId: string;
      role: UserRole;
      subRole: SubRole;
      entityId: string;
      /** Full display profile — dispatched to user slice by bootstrap. */
      profile: UserProfile;
    }
  | {
      status: 'provisional';
      // No identity yet — background refetch will fill it in.
    }
  | { status: 'unauthenticated' };

type MeResponse = {
  userId: string;
  role: UserRole;
  subRole: SubRole;
  entityId: string;
  profile: UserProfile;
};

/**
 * Call /me. Returns 'authenticated' on success. On unauthorized/forbidden
 * we CLEAR tokens and return 'unauthenticated'. On any other failure we
 * propagate the error so the caller (withTimeout) can fall back to
 * 'provisional'.
 */
export async function validateAuth(): Promise<AuthResolution> {
  try {
    const { data } = await apiClient.get<MeResponse>(endpoints.auth.me());
    return {
      status: 'authenticated',
      userId: data.userId,
      role: data.role,
      subRole: data.subRole,
      entityId: data.entityId,
      profile: data.profile,
    };
  } catch (err) {
    if (
      err instanceof ApiError &&
      (err.kind === 'unauthorized' || err.kind === 'forbidden')
    ) {
      await clearTokens();
      return { status: 'unauthenticated' };
    }
    // Re-throw — withTimeout wrapper turns this into 'provisional'.
    throw err;
  }
}
