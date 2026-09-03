/**
 * ------------------------------------------------------------------
 * RBAC Capabilities — Single Source of Truth for Permissions
 * ------------------------------------------------------------------
 * The complete registry of app capabilities that require an OS
 * permission, a system picker, or a runtime precondition (GPS on).
 * Every feature that needs the user's consent for something consults
 * this file — nothing else.
 *
 * Why capabilities, not raw OS permissions:
 *   Callers say `ensure('driverTripTracking')`, not
 *   `request(ACCESS_BACKGROUND_LOCATION)`. This decouples business
 *   logic from OS specifics — the Photo Picker vs READ_MEDIA_IMAGES
 *   decision, the Android-13 POST_NOTIFICATIONS gate, the iOS
 *   "when in use" vs "always" split — all invisible to features.
 *   When Google changes the perm model again (they will), a single
 *   row here updates and every screen is correct.
 *
 * What each descriptor declares:
 *   - roles                       — which UserRoles may request it
 *   - requiresProminentDisclosure — Play-Store-compliant modal must
 *                                    be shown BEFORE the OS prompt
 *   - requiresDeviceLocationOn    — GPS master switch must be ON
 *   - rationale                   — copy for the pre-prompt sheet
 *   - fallback                    — behavior on hard denial
 *   - telemetryKey                — funnel event name prefix (closed
 *                                    union — see PermissionTelemetryKey)
 *
 * SEE ALSO:
 *   - docs/permissions-audit.md
 *     Complete matrix + Play Console declarations. Authoritative
 *     source for what is declared in Manifest / Info.plist.
 *   - services/permissions/PermissionService.ts
 *     State machine that consumes this registry.
 * ------------------------------------------------------------------
 */

import type { UserRole } from './roles';

/* -----------------------------------------------------------------
 * Capability keys — the public vocabulary
 * ----------------------------------------------------------------- */

export type Capability =
  /** Push notifications from FCM + Notifee. All roles. */
  | 'notifications'
  /**
   * Foreground fine-location for the live-trip screen.
   * Customer (tracking their trip) + Driver (during an active trip).
   */
  | 'foregroundLocation'
  /**
   * Background location for driver trip tracking after "Start Leg".
   * Driver only. Requires prominent disclosure before OS prompt
   * (Play policy) AND foregroundLocation already granted.
   */
  | 'backgroundLocation'
  /**
   * Camera. One OS grant covers all uses:
   *   - profile photo (all roles)
   *   - KM meter photo (Driver)
   *   - vehicle / RC / license photo (Vendor, Driver)
   *   - trip receipt (Driver, UC)
   */
  | 'camera'
  /**
   * Pick an image / document from the gallery via the OS Photo Picker.
   * Zero permission — the picker is a sandboxed system UI on both
   * Android (13+ with backport) and iOS (PHPicker on 14+).
   */
  | 'photoPicker'
  /**
   * Open the phone dialer via `tel:` intent. Zero permission.
   * RBAC gating (e.g. driver→customer 24h window) is enforced in
   * `src/rbac/visibility.ts`, NOT here.
   */
  | 'phoneDialer'
  /**
   * Save a PDF to the shared Downloads collection via MediaStore.
   * Zero permission on Android 10+ (scoped storage).
   */
  | 'downloadPdf';

/* -----------------------------------------------------------------
 * Telemetry keys — closed union owned by this module.
 *
 * A capability's telemetryKey MUST be a member of this union. Kept
 * here (rather than in @services/telemetry) so:
 *   1. CapabilityDescriptor.telemetryKey is narrowly typed at the
 *      registry — a typo like 'phone_dailer' is a compile error.
 *   2. logEvent.ts imports this union to compose the closed
 *      EventName type — the funnel event name is validated end-to-end.
 *
 * INVARIANT: every distinct value in this union MUST be used by
 * exactly one capability's telemetryKey. Enforced by manual review
 * (the registry is short).
 * ----------------------------------------------------------------- */

export type PermissionTelemetryKey =
  | 'notifications'
  | 'foreground_location'
  | 'background_location'
  | 'camera'
  | 'photo_picker'
  | 'phone_dialer'
  | 'download_pdf';

/* -----------------------------------------------------------------
 * Descriptor shape
 * ----------------------------------------------------------------- */

/**
 * Copy shown in the in-app rationale sheet BEFORE the OS prompt,
 * and reused for the blocked-recovery sheet body. Data (not JSX)
 * so multiple renderers (bottom sheet, banner, prominent modal)
 * consume the same source.
 */
export type RationaleCopy = {
  title: string;
  body: string;
  cta: string;
};

/**
 * What happens when a user hard-denies a capability.
 *
 *   'blockFeature'  — the feature is disabled with a persistent banner
 *                     linking to Settings. Use when the feature cannot
 *                     function AT ALL without the permission (e.g.
 *                     driver background location — no tracking =
 *                     no trip).
 *   'degradedMode'  — the feature keeps working with reduced fidelity.
 *                     Use for non-essential enhancements (e.g.
 *                     notifications — app still works, but relies on
 *                     in-app banners instead of push).
 */
export type DenialFallback = 'blockFeature' | 'degradedMode';

export type CapabilityDescriptor = {
  readonly roles: readonly UserRole[];
  readonly requiresProminentDisclosure: boolean;
  readonly requiresDeviceLocationOn: boolean;
  readonly rationale: RationaleCopy;
  readonly fallback: DenialFallback;
  readonly telemetryKey: PermissionTelemetryKey;
};

/* -----------------------------------------------------------------
 * The registry
 *
 * INVARIANT: keys of this record MUST exhaust the Capability union.
 * TypeScript enforces this via `Record<Capability, …>`. Adding a
 * new Capability value above without a descriptor here is a
 * compile error — that's the point.
 * ----------------------------------------------------------------- */

export const CAPABILITY_REGISTRY: Readonly<
  Record<Capability, CapabilityDescriptor>
> = {
  notifications: {
    roles: ['customer', 'vendor', 'driver', 'uc'],
    requiresProminentDisclosure: false,
    requiresDeviceLocationOn: false,
    rationale: {
      title: 'Stay updated',
      body: 'Get notified about bookings, trips, payments and support responses. You can turn this off anytime in Settings.',
      cta: 'Turn on notifications',
    },
    fallback: 'degradedMode',
    telemetryKey: 'notifications',
  },

  foregroundLocation: {
    roles: ['customer', 'driver'],
    requiresProminentDisclosure: false,
    requiresDeviceLocationOn: true,
    rationale: {
      title: 'Track your trip live',
      body: 'Urban Cruise uses your location to show real-time trip progress while the app is open.',
      cta: 'Allow location',
    },
    fallback: 'blockFeature',
    telemetryKey: 'foreground_location',
  },

  backgroundLocation: {
    roles: ['driver'],
    requiresProminentDisclosure: true,
    requiresDeviceLocationOn: true,
    // Prominent-disclosure body MUST include the word "location" and
    // one of "background" / "when the app is closed" per Play policy.
    // Do not edit the body without checking the Play Console policy
    // page — a review rejection will point straight back to this file.
    rationale: {
      title: 'Share trip location with customer',
      body:
        'Urban Cruise collects location data to enable live trip tracking and dispatch monitoring even when the app is closed or not in use. ' +
        'This is required to start a trip.',
      cta: 'Continue',
    },
    fallback: 'blockFeature',
    telemetryKey: 'background_location',
  },

  camera: {
    roles: ['customer', 'vendor', 'driver', 'uc'],
    requiresProminentDisclosure: false,
    requiresDeviceLocationOn: false,
    rationale: {
      title: 'Use your camera',
      body: 'Urban Cruise uses your camera for profile photos, vehicle documents and trip receipts.',
      cta: 'Allow camera',
    },
    fallback: 'blockFeature',
    telemetryKey: 'camera',
  },

  photoPicker: {
    // Anyone can pick — the OS picker is permissionless. Roles listed
    // for RBAC-audit symmetry with `camera`, not because a prompt fires.
    roles: ['customer', 'vendor', 'driver', 'uc'],
    requiresProminentDisclosure: false,
    requiresDeviceLocationOn: false,
    rationale: {
      title: 'Choose from library',
      body: 'Pick a photo without granting Urban Cruise access to your entire library.',
      cta: 'Open picker',
    },
    fallback: 'blockFeature',
    telemetryKey: 'photo_picker',
  },

  phoneDialer: {
    roles: ['customer', 'vendor', 'driver', 'uc'],
    requiresProminentDisclosure: false,
    requiresDeviceLocationOn: false,
    rationale: {
      title: 'Open dialer',
      body: 'Urban Cruise opens your phone app to place the call — the number is not stored.',
      cta: 'Call',
    },
    fallback: 'blockFeature',
    telemetryKey: 'phone_dialer',
  },

  downloadPdf: {
    roles: ['customer', 'vendor', 'driver', 'uc'],
    requiresProminentDisclosure: false,
    requiresDeviceLocationOn: false,
    rationale: {
      title: 'Save to Downloads',
      body: 'Urban Cruise saves this document to your Downloads folder so you can view or share it later.',
      cta: 'Download',
    },
    fallback: 'blockFeature',
    telemetryKey: 'download_pdf',
  },
};

/* -----------------------------------------------------------------
 * RBAC helpers
 * ----------------------------------------------------------------- */

/**
 * Type-safe capability lookup. Never throws — the registry is
 * exhaustive at compile time.
 */
export function getCapability(cap: Capability): CapabilityDescriptor {
  return CAPABILITY_REGISTRY[cap];
}

/**
 * True if `role` is allowed to request `cap`. Used by PermissionService
 * as the first gate — a mismatch fires a telemetry violation because
 * it means a screen leaked into the wrong role's stack.
 */
export function canRoleRequest(
  cap: Capability,
  role: UserRole | null,
): boolean {
  if (role === null) return false;
  return CAPABILITY_REGISTRY[cap].roles.includes(role);
}
