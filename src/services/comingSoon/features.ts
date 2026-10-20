// src/services/comingSoon/features.ts

/**
 * ------------------------------------------------------------------
 * Coming-soon feature catalogue
 * ------------------------------------------------------------------
 * The single list of user-reachable features that are not built yet.
 * Every "coming soon" toast in the app names one of these keys.
 *
 * WHY A CLOSED UNION:
 *   - Typos are compile errors, not silent analytics noise.
 *   - Telemetry stays low-cardinality: the `feature` property on
 *     `feature.coming_soon_shown` is always one of these literals.
 *   - When a feature ships, deleting its key here makes TypeScript
 *     point at every call site that still says "coming soon".
 *
 * LABEL RULES:
 *   - Labels are shown to users in the toast description
 *     ("<label> will be available soon."), so write them as a noun
 *     phrase in sentence case.
 *   - Never put user data, ids or role names in a label.
 *
 * ADDING A FEATURE:
 *   1. Add the key to `ComingSoonFeature`.
 *   2. Add its label to `COMING_SOON_LABELS` (TypeScript insists).
 *   3. Call `notifyComingSoon('<key>')` where the user taps it.
 * ------------------------------------------------------------------
 */

export type ComingSoonFeature =
  // ── Generic ───────────────────────────────────────────────────
  // Used only by the navigation safety net when a destination is
  // not registered for the current role. Prefer a specific key.
  | 'generic'

  // ── Shared ────────────────────────────────────────────────────
  | 'profile'
  | 'settings'
  | 'notifications'
  | 'notificationPreferences'
  | 'helpSupport'
  | 'aboutApp'
  | 'liveChat'
  | 'termsAndConditions'
  | 'settingsOption'

  // ── Customer ──────────────────────────────────────────────────
  | 'customer.tripLive'
  | 'customer.payBalance'
  | 'customer.modifyBooking'

  // ── Vendor ────────────────────────────────────────────────────
  | 'vendor.assignments'
  | 'vendor.trips'
  | 'vendor.fleet'
  | 'vendor.drivers'
  | 'vendor.payouts'
  | 'vendor.maintenance'
  | 'vendor.reports'
  | 'vendor.businessDetails'

  // ── Driver ────────────────────────────────────────────────────
  | 'driver.trips'
  | 'driver.collectPayment'
  | 'driver.routes'
  | 'driver.fuelLog'
  | 'driver.incidents'
  | 'driver.rewards'
  | 'driver.documents'

  // ── UC ────────────────────────────────────────────────────────
  | 'uc.createQuotation'
  | 'uc.quotationDetail'
  | 'uc.enquiryDetail'
  | 'uc.tripMonitor';

/**
 * User-facing label per feature. `Record<ComingSoonFeature, string>`
 * makes a missing label a compile error.
 */
export const COMING_SOON_LABELS: Readonly<Record<ComingSoonFeature, string>> =
  Object.freeze({
    generic: 'This section',

    profile: 'Your profile',
    settings: 'Settings',
    notifications: 'Notifications',
    notificationPreferences: 'Notification preferences',
    helpSupport: 'Help & Support',
    aboutApp: 'About Urban Cruise',
    liveChat: 'Live chat',
    termsAndConditions: 'Terms & Conditions',
    settingsOption: 'This setting',

    'customer.tripLive': 'Live trip tracking',
    'customer.payBalance': 'Online balance payment',
    'customer.modifyBooking': 'Booking changes',

    'vendor.assignments': 'Booking assignments',
    'vendor.trips': 'Trip details',
    'vendor.fleet': 'Fleet management',
    'vendor.drivers': 'Driver management',
    'vendor.payouts': 'Payouts',
    'vendor.maintenance': 'Maintenance',
    'vendor.reports': 'Reports',
    'vendor.businessDetails': 'Business details',

    'driver.trips': 'Trip details',
    'driver.collectPayment': 'Payment collection',
    'driver.routes': 'My routes',
    'driver.fuelLog': 'Fuel log',
    'driver.incidents': 'Incident reporting',
    'driver.rewards': 'Rewards',
    'driver.documents': 'Licence and documents',

    'uc.createQuotation': 'Creating quotations',
    'uc.quotationDetail': 'Quotation details',
    'uc.enquiryDetail': 'Enquiry details',
    'uc.tripMonitor': 'Live trip monitoring',
  });
