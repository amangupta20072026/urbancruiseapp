/**
 * Builds the Vehicle Brochures screen's tree: vehicle type → seater
 * → tier. Order follows the catalog (first appearance), which ops
 * controls on the backend, so nothing is re-sorted here.
 */
import type {
  BrochureEntry,
  BrochureSeaterGroup,
  BrochureVehicleTypeGroup,
} from '../types';

export function groupBrochures(
  entries: readonly BrochureEntry[],
): BrochureVehicleTypeGroup[] {
  const types: BrochureVehicleTypeGroup[] = [];
  const typeIndex = new Map<string, BrochureVehicleTypeGroup>();
  const seaterIndex = new Map<string, BrochureSeaterGroup>();

  for (const entry of entries) {
    let typeGroup = typeIndex.get(entry.vehicleType);
    if (!typeGroup) {
      typeGroup = { vehicleType: entry.vehicleType, seaters: [] };
      typeIndex.set(entry.vehicleType, typeGroup);
      types.push(typeGroup);
    }

    let seaterGroup = seaterIndex.get(entry.groupKey);
    if (!seaterGroup) {
      seaterGroup = {
        groupKey: entry.groupKey,
        seater: entry.seater,
        youtubePlaylistId: entry.youtubePlaylistId,
        entries: [],
      };
      seaterIndex.set(entry.groupKey, seaterGroup);
      typeGroup.seaters.push(seaterGroup);
    }

    seaterGroup.entries.push(entry);
  }

  return types;
}
