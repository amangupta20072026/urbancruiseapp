/**
 * ------------------------------------------------------------------
 * Spiritual Tours — grouping
 * ------------------------------------------------------------------
 * Turns the flat catalog into the screen's region sections.
 *
 * The BACKEND decides the running order: it sorts the catalog by its
 * own REGION_ORDER before sending it. So this walks the array once
 * and opens a new section each time the region changes, rather than
 * imposing an order the app invented. Reordering regions is then a
 * backend deploy, not an app release.
 *
 * A region with no tours produces no section, so no empty heading can
 * appear on screen.
 * ------------------------------------------------------------------ */
import {
  REGION_LABEL,
  type SpiritualTour,
  type SpiritualTourSection,
} from '../types';

export function groupToursByRegion(
  tours: readonly SpiritualTour[],
): SpiritualTourSection[] {
  const sections: SpiritualTourSection[] = [];
  const byRegion = new Map<string, SpiritualTourSection>();

  for (const tour of tours) {
    let section = byRegion.get(tour.region);

    if (!section) {
      section = {
        region: tour.region,
        label: REGION_LABEL[tour.region],
        tours: [],
      };
      byRegion.set(tour.region, section);
      sections.push(section);
    }

    section.tours.push(tour);
  }

  return sections;
}

/** One tour by id, or null. Used by the detail screen. */
export function findTourById(
  tours: readonly SpiritualTour[],
  id: string,
): SpiritualTour | null {
  return tours.find(t => t.id === id) ?? null;
}
