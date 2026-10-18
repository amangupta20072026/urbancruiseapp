/**
 * Opens a brochure video in the YouTube app (or the browser when the
 * app is not installed — the OS decides for https URLs).
 *
 * Used directly in Step 3, and as the fallback of the in-app player
 * (Step 4) when YouTube refuses to play embedded (e.g. Error 153).
 * Never throws: a failure shows a toast and is logged.
 */
import { Linking } from 'react-native';
import { toast } from '@services/toast';
import { logError, logEvent } from '@services/telemetry';
import type { BrochureEntry } from '../types';
import { buildYouTubeUrlForEntry } from './youtube';

export type BrochureOpenSource =
  | 'vehicle_card'
  | 'vehicle_details'
  | 'brochure_list'
  | 'compare'
  | 'video_screen'
  | 'player_fallback';

export async function openBrochureInYouTube(
  entry: BrochureEntry,
  videoIndex: number,
  source: BrochureOpenSource,
): Promise<boolean> {
  const props = {
    groupKey: entry.groupKey,
    seater: entry.seater,
    tier: entry.tier,
    videoIndex,
    source,
  };

  const url = buildYouTubeUrlForEntry(entry, videoIndex);
  if (!url) {
    logEvent('brochure.open_failed', { ...props, reason: 'no_url' });
    toast.error('This video is not available yet.');
    return false;
  }

  try {
    await Linking.openURL(url);
    logEvent('brochure.opened', props);
    return true;
  } catch (error) {
    logEvent('brochure.open_failed', { ...props, reason: 'open_url' });
    logError(error, { boundary: 'brochures.openInYouTube', extra: props });
    toast.error("Couldn't open the video. Please try again.");
    return false;
  }
}
