/**
 * ------------------------------------------------------------------
 * Bootstrap Step — role from the last session
 * ------------------------------------------------------------------
 * The role is persisted by redux-persist (appSlice transform). Redux
 * rehydrates in parallel with bootstrap, so wait for it (bounded) before
 * reading. Used only to decide the UC cold-start path; the server stays
 * the source of truth for the role.
 * ------------------------------------------------------------------
 */
import { persistor, store } from '@store';
import type { UserRole } from '@rbac/roles';

const REHYDRATE_TIMEOUT_MS = 1_500;

function waitForRehydration(timeoutMs: number): Promise<void> {
  return new Promise(resolve => {
    if (persistor.getState().bootstrapped) {
      resolve();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      unsubscribe();
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    const unsubscribe = persistor.subscribe(() => {
      if (persistor.getState().bootstrapped) finish();
    });
  });
}

/** Persisted role, or null if unknown (rehydration slow or none saved). */
export async function readPersistedRole(): Promise<UserRole | null> {
  await waitForRehydration(REHYDRATE_TIMEOUT_MS);
  return store.getState().app.userRole;
}
