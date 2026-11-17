/**
 * ------------------------------------------------------------------
 * TourThumbnail — the photograph on a tour card
 * ------------------------------------------------------------------
 * The catalog's imageUrl is nullable and is null for every tour until
 * ops uploads the photography. That is a NORMAL state, not an error,
 * so this never renders a broken-image box: with no usable URL it
 * draws a soft green tile carrying the tour's own mark.
 *
 * It also falls back the same way when a URL is present but the load
 * FAILS — a dead CDN link, an offline device with a cold image cache.
 * The card keeps its shape either way, so the list never reflows
 * around a missing picture.
 *
 * Decorative throughout: the card's title and subtitle already say
 * what the tour is, so a screen reader repeating the image would only
 * add noise.
 * ------------------------------------------------------------------ */
import React, { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Colors, Radius } from '@theme';
import { TourIcon } from './TourIcon';
import type { SpiritualTourIcon } from '../types';

type Props = {
  imageUrl: string | null;
  icon: SpiritualTourIcon;
  /** Fixed width for the list card. Omit to fill the parent (detail hero). */
  width?: number;
  height: number;
};

export const TourThumbnail: React.FC<Props> = ({
  imageUrl,
  icon,
  width,
  height,
}) => {
  const [failed, setFailed] = useState(false);

  // A recycled row can be handed a different tour: clear the previous
  // row's failure so a working image is not hidden by a stale flag.
  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  const onError = useCallback(() => {
    setFailed(true);
  }, []);

  const frame = { width: width ?? ('100%' as const), height };

  /* The fallback mark is sized from the box's SHORT side so it never
     overflows. With no fixed width the box is as wide as the parent,
     so height is the only side we can measure against. */
  const markSize = Math.round(
    (width === undefined ? height : Math.min(width, height)) * 0.46,
  );

  if (imageUrl === null || failed) {
    return (
      <View
        style={[styles.fallback, frame]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <TourIcon name={icon} size={markSize} color={Colors.primaryDark} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: imageUrl }}
      style={[styles.image, frame]}
      resizeMode="cover"
      onError={onError}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
};

const styles = StyleSheet.create({
  image: {
    borderRadius: Radius.md,
    // Shows while a remote image is still downloading, so the row
    // does not flash white against the card.
    backgroundColor: Colors.primaryTint,
  },
  fallback: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryTint,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primaryLight,
  },
});
