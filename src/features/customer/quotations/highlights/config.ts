/**
 * ------------------------------------------------------------------
 * Quotation highlights — configuration
 * ------------------------------------------------------------------
 * Three full-screen brand images shown, in this order, before the
 * Quotation Details screen opens. Product decisions (confirmed):
 *
 *   - Shown EVERY time, for 5 seconds per image.
 *   - No Skip button; progress bars only.
 *   - Android back and iOS swipe-back do nothing while showing.
 *   - Whole image always visible (resizeMode 'contain', nothing cut).
 *   - Only for quotations in ELIGIBLE_STATUSES (Pending, Accepted).
 *     Expired quotations open the details screen directly.
 *   - Entry points: card tap, View Details, Book Now, Pay Now
 *     (Payments tab), and notification / deep links.
 *
 * Asset file names are kept exactly as added to the repo (product
 * decision). They are safe in Android release builds: React Native
 * strips spaces and '-' when it builds resource names
 * (@react-native/assets-registry/path-support.js,
 * getAndroidResourceIdentifier), giving `src_assets_images_vehiclepage`,
 * `src_assets_images_panindiaservice`, `src_assets_images_why_choose_us`.
 * ------------------------------------------------------------------
 */
import type { ImageSourcePropType } from 'react-native';

import type { QuotationStatus } from '../types';

/** How long each image stays on screen. */
export const HIGHLIGHT_SLIDE_DURATION_MS = 5000;

/**
 * Safety net, not a feature: if an image never reports onLoad or
 * onError (should not happen for bundled assets), its timer starts
 * anyway after this delay. The customer can't skip or go back, so a
 * stuck image must never trap them on this screen.
 */
export const HIGHLIGHT_LOAD_TIMEOUT_MS = 2000;

/** Statuses that show the highlights before the details screen. */
export const HIGHLIGHT_ELIGIBLE_STATUSES: ReadonlySet<QuotationStatus> =
  new Set<QuotationStatus>(['pending', 'accepted']);

export type HighlightSlide = {
  readonly key: 'vehicles' | 'panIndia' | 'whyChooseUs';
  readonly source: ImageSourcePropType;
  /** Read out by TalkBack / VoiceOver. */
  readonly accessibilityLabel: string;
};

/** Display order matters: vehicles → pan-India → why choose us. */
export const HIGHLIGHT_SLIDES: readonly HighlightSlide[] = [
  {
    key: 'vehicles',
    source: require('@assets/images/vehicle page.png'),
    accessibilityLabel:
      'Urban Cruise widest range of vehicles: cars, vans and buses',
  },
  {
    key: 'panIndia',
    source: require('@assets/images/Pan-India Service.png'),
    accessibilityLabel: 'Urban Cruise Pan-India service available in 21 cities',
  },
  {
    key: 'whyChooseUs',
    source: require('@assets/images/why_choose_us.png'),
    accessibilityLabel: 'Why choose Urban Cruise: credentials and features',
  },
];
