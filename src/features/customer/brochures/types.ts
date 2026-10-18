/**
 * ------------------------------------------------------------------
 * Vehicle brochures — types
 * ------------------------------------------------------------------
 * Mirrors the backend `BrochureEntry` / `BrochureCatalogData`
 * (urbancruisebackend: src/modules/config/types.ts), served by
 * GET /config/brochures.
 *
 * Grouping: vehicle type → seater → tier. A group (`groupKey`) is
 * one vehicle type at one seater count and maps to one Unlisted
 * YouTube playlist; every tier of the group is one entry.
 * ------------------------------------------------------------------
 */
import type { VehicleTierKey } from '@features/customer/quotations/vehicleTierOptions';

/** Same keys as the quotation vehicle picker. */
export type BrochureTier = VehicleTierKey;

/**
 * Comparison facts for the Compare screen. `null` = not provided by
 * ops; the UI shows a dash, never "No".
 */
export type BrochureSpecs = {
  modelYear: string | null;
  airConditioning: string | null;
  seatType: string | null;
  chargingPoint: string | null;
  musicSystem: string | null;
  sofaBed: string | null;
  tv: string | null;
  panoramicWindow: string | null;
};

export type BrochureEntry = {
  /** Stable id of the group, shared by all its tiers. */
  groupKey: string;
  /** Top grouping level, e.g. "Force Traveller". */
  vehicleType: string;
  /** Second grouping level. */
  seater: number;
  tier: BrochureTier;
  /** Card title, e.g. "Force Traveller 13 Seater — Royal". */
  title: string;
  /** The group's playlist; null until ops creates it. */
  youtubePlaylistId: string | null;
  /** Videos for this tier, in display order. Empty = "Coming soon". */
  videoIds: string[];
  /** Facilities checklist shown under the video. */
  features: string[];
  specs: BrochureSpecs;
};

/* ---------------- Grouped view (Vehicle Brochures screen) ---------------- */

export type BrochureSeaterGroup = {
  groupKey: string;
  seater: number;
  youtubePlaylistId: string | null;
  /** Tiers in catalog order. */
  entries: BrochureEntry[];
};

export type BrochureVehicleTypeGroup = {
  vehicleType: string;
  /** Seater groups in catalog order. */
  seaters: BrochureSeaterGroup[];
};

/** What a screen knows about a vehicle when it looks up its brochure. */
export type BrochureLookup = {
  vehicleType: string;
  seater: number;
  tier: BrochureTier;
};
