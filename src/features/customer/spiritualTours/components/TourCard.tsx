/**
 * ------------------------------------------------------------------
 * TourCard — one tour in the list
 * ------------------------------------------------------------------
 *   ┌──────────────────────────────────────────────┐
 *   │ ┌────┐  Char Dham Yatra                 (›)  │
 *   │ │ 🛕 │  Yamunotri · Gangotri · Kedarnath …   │
 *   │ └────┘                                       │
 *   └──────────────────────────────────────────────┘
 *
 * TITLE ON ONE LINE, SUBTITLE IN FULL
 *   The title truncates rather than wrapping, with `titleNote` inline
 *   at the SAME size — "Shakti Peeth Tour (North, MP)" is one name,
 *   not a name plus a footnote. The full name is announced to screen
 *   readers and shown unclipped on the detail screen.
 *
 *   The subtitle is never truncated: it wraps onto as many lines as
 *   the stops need, so rows are as tall as their content rather than
 *   a fixed height. The tile and chevron stay vertically centred.
 *
 * THE PICTURE, IN ORDER OF PREFERENCE
 *   1. `imageUrl` from the backend — so ops can replace artwork
 *      without an app release.
 *   2. The PNG bundled for this tour's id (tourImages.ts).
 *   3. The tour's drawn mark on a tint tile.
 *   A remote image that FAILS to load falls through to 2, then 3, so
 *   a dead CDN link costs the artwork and nothing else.
 *
 * ACCESSIBILITY
 *   The whole row is one button announcing the full, untruncated name
 *   and its second line. The tile and chevron are hidden — the
 *   picture repeats the title and a chevron says nothing.
 * ------------------------------------------------------------------ */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';
import { TourIcon } from './TourIcon';
import { bundledTourImage } from '../tourImages';
import type { SpiritualTour } from '../types';

type Props = {
  tour: SpiritualTour;
  onPress: (tour: SpiritualTour) => void;
};

const TILE = 52;

/** Named stops, or the prose summary when a tour has none. */
export function subtitleFor(tour: SpiritualTour): string {
  if (tour.places.length > 0) {
    return tour.places.map(place => place.name).join(' · ');
  }
  return tour.summary ?? '';
}

export const TourCard: React.FC<Props> = ({ tour, onPress }) => {
  const [remoteFailed, setRemoteFailed] = useState(false);

  // A recycled row can be handed a different tour: clear the previous
  // row's failure so a working image is not hidden by a stale flag.
  useEffect(() => {
    setRemoteFailed(false);
  }, [tour.imageUrl]);

  const subtitle = useMemo(() => subtitleFor(tour), [tour]);
  const bundled = useMemo(() => bundledTourImage(tour.id), [tour.id]);

  const handlePress = useCallback(() => {
    onPress(tour);
  }, [onPress, tour]);

  const onImageError = useCallback(() => {
    setRemoteFailed(true);
  }, []);

  const useRemote = Boolean(tour.imageUrl) && !remoteFailed;

  const a11yLabel = [
    tour.titleNote ? `${tour.title} ${tour.titleNote}` : tour.title,
    subtitle,
  ]
    .filter(part => part !== '')
    .join('. ');

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint="Opens the tour details"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View
        style={styles.tile}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {useRemote ? (
          <Image
            source={{ uri: tour.imageUrl as string }}
            style={styles.image}
            resizeMode="cover"
            onError={onImageError}
          />
        ) : bundled ? (
          <Image source={bundled} style={styles.image} resizeMode="contain" />
        ) : (
          <TourIcon name={tour.icon} size={30} color={Colors.primaryDark} />
        )}
      </View>

      <View style={styles.body}>
        <Text
          style={styles.title}
          numberOfLines={1}
          maxFontSizeMultiplier={1.4}
        >
          {tour.title}
          {tour.titleNote ? ` ${tour.titleNote}` : ''}
        </Text>

        {subtitle !== '' ? (
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.4}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View
        style={styles.go}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <ChevronRight size={15} color={Colors.primaryDark} strokeWidth={2.6} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm + 3,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderLight,
    // Lighter than Shadows.sm on purpose: six stacked cards with a
    // normal card shadow turn the list grey.
    shadowColor: '#101814',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  pressed: {
    backgroundColor: Colors.primaryWash,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryTint,
    overflow: 'hidden',
    flex: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    ...Typography.subtitle,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  subtitle: {
    ...Typography.caption,
    fontSize: 11.5,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  go: {
    width: 28,
    height: 28,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryTint,
    flex: 0,
  },
});
