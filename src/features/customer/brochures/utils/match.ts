/**
 * Finds the brochure for a vehicle. This is the ONLY place that
 * decides which brochure belongs to which vehicle, so changing the
 * rule later (e.g. the backend sending a brochure id with each
 * vehicle) is a one-file change.
 *
 * Current rule: same vehicle type + seater + tier. Vehicle type is
 * compared ignoring case and repeated spaces, so "Force  traveller"
 * still matches "Force Traveller". No fuzzy matching beyond that:
 * no brochure is better than the wrong brochure.
 */
import type { VehicleOption } from '@features/customer/quotations/vehicleTierOptions';
import type { BrochureEntry, BrochureLookup, BrochureTier } from '../types';

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function findBrochure(
  entries: readonly BrochureEntry[],
  lookup: BrochureLookup,
): BrochureEntry | null {
  const type = normalize(lookup.vehicleType);
  return (
    entries.find(
      e =>
        e.tier === lookup.tier &&
        e.seater === lookup.seater &&
        normalize(e.vehicleType) === type,
    ) ?? null
  );
}

/**
 * For screens that will receive a brochure `groupKey` from the
 * backend (Accepted / Expired quotations, once the quotations API
 * sends it).
 */
export function findBrochureByGroupKey(
  entries: readonly BrochureEntry[],
  groupKey: string,
  tier: BrochureTier,
): BrochureEntry | null {
  return entries.find(e => e.groupKey === groupKey && e.tier === tier) ?? null;
}

/** The lookup for one card of the "Choose Your Vehicle" picker. */
export function lookupForVehicleOption(option: VehicleOption): BrochureLookup {
  return { vehicleType: option.model, seater: option.seats, tier: option.tier };
}

/** False → show "Coming soon" instead of a play action. */
export function hasVideo(entry: BrochureEntry): boolean {
  return entry.videoIds.length > 0;
}

/**
 * Ids of the vehicle options whose brochure is `entry`. Used by the
 * Brochures list: the "Select this vehicle" CTA is offered only when
 * exactly one option matches (two options can share a brochure).
 */
export function vehicleOptionIdsFor(
  entry: BrochureEntry,
  options: readonly VehicleOption[],
): string[] {
  return options
    .filter(o => findBrochure([entry], lookupForVehicleOption(o)) !== null)
    .map(o => o.id);
}
