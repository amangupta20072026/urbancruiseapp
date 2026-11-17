/**
 * ------------------------------------------------------------------
 * Quotation highlights — card zoom controller
 * ------------------------------------------------------------------
 * The opening animation: the tapped quotation card grows to full
 * screen, showing the first highlight image, and the highlights
 * screen then appears underneath with no animation of its own.
 *
 * WHY AN OVERLAY (not a shared-element transition):
 *   Reanimated's shared-element transitions are still experimental
 *   (behind a feature flag) on the New Architecture, so they are not
 *   used. Instead `HighlightsZoomHost` (mounted once in App.tsx, above
 *   the navigator) draws the growing card, and this module is how the
 *   rest of the app talks to it.
 *
 * SEQUENCE:
 *   1. useOpenQuotationDetail calls `startHighlightsZoom(rect, onCovered)`
 *      with the card's on-screen rectangle.
 *   2. The host grows a view from that rectangle to full screen.
 *   3. When it is full screen the host calls `onCovered`, which opens
 *      QuotationHighlights with `zoomEntry: true` (no screen animation).
 *   4. QuotationHighlights calls `finishHighlightsZoom()` once its
 *      first image is ready; the host fades out and unmounts.
 *      The host also gives up on its own after
 *      HIGHLIGHT_ZOOM_MAX_HOLD_MS, so it can never stay on screen.
 * ------------------------------------------------------------------
 */

/** A rectangle in window coordinates (from `measureInWindow`). */
export type ZoomOrigin = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ZoomRequest = {
  origin: ZoomOrigin;
  /** Called once, when the overlay fully covers the screen. */
  onCovered: () => void;
};

type HostListener = {
  start: (req: ZoomRequest) => boolean;
  finish: () => void;
};

let host: HostListener | null = null;

/** Used by HighlightsZoomHost only. Returns an unregister function. */
export function registerHighlightsZoomHost(listener: HostListener): () => void {
  host = listener;
  return () => {
    if (host === listener) host = null;
  };
}

/**
 * Starts the zoom. Returns false (and does nothing) when there is no
 * host mounted or a zoom is already running; the caller then opens
 * the highlights screen the normal way.
 */
export function startHighlightsZoom(
  origin: ZoomOrigin,
  onCovered: () => void,
): boolean {
  if (!host) return false;
  if (origin.width <= 0 || origin.height <= 0) return false;
  return host.start({ origin, onCovered });
}

/** Fades the overlay out. Safe to call when no zoom is running. */
export function finishHighlightsZoom(): void {
  host?.finish();
}
