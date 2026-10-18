/**
 * The 16:9 video area used when videos open in YouTube.
 *
 * A poster with a play button; tapping it opens the selected video in
 * the YouTube app / browser. Used where the in-app player is not
 * enabled (iOS, until the final bundle id exists) — see BrochurePlayer.
 * Same 16:9 box as the in-app player, so the screen layout is
 * identical on both platforms.
 */
import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Play } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@theme';

const PLACEHOLDER_IMG = require('@assets/images/service-car.png');

export const BrochureVideoStage: React.FC<{
  title: string;
  videoNumber: number;
  videoCount: number;
  onPlay: () => void;
}> = ({ title, videoNumber, videoCount, onPlay }) => {
  const { width } = useWindowDimensions();
  const height = Math.round((width * 9) / 16);

  return (
    <View>
      <Pressable
        onPress={onPlay}
        style={({ pressed }) => [
          styles.stage,
          { width, height },
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Play video ${videoNumber} of ${videoCount}, ${title}, opens YouTube`}
      >
        <Image
          source={PLACEHOLDER_IMG}
          style={styles.poster}
          resizeMode="contain"
        />
        <View style={styles.playButton}>
          <Play
            size={24}
            color={Colors.textOnPrimary}
            fill={Colors.textOnPrimary}
            strokeWidth={2}
          />
        </View>
      </Pressable>
      <Text style={styles.caption}>
        Video {videoNumber} of {videoCount} · Opens in YouTube
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  stage: {
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  poster: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.35,
  },
  playButton: {
    width: 68,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    ...Typography.caption,
    color: Colors.textSecondary,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
});
