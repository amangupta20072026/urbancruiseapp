/**
 * ------------------------------------------------------------------
 * Spiritual Tours — API
 * ------------------------------------------------------------------
 * GET /config/spiritual-tours is public (no session) and cached by
 * the server (Cache-Control + ETag). The axios client unwraps the
 * `{ data, requestId }` envelope, so `data` here is the catalog.
 * ------------------------------------------------------------------ */
import { apiClient } from '@api/axios';
import { endpoints } from '@api/endpoints';
import { logError } from '@services/telemetry';
import { parseSpiritualTourCatalog } from './schema';
import type { SpiritualTour } from './types';

export async function fetchSpiritualTours(): Promise<SpiritualTour[]> {
  const { data } = await apiClient.get<unknown>(
    endpoints.config.spiritualTours(),
  );
  const { tours, droppedCount } = parseSpiritualTourCatalog(data);

  if (droppedCount > 0) {
    // Non-fatal: the valid tours still render. Reported so a backend /
    // app contract drift is noticed instead of silently hiding cards.
    logError(
      new Error(`Dropped ${droppedCount} invalid spiritual tour entries`),
      {
        boundary: 'spiritualTours.parse',
        extra: { droppedCount, loadedCount: tours.length },
      },
    );
  }

  return tours;
}
