/**
 * ------------------------------------------------------------------
 * TourHeroCarousel — the photographs at the top of a tour
 * ------------------------------------------------------------------
 *   ┌───────────────────────────────────────────┐
 *   │ ‹      [ Urban Cruise ]        ♡    ⤴     │  overlaid on the image
 *   │                                           │
 *   │              (photograph)           1/5   │
 *   └───────────────────────────────────────────┘
 *
 * A plain paged ScrollView, not a carousel library: the app ships no
 * carousel dependency, and horizontal paging over at most ten images
 * is what `pagingEnabled` already does natively on both platforms.
 *
 * IMAGE SOURCES, IN ORDER OF PREFERENCE
 *   1. `heroImages` — the carousel proper.
 *   2. `imageUrl`   — the list card's photo, so a tour with one
 *      picture still gets a hero rather than a blank band.
 *   3. A branded tile carrying the tour's own mark.
 *   The counter is hidden unless there is more than one image, since
 *   "1/1" tells the customer nothing.
 *
 * The header sits INSIDE the carousel rather than above it so the
 * image runs under the status bar, as in the design. It is laid over
 * a top-down scrim: without one, white icons vanish against a pale
 * sky, which is exactly what a Himalayan photograph has at the top.
 * ------------------------------------------------------------------ */
import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { ChevronLeft, Heart, Share2 } from 'lucide-react-native';

import { BrandLockup } from '@shared/components';
import { Colors, Radius, Spacing, Typography } from '@theme';
import { TourIcon } from './TourIcon';
import type { SpiritualTourIcon } from '../types';

type Props = {
  images: string[];
  /** The list card's photo, used when `images` is empty. */
  fallbackImageUrl: string | null;
  icon: SpiritualTourIcon;
  height: number;
  topInset: number;
  onBack: () => void;
  onShare: () => void;
  isSaved: boolean;
  onToggleSaved: () => void;
};

export const TourHeroCarousel: React.FC<Props> = ({
  images,
  fallbackImageUrl,
  icon,
  height,
  topInset,
  onBack,
  onShare,
  isSaved,
  onToggleSaved,
}) => {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const sources = useMemo(() => {
    if (images.length > 0) return images;
    return fallbackImageUrl ? [fallbackImageUrl] : [];
  }, [images, fallbackImageUrl]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / width);
      // Guard the setState so a drag that never leaves the page does
      // not re-render on every frame of the gesture.
      setIndex(prev => (prev === next ? prev : next));
    },
    [width],
  );

  return (
    <View style={[styles.root, { height }]}>
      {sources.length > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          // One image is not a carousel; locking it stops a rubber-band
          // drag that goes nowhere.
          scrollEnabled={sources.length > 1}
        >
          {sources.map(uri => (
            <Image
              key={uri}
              source={{ uri }}
              style={{ width, height }}
              resizeMode="cover"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          ))}
        </ScrollView>
      ) : (
        <View
          style={styles.fallback}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <TourIcon
            name={icon}
            size={Math.round(height * 0.34)}
            color={Colors.primaryDark}
          />
        </View>
      )}

      {/* Scrim under the header controls. */}
      <View
        style={styles.scrim}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />

      <View style={[styles.header, { paddingTop: topInset + Spacing.sm }]}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        >
          <ChevronLeft size={26} color={Colors.surface} strokeWidth={2.4} />
        </Pressable>

        <View style={styles.brandPlate}>
          <BrandLockup width={150} variant="wordmark" />
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={onToggleSaved}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={
              isSaved ? 'Remove from saved' : 'Save this tour'
            }
            accessibilityState={{ selected: isSaved }}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <Heart
              size={23}
              color={Colors.surface}
              strokeWidth={2.2}
              fill={isSaved ? Colors.surface : 'transparent'}
            />
          </Pressable>

          <Pressable
            onPress={onShare}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Share this tour"
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <Share2 size={22} color={Colors.surface} strokeWidth={2.2} />
          </Pressable>
        </View>
      </View>

      {sources.length > 1 ? (
        <View style={styles.counter}>
          <Text style={styles.counterText} allowFontScaling={false}>
            {index + 1}/{sources.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    width: '100%',
    backgroundColor: Colors.primaryDark,
    overflow: 'hidden',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryTint,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  brandPlate: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counter: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.xxxl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  counterText: {
    ...Typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.surface,
  },
});
