/**
 * ------------------------------------------------------------------
 * callerId — bridge to the Android caller-ID module (UC staff only)
 * ------------------------------------------------------------------
 * Android: android/app/src/main/java/app/urbancruise/callerid/
 *   CallerIdModule.kt            this bridge
 *   CallerIdScreeningService.kt  runs on every incoming call
 *   CallerIdStore.kt             the customer list on this phone
 *
 * iOS has no equivalent API, and Android needs 10 (API 29) or later.
 * Everywhere else every call here is a safe no-op and `supported` is
 * false, so screens can hide the feature.
 * ------------------------------------------------------------------
 */

import { NativeModules, Platform } from 'react-native';

export type CallerIdNativeStatus = {
  /** Android 10+ with the native module built in. */
  supported: boolean;
  /** Urban Cruise is the phone's caller-ID app. */
  roleHeld: boolean;
  /** "Display over other apps" is on (needed for the overlay card). */
  canDrawOverlays: boolean;
  /** Notifications are on (needed for the locked-phone backup). */
  notificationsEnabled: boolean;
  /**
   * READ_CONTACTS is allowed. Without it Android doesn't pass calls from
   * numbers saved in the phone's contacts to caller ID.
   */
  contactsGranted: boolean;
  /** Customer numbers on this phone. */
  count: number;
  /** Snapshot version from the server, null before the first sync. */
  version: string | null;
  /** ISO time of the last successful check with the server. */
  syncedAt: string | null;
};

type CallerIdNativeModule = {
  getStatus: () => Promise<CallerIdNativeStatus>;
  requestRole: () => Promise<boolean>;
  openOverlaySettings: () => Promise<boolean>;
  openNotificationSettings: () => Promise<boolean>;
  replaceAll: (
    version: string,
    entriesJson: string,
    syncedAt: string,
  ) => Promise<number>;
  markChecked: (syncedAt: string) => Promise<void>;
  clear: () => Promise<void>;
};

const native: CallerIdNativeModule | undefined =
  Platform.OS === 'android'
    ? (NativeModules as { CallerId?: CallerIdNativeModule }).CallerId
    : undefined;

/** Caller ID needs ROLE_CALL_SCREENING, added in Android 10 (API 29). */
const MIN_ANDROID_API = 29;

/** True when this phone can use caller ID at all. Synchronous. */
export function isCallerIdSupported(): boolean {
  return (
    native !== undefined &&
    Platform.OS === 'android' &&
    typeof Platform.Version === 'number' &&
    Platform.Version >= MIN_ANDROID_API
  );
}

const UNSUPPORTED: CallerIdNativeStatus = {
  supported: false,
  roleHeld: false,
  canDrawOverlays: false,
  notificationsEnabled: false,
  contactsGranted: false,
  count: 0,
  version: null,
  syncedAt: null,
};

export const callerIdNative = {
  async getStatus(): Promise<CallerIdNativeStatus> {
    if (!native || !isCallerIdSupported()) return UNSUPPORTED;
    try {
      return await native.getStatus();
    } catch {
      return UNSUPPORTED;
    }
  },

  /** Shows Android's "Set Urban Cruise as your caller ID app?" dialog. */
  async requestRole(): Promise<boolean> {
    if (!native || !isCallerIdSupported()) return false;
    try {
      return await native.requestRole();
    } catch {
      return false;
    }
  },

  async openOverlaySettings(): Promise<boolean> {
    if (!native) return false;
    try {
      return await native.openOverlaySettings();
    } catch {
      return false;
    }
  },

  async openNotificationSettings(): Promise<boolean> {
    if (!native) return false;
    try {
      return await native.openNotificationSettings();
    } catch {
      return false;
    }
  },

  /** Replaces the whole list. Throws if the phone couldn't save it. */
  async replaceAll(
    version: string,
    entriesJson: string,
    syncedAt: string,
  ): Promise<number> {
    if (!native) return 0;
    return native.replaceAll(version, entriesJson, syncedAt);
  },

  async markChecked(syncedAt: string): Promise<void> {
    if (!native) return;
    await native.markChecked(syncedAt);
  },

  /** Deletes the list. Never throws: used during logout. */
  async clear(): Promise<void> {
    if (!native) return;
    try {
      await native.clear();
    } catch {
      // Nothing more to do; the next login replaces the list anyway.
    }
  },
};
