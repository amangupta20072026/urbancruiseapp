/**
 * YouTube URLs:
 *   - watch / playlist links for the "Open in YouTube" fallback (used
 *     when the in-app player cannot play a video);
 *   - video thumbnails, used as the vehicle photo until ops uploads a
 *     real one (`imageUrl`).
 * Ids are validated by the response schema; they are still
 * URL-encoded here so a bad id can never change the URL's structure.
 */
import type { BrochureEntry } from '../types';

const YOUTUBE_ORIGIN = 'https://www.youtube.com';
const YOUTUBE_IMAGE_ORIGIN = 'https://i.ytimg.com';

export function buildYouTubeWatchUrl(videoId: string): string {
  return `${YOUTUBE_ORIGIN}/watch?v=${encodeURIComponent(videoId)}`;
}

export function buildYouTubePlaylistUrl(playlistId: string): string {
  return `${YOUTUBE_ORIGIN}/playlist?list=${encodeURIComponent(playlistId)}`;
}

/**
 * A video's thumbnail. `mqdefault` is 320 × 180 — true 16:9 with no
 * black letterbox bars (unlike `hqdefault`), and it exists for every
 * public or unlisted video. Same host the YouTube Data API returns in
 * `snippet.thumbnails`.
 */
export function buildYouTubeThumbnailUrl(videoId: string): string {
  return `${YOUTUBE_IMAGE_ORIGIN}/vi/${encodeURIComponent(
    videoId,
  )}/mqdefault.jpg`;
}

/**
 * The picture to show for one brochure entry:
 *   1. its real photo (`imageUrl`, uploaded by ops), else
 *   2. the thumbnail of its first video, else
 *   3. null — the caller draws its own placeholder.
 * A real imageUrl added later replaces the thumbnail with no app
 * change.
 */
export function brochureImageUrl(entry: BrochureEntry): string | null {
  if (entry.imageUrl) return entry.imageUrl;
  const firstVideoId = entry.videoIds[0];
  return firstVideoId !== undefined
    ? buildYouTubeThumbnailUrl(firstVideoId)
    : null;
}

/**
 * Best URL to open for an entry: the given video, else the group's
 * playlist, else null (nothing to open — the UI shows "Coming soon").
 */
export function buildYouTubeUrlForEntry(
  entry: BrochureEntry,
  videoIndex = 0,
): string | null {
  const videoId = entry.videoIds[videoIndex];
  if (videoId !== undefined) return buildYouTubeWatchUrl(videoId);
  if (entry.youtubePlaylistId) {
    return buildYouTubePlaylistUrl(entry.youtubePlaylistId);
  }
  return null;
}
