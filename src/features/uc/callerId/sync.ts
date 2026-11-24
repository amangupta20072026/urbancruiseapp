/**
 * ------------------------------------------------------------------
 * Caller ID — keeping the customer list on this phone up to date
 * ------------------------------------------------------------------
 * GET /api/v1/uc/caller-id/contacts returns every customer, vendor,
 * driver and active UC staff number with what the card shows. The phone
 * stores it in its own SQLite database (CallerIdStore.kt), where the
 * call-screening service reads it.
 *
 * WHEN IT RUNS (product decision, 23 Nov 2026: only when the app opens)
 *   - when the UC app opens or comes back to the foreground, at most
 *     once per MIN_INTERVAL_MS (useCallerIdAutoSync);
 *   - right after caller ID is turned on;
 *   - when "Sync now" is tapped.
 *
 * WHAT IT DOWNLOADS
 *   The phone sends the version it already has as If-None-Match. When
 *   nothing changed the server answers 304 with no body, so a normal
 *   check costs almost nothing.
 *
 * WHEN THE LIST IS DELETED
 *   - caller ID is off on this phone (no list is kept for nothing);
 *   - the server answers 403 CALLER_ID_REVOKED (left the company /
 *     marked inactive in Saarthi);
 *   - logout (useLogout / teardownLocalSession call clearCallerId).
 * ------------------------------------------------------------------
 */

import { apiClient } from '@api/axios';
import { endpoints } from '@api/endpoints';
import { ApiError } from '@api/errors';
import { callerIdNative, isCallerIdSupported } from '@/native/callerId';

import type { CallerIdContactsSnapshot, CallerIdSyncResult } from './types';

/** Automatic checks: at most one per this interval. */
const MIN_INTERVAL_MS = 5 * 60 * 1000;

/** The server's error code when the staff member may no longer sync. */
const REVOKED_CODE = 'CALLER_ID_REVOKED';

let inFlight: Promise<CallerIdSyncResult> | null = null;
let lastAttemptAt = 0;

/* ------------------------------------------------------------------ */
/* Change notifications for status hooks                              */
/* ------------------------------------------------------------------ */

type Listener = () => void;
const listeners = new Set<Listener>();

/** Called after every sync or clear, so status screens re-read. */
export function onCallerIdChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emitChanged(): void {
  listeners.forEach(l => l());
}

/* ------------------------------------------------------------------ */
/* Sync                                                               */
/* ------------------------------------------------------------------ */

/**
 * Checks the server and updates the list.
 *
 * `force` skips the MIN_INTERVAL_MS gap (Sync now, just turned on).
 * Never throws. Two calls at once share one request.
 */
export function syncCallerId(
  options: { force?: boolean } = {},
): Promise<CallerIdSyncResult> {
  if (!isCallerIdSupported()) return Promise.resolve('unsupported');
  if (inFlight) return inFlight;

  const now = Date.now();
  if (!options.force && now - lastAttemptAt < MIN_INTERVAL_MS) {
    return Promise.resolve('skipped');
  }
  lastAttemptAt = now;

  inFlight = runSync().finally(() => {
    inFlight = null;
    emitChanged();
  });
  return inFlight;
}

async function runSync(): Promise<CallerIdSyncResult> {
  const status = await callerIdNative.getStatus();

  // Caller ID is off on this phone: keep no customer data on it.
  if (!status.roleHeld) {
    if (status.count > 0) await callerIdNative.clear();
    return 'off';
  }

  try {
    const response = await apiClient.get<CallerIdContactsSnapshot | ''>(
      endpoints.uc.callerId.contacts(),
      {
        headers: status.version
          ? { 'If-None-Match': `"${status.version}"` }
          : undefined,
        // 304 Not Modified is a success here, not an error.
        validateStatus: s => (s >= 200 && s < 300) || s === 304,
      },
    );

    const checkedAt = new Date().toISOString();

    if (response.status === 304) {
      await callerIdNative.markChecked(checkedAt);
      return 'unchanged';
    }

    const snapshot = response.data;
    if (!snapshot || typeof snapshot !== 'object') return 'failed';

    await callerIdNative.replaceAll(
      snapshot.version,
      JSON.stringify(snapshot.entries),
      checkedAt,
    );
    return 'updated';
  } catch (error) {
    const apiError = ApiError.from(error);
    if (apiError.code === REVOKED_CODE) {
      await callerIdNative.clear();
      return 'revoked';
    }
    // Offline, server down, timeout: keep the last good list.
    return 'failed';
  }
}

/**
 * Deletes the list on this phone. Used on logout. Never throws, so it
 * can't block signing out.
 */
export async function clearCallerId(): Promise<void> {
  lastAttemptAt = 0;
  await callerIdNative.clear();
  emitChanged();
}
