/**
 * ------------------------------------------------------------------
 * Spiritual Tours — response validation
 * ------------------------------------------------------------------
 * The backend validates its catalog at startup, but the app still
 * checks what it receives: an older app must survive a newer backend,
 * and a broken payload must never crash the screen.
 *
 * Policy (same as brochures/schema.ts):
 *   - Wrong top-level shape   → SpiritualTourFormatError (the query
 *     fails; the screen shows its error view with Try again).
 *   - One bad entry           → that entry is dropped, the rest load.
 *   - Unknown extra fields    → ignored (forward compatible).
 *   - A bad optional value    → safe default rather than a drop:
 *     an unknown icon becomes 'temple', a non-https or malformed
 *     image URL becomes null (the card draws its own tile), bad
 *     places entries are filtered out.
 *   - Duplicate id            → first one wins.
 *
 * An unknown REGION is a drop, not a default. Regions decide which
 * heading a tour sits under, and filing a southern tour under North
 * would be a visible lie — better to show one card fewer.
 * ------------------------------------------------------------------ */
import { z } from 'zod';
import type {
  SpiritualTour,
  SpiritualTourFacts,
  SpiritualTourIcon,
  SpiritualTourRegion,
} from './types';

/** Thrown when the response is not a tour catalog at all. */
export class SpiritualTourFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpiritualTourFormatError';
  }
}

const REGIONS = [
  'north',
  'south',
  'east',
  'west',
  'central',
  'northeast',
] as const;

const ICONS = ['temple', 'trishul', 'om', 'ganesh', 'shivling'] as const;

/* Compile-time guards: the build fails if the union and the runtime
 * list drift apart in either direction. Same device as brochures'
 * TiersInSync. */
type AssertTrue<T extends true> = T;

type MissingRegion = Exclude<SpiritualTourRegion, (typeof REGIONS)[number]>;
type ExtraRegion = Exclude<(typeof REGIONS)[number], SpiritualTourRegion>;
export type RegionsInSync = AssertTrue<
  [MissingRegion, ExtraRegion] extends [never, never] ? true : false
>;

type MissingIcon = Exclude<SpiritualTourIcon, (typeof ICONS)[number]>;
type ExtraIcon = Exclude<(typeof ICONS)[number], SpiritualTourIcon>;
export type IconsInSync = AssertTrue<
  [MissingIcon, ExtraIcon] extends [never, never] ? true : false
>;

/** Same rule as the backend: absolute https only. */
const HTTPS_URL_RE = /^https:\/\/[^\s<>"]+$/;

export function isHttpsUrl(value: unknown): value is string {
  return typeof value === 'string' && HTTPS_URL_RE.test(value);
}

const DisplayText = z.string().trim().min(1);

/** Trims strings, drops blanks, and keeps only strings. */
const StringList = z
  .array(z.unknown())
  .catch([])
  .transform(items =>
    items
      .filter((v): v is string => typeof v === 'string')
      .map(v => v.trim())
      .filter(v => v.length > 0),
  );

/** Keeps only absolute https URLs. */
const UrlList = z
  .array(z.unknown())
  .catch([])
  .transform(items => items.filter(isHttpsUrl));

const PlaceSchema = z.object({
  name: DisplayText,
  imageUrl: z.unknown().transform(v => (isHttpsUrl(v) ? v : null)),
});

const NullableText = DisplayText.nullable().catch(null);

const EMPTY_FACTS: SpiritualTourFacts = {
  duration: null,
  travelMode: null,
  bestSeason: null,
  difficulty: null,
};

const FactsSchema = z
  .object({
    duration: NullableText,
    travelMode: NullableText,
    bestSeason: NullableText,
    difficulty: NullableText,
  })
  .catch({ ...EMPTY_FACTS });

const ItineraryDaySchema = z.object({
  dayLabel: DisplayText,
  title: DisplayText,
  detail: NullableText,
});

const PriceSchema = z.object({
  label: DisplayText,
  amount: DisplayText,
  note: NullableText,
});

/**
 * A malformed row inside a LIST is dropped on its own rather than failing
 * the whole tour: one bad itinerary day should cost that day, not the
 * screen. `.catch([])` on the array covers the case where the field is not
 * an array at all.
 */
function rowList<T extends z.ZodTypeAny>(row: T) {
  return z
    .array(z.unknown())
    .catch([])
    .transform(items => {
      const kept: z.infer<T>[] = [];
      for (const item of items) {
        const parsed = row.safeParse(item);
        if (parsed.success) kept.push(parsed.data);
      }
      return kept;
    });
}

const EntrySchema = z.object({
  id: z.string().trim().min(1),
  region: z.enum(REGIONS),
  title: DisplayText,
  titleNote: NullableText,
  places: rowList(PlaceSchema),
  summary: NullableText,
  icon: z.enum(ICONS).catch('temple'),
  imageUrl: z.unknown().transform(v => (isHttpsUrl(v) ? v : null)),

  // Detail screen. Every one has a safe empty default, so an older backend
  // that does not send them yet still produces a tour that lists and opens.
  tagline: NullableText,
  heroImages: UrlList,
  facts: FactsSchema,
  overview: NullableText,
  highlights: StringList,
  itinerary: rowList(ItineraryDaySchema),
  inclusions: StringList,
  exclusions: StringList,
  pricing: rowList(PriceSchema),
  pricingNote: NullableText,
});

const CatalogSchema = z.object({
  tours: z.array(z.unknown()),
});

export type ParsedSpiritualTourCatalog = {
  tours: SpiritualTour[];
  /** Entries that failed validation or were duplicates. */
  droppedCount: number;
};

/**
 * Validates the `data` of GET /config/spiritual-tours (the axios
 * client has already removed the `{ data, requestId }` envelope).
 */
export function parseSpiritualTourCatalog(
  raw: unknown,
): ParsedSpiritualTourCatalog {
  const top = CatalogSchema.safeParse(raw);
  if (!top.success) {
    throw new SpiritualTourFormatError(
      'Spiritual tours response has an unexpected shape.',
    );
  }

  const tours: SpiritualTour[] = [];
  const seen = new Set<string>();
  let droppedCount = 0;

  for (const item of top.data.tours) {
    const parsed = EntrySchema.safeParse(item);
    if (!parsed.success) {
      droppedCount += 1;
      continue;
    }

    // The backend guarantees one of these is present. A payload that
    // breaks that promise would render a card with a blank second
    // line, so drop it rather than show it.
    if (parsed.data.places.length === 0 && parsed.data.summary === null) {
      droppedCount += 1;
      continue;
    }

    if (seen.has(parsed.data.id)) {
      droppedCount += 1;
      continue;
    }
    seen.add(parsed.data.id);
    tours.push(parsed.data);
  }

  return { tours, droppedCount };
}
