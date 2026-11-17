/**
 * ------------------------------------------------------------------
 * Quotation highlights — overlay controller
 * ------------------------------------------------------------------
 * In-app taps on a quotation play the brand images ON TOP OF the
 * screen the customer tapped (the quotation list), so the first image
 * flips down right over that list. `HighlightsStoryHost` (mounted once
 * in App.tsx, above the navigator) draws them; this module is how the
 * rest of the app talks to it.
 *
 * WHY AN OVERLAY (not a see-through screen):
 *   A transparent native screen (`presentation: 'transparentModal'`)
 *   would also show the list behind, but replacing a modal with a
 *   normal screen at the end is fragile on iOS. An overlay keeps the
 *   navigation stack exactly as before: list → QuotationDetail.
 *
 * SEQUENCE:
 *   1. useOpenQuotationDetail calls `startHighlightsStory(onFinish)`.
 *   2. The host shows HighlightsStory over everything, see-through
 *      until the first image has flipped down.
 *   3. After the last image the host calls `onFinish` (which opens
 *      QuotationDetail underneath), then fades itself out.
 *   If no host is mounted, `startHighlightsStory` returns false and the
 *   caller opens the QuotationHighlights screen instead.
 * ------------------------------------------------------------------
 */

type HostListener = {
  start: (onFinish: () => void) => boolean;
};

let host: HostListener | null = null;

/** Used by HighlightsStoryHost only. Returns an unregister function. */
export function registerHighlightsStoryHost(
  listener: HostListener,
): () => void {
  host = listener;
  return () => {
    if (host === listener) host = null;
  };
}

/**
 * Plays the highlights over the current screen. Returns false (and
 * does nothing) when no host is mounted or one is already playing.
 */
export function startHighlightsStory(onFinish: () => void): boolean {
  return host ? host.start(onFinish) : false;
}
