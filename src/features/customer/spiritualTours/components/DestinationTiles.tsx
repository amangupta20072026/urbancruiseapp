/**
 * ------------------------------------------------------------------
 * DestinationTiles — the row of stops under the title
 * ------------------------------------------------------------------
 * One tile per place: a photograph with the name beneath it.
 *
 * It scrolls horizontally rather than squeezing to fit. Char Dham has
 * four stops and the design shows all four across a phone, but the
 * catalog allows up to twelve — at twelve, equal columns would make
 * every photo a sliver and every name truncate. A scrolling row keeps
 * the tile size honest whatever the count, and with four tiles on a
 * normal phone there is nothing to scroll.
 *
 * Decorative images: the name below each one already says the place.
 * ------------------------------------------------------------------ */
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { TourIcon } from './TourIcon';
import type { SpiritualTourIcon, SpiritualTourPlace } from '../types';

type Props = {
  places: SpiritualTourPlace[];
  /** Drawn on a tile that has no photograph yet. */
  icon: SpiritualTourIcon;
};

const TILE_WIDTH = 104;
const IMAGE_HEIGHT = 74;

export const DestinationTiles: React.FC<Props> = ({ places, icon }) => {
  if (places.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {places.map(place => (
        <View key={place.name} style={styles.tile}>
          {place.imageUrl ? (
            <Image
              source={{ uri: place.imageUrl }}
              style={styles.image}
              resizeMode="cover"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          ) : (
            <View
              style={[styles.image, styles.fallback]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <TourIcon name={icon} size={30} color={Colors.primaryDark} />
            </View>
          )}

          <Text
            style={styles.name}
            numberOfLines={1}
            maxFontSizeMultiplier={1.4}
          >
            {place.name}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: {
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xxs,
  },
  tile: {
    width: TILE_WIDTH,
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  image: {
    width: '100%',
    height: IMAGE_HEIGHT,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryTint,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primaryLight,
  },
  name: {
    ...Typography.bodySmall,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
});
