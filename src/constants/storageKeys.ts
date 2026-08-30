/**
 * ------------------------------------------------------------------
 * Storage Keys — Central Registry
 * ------------------------------------------------------------------
 * ALL keys used by MMKV and Keychain live here.
 * Never inline a key string in feature code — always import from here.
 * This prevents silent key collisions between features.
 * ------------------------------------------------------------------
 */

export const StorageKeys = {
  // App-wide preferences (MMKV)
  themeMode: 'app.themeMode',
  language: 'app.language',
  lastRoleSelected: 'app.lastRoleSelected',

  // Feature-scoped preferences (MMKV)
  customerBookingListFilters: 'customer.bookingListFilters',
  vendorFleetFilters: 'vendor.fleetFilters',
  ucCustomerSearchFilters: 'uc.customerSearchFilters',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

// Keychain keys are strictly for secrets — NEVER put JWT in MMKV.
export const SecureKeys = {
  jwt: 'auth.jwt',
  refresh: 'auth.refresh',
} as const;

export type SecureKey = (typeof SecureKeys)[keyof typeof SecureKeys];
