/**
 * ------------------------------------------------------------------
 * BrochurePlayer — the 16:9 video area of the Vehicle Video screen
 * ------------------------------------------------------------------
 *   Android → in-app YouTube player (YouTubePlayer).
 *   iOS     → poster that opens YouTube (BrochureVideoStage). In-app
 *             playback on iOS needs the final App Store bundle id as
 *             the player's identity; until it exists iOS opens the
 *             YouTube app / browser, which needs no identity.
 *
 * When the Android player fails (any YouTube player error, including
 * 153 "no identity", embedding disabled by the owner, video removed,
 * no network, timeout) it shows the error view: "Try again" remounts
 * the player, "Open in YouTube" hands the video to YouTube.
 * ------------------------------------------------------------------
 */
import React, { useCallback, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { AlertTriangle, ExternalLink } from 'lucide-react-native';
import { Colors, Radius, Spacing, Typography } from '@theme';
import { logEvent } from '@services/telemetry';
import type { BrochureEntry } from '../types';
import { openBrochureInYouTube } from '../utils/openInYouTube';
import { BrochureVideoStage } from './BrochureVideoStage';
import { YouTubePlayer, type YouTubePlayerErrorCode } from './YouTubePlayer';

/** Read at render time so tests (and future flags) can change it. */
export function isInAppPlayerEnabled(): boolean {
  return Platform.OS === 'android';
}

export type BrochurePlayerProps = {
  entry: BrochureEntry;
  videoIndex: number;
};

export const BrochurePlayer: React.FC<BrochurePlayerProps> = ({
  entry,
  videoIndex,
}) => {
  const { width } = useWindowDimensions();
  const height = Math.round((width * 9) / 16);
  const videoCount = entry.videoIds.length;
  const videoId = entry.videoIds[videoIndex];

  // Bumped by "Try again" to remount the WebView from scratch.
  const [attempt, setAttempt] = useState(0);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const playerKey = `${videoId ?? ''}#${attempt}`;
  const failed = failedKey === playerKey;

  const onOpenInYouTube = useCallback(
    (source: 'video_screen' | 'player_fallback') => {
      openBrochureInYouTube(entry, videoIndex, source).catch(() => {
        // never rejects; see openBrochureInYouTube
      });
    },
    [entry, videoIndex],
  );

  const onPlayerError = useCallback(
    (code: YouTubePlayerErrorCode) => {
      logEvent('brochure.open_failed', {
        groupKey: entry.groupKey,
        seater: entry.seater,
        tier: entry.tier,
        videoIndex,
        source: 'in_app_player',
        reason: `player_${String(code)}`,
      });
      setFailedKey(playerKey);
    },
    [entry, videoIndex, playerKey],
  );

  const onFirstPlay = useCallback(() => {
    logEvent('brochure.opened', {
      groupKey: entry.groupKey,
      seater: entry.seater,
      tier: entry.tier,
      videoIndex,
      source: 'in_app_player',
    });
  }, [entry, videoIndex]);

  if (!isInAppPlayerEnabled() || videoId === undefined) {
    return (
      <BrochureVideoStage
        title={entry.title}
        videoNumber={videoIndex + 1}
        videoCount={videoCount}
        onPlay={() => onOpenInYouTube('video_screen')}
      />
    );
  }

  if (failed) {
    return (
      <View style={[styles.error, { width, height }]} accessibilityRole="alert">
        <AlertTriangle size={28} color={Colors.warning} strokeWidth={2} />
        <Text style={styles.errorTitle}>Video couldn’t load</Text>
        <Text style={styles.errorMessage}>
          Check your internet connection, or watch it on YouTube.
        </Text>
        <View style={styles.errorActions}>
          <Pressable
            onPress={() => setAttempt(a => a + 1)}
            style={({ pressed }) => [
              styles.errorBtn,
              styles.retryBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Try loading the video again"
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
          <Pressable
            onPress={() => onOpenInYouTube('player_fallback')}
            style={({ pressed }) => [
              styles.errorBtn,
              styles.youtubeBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open this video in YouTube"
          >
            <ExternalLink
              size={16}
              color={Colors.textOnPrimary}
              strokeWidth={2}
            />
            <Text style={styles.youtubeText}>Open in YouTube</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View>
      <YouTubePlayer
        key={playerKey}
        videoId={videoId}
        width={width}
        height={height}
        onError={onPlayerError}
        onFirstPlay={onFirstPlay}
      />
      <Text style={styles.caption}>
        Video {videoIndex + 1} of {videoCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  error: {
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.lg,
  },
  errorTitle: {
    ...Typography.subtitle,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  errorMessage: {
    ...Typography.bodySmall,
    color: Colors.textDisabled,
    textAlign: 'center',
  },
  errorActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  errorBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
  },
  retryBtn: {
    borderWidth: 1.5,
    borderColor: Colors.textInverse,
  },
  retryText: {
    ...Typography.label,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  youtubeBtn: {
    backgroundColor: Colors.primaryDark,
  },
  youtubeText: {
    ...Typography.label,
    fontWeight: '700',
    color: Colors.textOnPrimary,
  },
  pressed: {
    opacity: 0.75,
  },
  caption: {
    ...Typography.caption,
    color: Colors.textSecondary,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
});
