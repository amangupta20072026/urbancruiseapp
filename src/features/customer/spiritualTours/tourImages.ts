/**
 * ------------------------------------------------------------------
 * Spiritual Tours — bundled artwork
 * ------------------------------------------------------------------
 * Maps a tour's id to the PNG shipped inside the app.
 *
 * WHY A LOOKUP AND NOT THE FILENAME'S NUMBER
 *   The files are named positionally — 01-, 02-, 03- — but position
 *   is not identity. The moment ops reorders the catalogue or adds a
 *   seventh tour in the middle, a position-based lookup hands every
 *   card the wrong picture, and it does so SILENTLY: each card still
 *   shows a valid image, just somebody else's. An id-keyed map
 *   cannot drift that way, and the filenames already carry the id.
 *
 * WHY `require` AND NOT A DYNAMIC PATH
 *   Metro resolves `require` at build time and bundles what it finds.
 *   A computed path — require(`@assets/images/${id}.png`) — resolves
 *   to nothing and throws at runtime. Every entry must be written out
 *   in full, which is also why the asserts below are worth having.
 *
 * ADDING A TOUR
 *   Drop the PNG in src/assets/images/ and add one line here keyed by
 *   the backend id. Forgetting is safe: the card falls back to the
 *   tour's drawn mark rather than crashing. But the card looks poorer,
 *   so prefer the backend's `imageUrl` for anything added after a
 *   release has shipped — that needs no app change at all.
 * ------------------------------------------------------------------ */
import type { ImageSourcePropType } from 'react-native';

/**
 * Keyed by the `id` in the backend catalogue
 * (urbancruiseappbackend/src/modules/config/data/spiritual-tours.ts),
 * NOT by the number in the filename.
 */
export const TOUR_IMAGES: Record<string, ImageSourcePropType> = {
  'char-dham-yatra': require('@assets/images/01-char-dham-yatra.png'),
  'ayodhya-prayagraj-varanasi': require('@assets/images/02-ayodhya-prayagraj-varanasi.png'),
  'shakti-peeth-tour-north-mp': require('@assets/images/03-shakti-peeth-tour.png'),
  'ujjain-omkareshwar': require('@assets/images/04-ujjain-omkareshwar.png'),
  'ashtvinayak-yatra': require('@assets/images/05-ashtavinayak-yatra.png'),
  'jyotirlinga-tours': require('@assets/images/06-jyotirlinga-tours.png'),
};

/**
 * The bundled artwork for a tour, or null when none ships for it.
 * Null is a normal state — a tour added on the backend after this
 * release has no bundled image — so callers draw the tour's mark
 * instead.
 */
export function bundledTourImage(id: string): ImageSourcePropType | null {
  return TOUR_IMAGES[id] ?? null;
}
