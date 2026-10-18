/**
 * ------------------------------------------------------------------
 * Vehicle brochures — API
 * ------------------------------------------------------------------
 * GET /config/brochures is public (no session) and cached by the
 * server (Cache-Control + ETag). The axios client unwraps the
 * `{ data, requestId }` envelope, so `data` here is the catalog.
 * ------------------------------------------------------------------
 */
import { apiClient } from '@api/axios';
import { endpoints } from '@api/endpoints';
import { logError } from '@services/telemetry';
import { parseBrochureCatalog } from './schema';
import type { BrochureEntry } from './types';

export async function fetchBrochureCatalog(): Promise<BrochureEntry[]> {
  const { data } = await apiClient.get<unknown>(endpoints.config.brochures());
  const { entries, droppedCount } = parseBrochureCatalog(data);

  if (droppedCount > 0) {
    // Non-fatal: the valid entries still load. Reported so a backend /
    // app contract drift is noticed instead of silently hiding cards.
    logError(
      new Error(`Dropped ${droppedCount} invalid brochure catalog entries`),
      {
        boundary: 'brochures.parse',
        extra: { droppedCount, loadedCount: entries.length },
      },
    );
  }

  return entries;
}
