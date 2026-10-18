/**
 * One tier in the Vehicle Brochures list: thumbnail, tier pill,
 * title. Tappable when the tier has a video; otherwise shown as
 * "Coming soon" and not tappable.
 *
 * The thumbnail is the app's vehicle image, not a YouTube thumbnail:
 * the official way to get YouTube thumbnail URLs was not verified
 * (proposal §12). It is 128 × 72, above YouTube's 120 × 70 minimum
 * for a thumbnail that starts playback (proposal §6.2).
 */
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Play } from 'lucide-react-native';
import { Colors, Radius, Spacing, Typography } from '@theme';
import type { BrochureEntry } from '../types';
import { hasVideo } from '../utils/match';
import { TierPill } from './TierPill';

const PLACEHOLDER_IMG = require('@assets/images/service-car.png');

export const BrochureCard: React.FC<{
  entry: BrochureEntry;
  onPress: (entry: BrochureEntry) => void;
}> = React.memo(({ entry, onPress }) => {
  const playable = hasVideo(entry);

  if (!playable) {
    return (
      <View
        style={[styles.card, styles.soonCard]}
        accessibilityLabel={`${entry.title}, video coming soon`}
      >
        <View style={[styles.thumb, styles.soonThumb]}>
          <Image
            source={PLACEHOLDER_IMG}
            style={[styles.thumbImage, styles.soonImage]}
            resizeMode="contain"
          />
        </View>
        <View style={styles.body}>
          <View style={styles.soonPill}>
            <Text style={styles.soonPillText}>COMING SOON</Text>
          </View>
          <Text style={[styles.title, styles.soonTitle]} numberOfLines={2}>
            {entry.title}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => onPress(entry)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Watch ${entry.title}`}
    >
      <View style={styles.thumb}>
        <Image
          source={PLACEHOLDER_IMG}
          style={styles.thumbImage}
          resizeMode="contain"
        />
        <View style={styles.playBadge}>
          <Play
            size={13}
            color={Colors.textOnPrimary}
            fill={Colors.textOnPrimary}
            strokeWidth={2}
          />
        </View>
      </View>
      <View style={styles.body}>
        <TierPill tier={entry.tier} />
        <Text style={styles.title} numberOfLines={2}>
          {entry.title}
        </Text>
      </View>
      <ChevronRight size={18} color={Colors.textSecondary} strokeWidth={2} />
    </Pressable>
  );
});
BrochureCard.displayName = 'BrochureCard';

const THUMB_W = 128;
const THUMB_H = 72;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  soonCard: {
    borderStyle: 'dashed',
    borderColor: Colors.textTertiary,
  },
  pressed: {
    opacity: 0.75,
  },
  thumb: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryWash,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  soonThumb: {
    backgroundColor: Colors.surfaceMuted,
  },
  thumbImage: {
    width: THUMB_H,
    height: THUMB_H,
  },
  soonImage: {
    opacity: 0.5,
  },
  playBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: Spacing.xs,
  },
  title: {
    ...Typography.label,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  soonTitle: {
    color: Colors.textSecondary,
  },
  soonPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    backgroundColor: Colors.surfaceMuted,
  },
  soonPillText: {
    ...Typography.caption,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: Colors.textSecondary,
    includeFontPadding: false,
  },
});
