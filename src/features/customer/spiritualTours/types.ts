/**
 * ------------------------------------------------------------------
 * Spiritual Tours — types
 * ------------------------------------------------------------------
 * Mirrors the backend's `src/modules/config/types.ts` spiritual-tour
 * block exactly, so the payload round-trips without a translation
 * layer. Local to this feature, like `customer/home/types.ts`: when
 * another feature needs a tour, these get promoted.
 * ------------------------------------------------------------------ */

/**
 * The band of the country a tour belongs to. The screen renders one
 * heading per region that actually has tours — a region with none
 * produces no heading at all.
 *
 * Only 'north' and 'west' are populated today. The rest exist so ops
 * can add a southern tour with a backend deploy instead of an app
 * release.
 */
export type SpiritualTourRegion =
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'central'
  | 'northeast';

/** Heading text per region, as the design sets it (upper case). */
export const REGION_LABEL: Record<SpiritualTourRegion, string> = {
  north: 'NORTH',
  west: 'WEST',
  south: 'SOUTH',
  east: 'EAST',
  central: 'CENTRAL',
  northeast: 'NORTH EAST',
};

/**
 * Which line icon sits beside the tour title. A closed set: each value
 * maps to a hand-drawn SVG in `components/TourIcon.tsx`. A newer
 * backend sending an unknown value falls back to 'temple' in the
 * schema, so a card never renders iconless.
 */
export type SpiritualTourIcon =
  | 'temple'
  | 'trishul'
  | 'om'
  | 'ganesh'
  | 'shivling';

/** One named stop: the card joins the names, the detail shows the tiles. */
export type SpiritualTourPlace = {
  name: string;
  /** Absolute https URL, or null until ops uploads the tile photograph. */
  imageUrl: string | null;
};

/**
 * The four facts in the strip under the destinations. All DISPLAY STRINGS
 * set by ops — "10 – 12 Days" is a range, "Car / Tempo / Bus" is a list —
 * so the app only ever prints them. null hides that fact rather than
 * printing a dash.
 */
export type SpiritualTourFacts = {
  duration: string | null;
  travelMode: string | null;
  bestSeason: string | null;
  difficulty: string | null;
};

/** One row of the Itinerary tab. */
export type SpiritualTourItineraryDay = {
  /** "Day 1", "Day 3 – 4" — a label, because days are often grouped. */
  dayLabel: string;
  title: string;
  detail: string | null;
};

/**
 * One row of the Pricing tab. `amount` is a display string including the
 * currency, e.g. "₹24,500". The app never parses it: a real quotation is
 * priced by the team through the enquiry flow, and this tab is indicative.
 */
export type SpiritualTourPrice = {
  label: string;
  amount: string;
  note: string | null;
};

export type SpiritualTour = {
  /** Stable slug, e.g. "char-dham-yatra". The detail screen's param. */
  id: string;
  region: SpiritualTourRegion;
  title: string;
  /** Smaller bracketed qualifier after the title, e.g. "(North, MP)". */
  titleNote: string | null;
  /**
   * Named stops. Names joined with "·" on the card; picture tiles on the
   * detail screen. Empty for tours described in prose instead.
   */
  places: SpiritualTourPlace[];
  /** Prose description, used on the card when `places` is empty. */
  summary: string | null;
  icon: SpiritualTourIcon;
  /**
   * Absolute https URL of the LIST CARD photograph, or null while ops has
   * not uploaded one. Null is a normal state, not an error: the card draws
   * a branded tile in its place.
   */
  imageUrl: string | null;

  /* ----- Detail screen -----
   * All optional. A tour with none of it still lists and still opens; its
   * tabs just show empty states. That lets ops publish a tour as soon as
   * its name and stops are known and write it up later. */

  /** One line under the title on the detail screen. */
  tagline: string | null;
  /** Carousel images, in order. Empty falls back to `imageUrl`, then a tile. */
  heroImages: string[];
  facts: SpiritualTourFacts;
  /** The "About the Tour" body on the Overview tab. */
  overview: string | null;
  /** The ticked list in the Tour Highlights panel. */
  highlights: string[];
  itinerary: SpiritualTourItineraryDay[];
  inclusions: string[];
  exclusions: string[];
  pricing: SpiritualTourPrice[];
  /** Small print under the price rows. */
  pricingNote: string | null;
};

/** One region heading and the tours under it, in catalog order. */
export type SpiritualTourSection = {
  region: SpiritualTourRegion;
  label: string;
  tours: SpiritualTour[];
};
