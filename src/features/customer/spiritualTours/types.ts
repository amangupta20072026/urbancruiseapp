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

/** One named stop. The card and the detail screen join the names. */
export type SpiritualTourPlace = {
  name: string;
  /** Absolute https URL, or null. Not shown anywhere today. */
  imageUrl: string | null;
};

/**
 * Which icon sits beside one fact. A closed set mapped to bundled icons
 * (components/TourFactStrip.tsx); an unknown value from a newer backend
 * becomes 'info' in the schema, so a fact never renders iconless.
 */
export type SpiritualTourFactIcon =
  | 'calendar'
  | 'users'
  | 'vehicle'
  | 'clock'
  | 'map-pin'
  | 'sun'
  | 'mountain'
  | 'info';

/**
 * One fact in the strip under the title, e.g. Duration · 10 – 12 Days.
 * The backend decides which facts exist, their order, labels and icons;
 * the app only lays them out. Values are DISPLAY STRINGS — never parsed.
 */
export type SpiritualTourFact = {
  icon: SpiritualTourFactIcon;
  label: string;
  value: string;
  /** Small line under the value, e.g. "9 – 26 Seater". */
  note: string | null;
};

/** One day (or group of days) of an itinerary section. */
export type SpiritualTourItineraryDay = {
  /** "Day 1", "Day 3 – 4" — a label, because days are often grouped. */
  dayLabel: string;
  title: string;
  detail: string | null;
};

/**
 * One row of a pricing section. `amount` is a display string including
 * the currency, e.g. "₹24,500". The app never parses it: a real
 * quotation is priced by the team, and this is indicative.
 */
export type SpiritualTourPrice = {
  label: string;
  amount: string;
  note: string | null;
};

/**
 * Which icon a section row (and its sheet header) shows. Closed set;
 * an unknown value becomes 'info' in the schema.
 */
export type SpiritualTourSectionIcon =
  | 'itinerary'
  | 'check'
  | 'cross'
  | 'rupee'
  | 'info'
  | 'list';

type SpiritualTourInfoSectionBase = {
  /** Stable key within one tour, e.g. "itinerary". */
  id: string;
  /** Row title and sheet title, e.g. "Itinerary". */
  title: string;
  icon: SpiritualTourSectionIcon;
  /** Sheet message while the section is empty; null = app default. */
  emptyText: string | null;
};

/**
 * One tappable row on the detail screen; tapping opens a bottom sheet.
 * The backend decides which rows exist, their order, titles and icons.
 * `kind` decides the sheet's layout. A kind this app does not know is
 * dropped by the schema, so the backend can add kinds safely.
 */
export type SpiritualTourInfoSection =
  | (SpiritualTourInfoSectionBase & {
      kind: 'itinerary';
      days: SpiritualTourItineraryDay[];
    })
  | (SpiritualTourInfoSectionBase & {
      kind: 'list';
      marker: 'check' | 'cross' | 'dot';
      items: string[];
    })
  | (SpiritualTourInfoSectionBase & {
      kind: 'pricing';
      rows: SpiritualTourPrice[];
      note: string | null;
    })
  | (SpiritualTourInfoSectionBase & {
      kind: 'text';
      body: string | null;
    });

export type SpiritualTour = {
  /** Stable slug, e.g. "char-dham-yatra". The detail screen's param. */
  id: string;
  region: SpiritualTourRegion;
  title: string;
  /** Smaller bracketed qualifier after the title, e.g. "(North, MP)". */
  titleNote: string | null;
  /**
   * Named stops, joined with "·" under the title on the card and on the
   * detail screen. Empty for tours described in prose instead.
   */
  places: SpiritualTourPlace[];
  /** Prose description, used under the title when `places` is empty. */
  summary: string | null;
  icon: SpiritualTourIcon;
  /**
   * Absolute https URL of the LIST CARD photograph, or null while ops has
   * not uploaded one. Null is a normal state, not an error: the card draws
   * a branded tile in its place.
   */
  imageUrl: string | null;

  /* ----- Detail screen -----
   * All optional. A tour with none of it still lists and still opens. */

  /** The fact strip under the title, in order. Empty hides the strip. */
  facts: SpiritualTourFact[];
  /** The "About the Tour" body. null hides that block. */
  overview: string | null;
  /** The tappable rows under About the Tour, in order. */
  sections: SpiritualTourInfoSection[];
};

/** One region heading and the tours under it, in catalog order. */
export type SpiritualTourSection = {
  region: SpiritualTourRegion;
  label: string;
  tours: SpiritualTour[];
};
