/**
 * ------------------------------------------------------------------
 * Vehicle brochures — response validation
 * ------------------------------------------------------------------
 * The backend validates its catalog at startup, but the app still
 * checks what it receives: an older app must survive a newer
 * backend, and a broken payload must never crash a screen.
 *
 * Policy:
 *   - Wrong top-level shape  → BrochureCatalogFormatError (the query
 *     fails; screens show their error / hidden state).
 *   - One bad entry          → that entry is dropped, the rest load.
 *   - Unknown extra fields   → ignored (forward compatible).
 *   - A bad optional value   → safe default (null spec, no playlist,
 *     invalid video ids removed) instead of dropping the entry.
 *   - Duplicate (groupKey, tier) → first one wins.
 * ------------------------------------------------------------------
 */
import { z } from 'zod';
import type { BrochureEntry, BrochureSpecs, BrochureTier } from './types';

/** Thrown when the response is not a brochure catalog at all. */
export class BrochureCatalogFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BrochureCatalogFormatError';
  }
}

const TIERS = ['economy', 'premium', 'royal', 'royal_vip'] as const;

// Compile-time guard: fails to build if BrochureTier gains a key
// that TIERS does not list (or the other way round).
type MissingTier = Exclude<BrochureTier, (typeof TIERS)[number]>;
type ExtraTier = Exclude<(typeof TIERS)[number], BrochureTier>;
type AssertTrue<T extends true> = T;
export type TiersInSync = AssertTrue<
  [MissingTier, ExtraTier] extends [never, never] ? true : false
>;

/** Same rule as the backend: URL-safe characters, sane length. */
const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export function isYouTubeId(value: unknown): value is string {
  return typeof value === 'string' && YOUTUBE_ID_RE.test(value);
}

const DisplayText = z.string().trim().min(1);

const EMPTY_SPECS: BrochureSpecs = {
  modelYear: null,
  airConditioning: null,
  seatType: null,
  chargingPoint: null,
  musicSystem: null,
  sofaBed: null,
  tv: null,
  panoramicWindow: null,
};

const SpecValue = z.string().trim().min(1).nullable().catch(null);

const SpecsSchema = z
  .object({
    modelYear: SpecValue,
    airConditioning: SpecValue,
    seatType: SpecValue,
    chargingPoint: SpecValue,
    musicSystem: SpecValue,
    sofaBed: SpecValue,
    tv: SpecValue,
    panoramicWindow: SpecValue,
  })
  .catch({ ...EMPTY_SPECS });

const EntrySchema = z.object({
  groupKey: z.string().trim().min(1),
  vehicleType: DisplayText,
  seater: z.number().int().positive(),
  tier: z.enum(TIERS),
  title: DisplayText,
  youtubePlaylistId: z
    .string()
    .nullable()
    .catch(null)
    .transform(v => (isYouTubeId(v) ? v : null)),
  videoIds: z
    .array(z.unknown())
    .catch([])
    .transform(ids => ids.filter(isYouTubeId)),
  features: z
    .array(z.unknown())
    .catch([])
    .transform(items =>
      items
        .filter((f): f is string => typeof f === 'string')
        .map(f => f.trim())
        .filter(f => f.length > 0),
    ),
  specs: SpecsSchema,
});

const CatalogSchema = z.object({
  brochures: z.array(z.unknown()),
});

export type ParsedBrochureCatalog = {
  entries: BrochureEntry[];
  /** Entries that failed validation or were duplicates. */
  droppedCount: number;
};

/**
 * Validates the `data` of GET /config/brochures (the axios client has
 * already removed the `{ data, requestId }` envelope).
 */
export function parseBrochureCatalog(raw: unknown): ParsedBrochureCatalog {
  const top = CatalogSchema.safeParse(raw);
  if (!top.success) {
    throw new BrochureCatalogFormatError(
      'Brochure catalog response has an unexpected shape.',
    );
  }

  const entries: BrochureEntry[] = [];
  const seen = new Set<string>();
  let droppedCount = 0;

  for (const item of top.data.brochures) {
    const parsed = EntrySchema.safeParse(item);
    if (!parsed.success) {
      droppedCount += 1;
      continue;
    }
    const key = `${parsed.data.groupKey}|${parsed.data.tier}`;
    if (seen.has(key)) {
      droppedCount += 1;
      continue;
    }
    seen.add(key);
    entries.push(parsed.data);
  }

  return { entries, droppedCount };
}
