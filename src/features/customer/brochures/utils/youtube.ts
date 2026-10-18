/**
 * YouTube URLs for the "Open in YouTube" fallback (used when the
 * in-app player cannot play a video). Ids are validated by the
 * response schema; they are still URL-encoded here so a bad id can
 * never change the URL's structure.
 */
import type { BrochureEntry } from '../types';

const YOUTUBE_ORIGIN = 'https://www.youtube.com';

export function buildYouTubeWatchUrl(videoId: string): string {
  return `${YOUTUBE_ORIGIN}/watch?v=${encodeURIComponent(videoId)}`;
}

export function buildYouTubePlaylistUrl(playlistId: string): string {
  return `${YOUTUBE_ORIGIN}/playlist?list=${encodeURIComponent(playlistId)}`;
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
