/**
 * ------------------------------------------------------------------
 * Permissions Slice
 * ------------------------------------------------------------------
 * Cached status of every capability, keyed by Capability. Fed by
 * PermissionService (writes) and consumed by screens via the
 * usePermission hooks (reads).
 *
 * DELIBERATELY NOT PERSISTED (not whitelisted by the redux-persist
 * transform in store/index.ts):
 *   The OS is the source of truth. Persisting a stale 'granted'
 *   across process kills and rehydrating it would let a screen
 *   render an affordance the user actually revoked while the app
 *   was closed. Instead, this slice starts empty on every cold
 *   start; the app-resume watcher re-checks lazily on first
 *   foreground and each `ensureCapability` call writes into the
 *   slice as it runs.
 *
 * Coexists with appSlice — appSlice owns identity (isAuthenticated,
 * userRole); this slice owns runtime permission state. Splitting means
 * a screen that only cares about the camera permission doesn't
 * re-render on bootstrap or role changes.
 *
 * Actions:
 *   statusChanged      — service reports a fresh check result
 *   preconditionFailed — service reports the perm is granted but a
 *                        runtime precondition (GPS off) blocks use
 *   allCleared         — full reset (used on logout + role switch)
 * ------------------------------------------------------------------
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { Capability } from '@rbac/capabilities';

import type { CapabilityStatus } from '@services/permissions';
import { logout } from './appSlice';

/* -----------------------------------------------------------------
 * Shape
 * ----------------------------------------------------------------- */

export type PermissionEntry = {
  /** Last-known status from the OS. */
  status: CapabilityStatus;
  /**
   * For location capabilities: last-known state of the device
   * Location Services (GPS) master switch. `null` for non-location
   * capabilities and for entries that haven't checked yet.
   */
  deviceLocationOn: boolean | null;
  /** ms since epoch — last time the OS was queried. */
  lastCheckedAt: number | null;
};

export type PermissionsState = {
  /**
   * Partial<Record<...>> — an absent key means "never checked", not
   * "denied". Callers read via `useCapabilityStatus` which returns
   * `'unknown'` for missing entries.
   */
  entries: Partial<Record<Capability, PermissionEntry>>;
};

const initialState: PermissionsState = {
  entries: {},
};

/* -----------------------------------------------------------------
 * Slice
 * ----------------------------------------------------------------- */

const permissionsSlice = createSlice({
  name: 'permissions',
  initialState,
  reducers: {
    statusChanged: (
      state,
      action: PayloadAction<{
        capability: Capability;
        status: CapabilityStatus;
        deviceLocationOn?: boolean | null;
      }>,
    ) => {
      const { capability, status, deviceLocationOn = null } = action.payload;
      state.entries[capability] = {
        status,
        deviceLocationOn,
        lastCheckedAt: Date.now(),
      };
    },

    preconditionFailed: (
      state,
      action: PayloadAction<{
        capability: Capability;
        reason: 'gpsOff';
      }>,
    ) => {
      const { capability, reason } = action.payload;
      const existing = state.entries[capability];
      state.entries[capability] = {
        status: existing?.status ?? 'unknown',
        deviceLocationOn: reason === 'gpsOff' ? false : null,
        lastCheckedAt: Date.now(),
      };
    },

    allCleared: () => initialState,
  },
  extraReducers: builder => {
    // On logout, wipe everything. A fresh session must not inherit
    // the previous user's cached grants — a new user's role may
    // differ, making the previous cache misleading.
    builder.addCase(logout, () => initialState);
  },
});

export const { statusChanged, preconditionFailed, allCleared } =
  permissionsSlice.actions;

export default permissionsSlice.reducer;
