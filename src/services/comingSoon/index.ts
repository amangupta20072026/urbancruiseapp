// src/services/comingSoon/index.ts

/**
 * ------------------------------------------------------------------
 * Coming soon — public surface
 * ------------------------------------------------------------------
 * Import from `@services/comingSoon` only. Internal files are not
 * part of the contract.
 *
 *   notifyComingSoon     — show the standard toast + record telemetry.
 *   ComingSoonFeature    — closed union of unfinished features.
 *   ComingSoonSource     — where the attempt came from.
 *
 * For "navigate if this role has the screen, otherwise say it's
 * coming soon", use `navigateOrComingSoon` from NavigationService.
 * ------------------------------------------------------------------
 */

export { notifyComingSoon } from './comingSoon';
export type { ComingSoonSource } from './comingSoon';
export { COMING_SOON_LABELS } from './features';
export type { ComingSoonFeature } from './features';
