/**
 * ------------------------------------------------------------------
 * BrandLockup — the Urban Cruise logo, rendered at a readable size
 * ------------------------------------------------------------------
 * THE PROBLEM THIS SOLVES
 *   `ucwithdesignandtext.png` is a 1280×1280 SQUARE image holding a
 *   four-line STACKED lockup:
 *
 *     ┌─────────────────────────┐  ← ~24% empty
 *     │        [UC mark]        │     y 0.244 – 0.468
 *     │      Urban Cruise       │     y 0.491 – 0.573
 *     │   [CAR & BUS RENTALS]   │     y 0.602 – 0.696
 *     │      हर सफर है खास…       │     y 0.705 – 0.757
 *     └─────────────────────────┘  ← ~24% empty
 *
 *   Sizing it with `height: 46` and `resizeMode="contain"` therefore
 *   renders a 46×46 box in which the actual artwork is ~23 px tall
 *   and the wordmark about 4 px. That is why the logo looked tiny.
 *   Giving it more height is not the fix either: a square box wide
 *   enough to read the wordmark is also 180 px TALL, which no header
 *   can carry.
 *
 * HOW IT IS FIXED
 *   The image is drawn oversized inside a fixed, clipped window, so
 *   only the band we want is visible — the same thing a cropped asset
 *   would do, without shipping a second file. `variant` picks the
 *   band; the fractions below were measured off the real file's alpha
 *   channel, so they are exact, not eyeballed.
 *
 * WHY 'wordmark' STOPS AT "Urban Cruise"
 *   The next band down reads "CAR & BUS RENTALS". On a page about
 *   pilgrimage travel that line is actively wrong, so the wordmark
 *   crop ends above it. Nothing is being hidden from the customer —
 *   the info strip on the screen still says this is an Urban Cruise
 *   app.
 *
 * WHEN A PROPER ASSET ARRIVES
 *   A horizontal lockup, or an SVG, makes this component unnecessary:
 *   delete it and use the asset directly. Until then this keeps every
 *   placement honest and readable.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

/** Which band of the stacked lockup to show. */
export type BrandLockupVariant =
  /** UC mark + "Urban Cruise". Drops the "CAR & BUS RENTALS" badge. */
  | 'wordmark'
  /** The UC mark on its own — for small square tiles. */
  | 'mark';

/**
 * Where each band sits inside the square source image, as fractions
 * of its width and height. Measured from the file's alpha channel:
 * re-measure if the artwork is ever replaced.
 */
const INK: Readonly<
  Record<
    BrandLockupVariant,
    { left: number; top: number; width: number; height: number }
  >
> = {
  wordmark: { left: 0.109, top: 0.244, width: 0.78, height: 0.33 },
  mark: { left: 0.319, top: 0.244, width: 0.362, height: 0.224 },
};

const SOURCE = require('@assets/images/ucwithdesignandtext.png');

type Props = {
  /** Rendered width of the visible artwork. Height follows from the
   *  band's own aspect ratio, so the logo can never be squashed. */
  width: number;
  variant?: BrandLockupVariant;
  /** Announced to screen readers. The default suits a header; pass
   *  null where a neighbouring label already says it. */
  accessibilityLabel?: string | null;
};

export const BrandLockup: React.FC<Props> = ({
  width,
  variant = 'wordmark',
  accessibilityLabel = 'Urban Cruise',
}) => {
  const ink = INK[variant];

  // Scale the whole square up so the chosen band measures `width`,
  // then slide it under the clipped window.
  const imageSize = width / ink.width;
  const height = imageSize * ink.height;

  return (
    <View
      style={[styles.window, { width, height }]}
      accessible={accessibilityLabel !== null}
      accessibilityRole={accessibilityLabel !== null ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel ?? undefined}
    >
      <Image
        source={SOURCE}
        resizeMode="contain"
        // Decorative here: the wrapper above carries the label.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.image,
          {
            width: imageSize,
            height: imageSize,
            left: -ink.left * imageSize,
            top: -ink.top * imageSize,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  window: {
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
  },
});
