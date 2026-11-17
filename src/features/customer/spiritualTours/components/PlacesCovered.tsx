/**
 * ------------------------------------------------------------------
 * PlacesCovered — the stops, as tiles in a pale green panel
 * ------------------------------------------------------------------
 *   ┌────────────────────────────────────────────────┐
 *   │ 📍 Places Covered                               │
 *   │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │
 *   │ │   🛕   │ │   🛕   │ │   🛕   │ │   🛕   │    │
 *   │ │Yamunotri│ │Gangotri│ │Kedarnath│ │Badrinath│  │
 *   │ └────────┘ └────────┘ └────────┘ └────────┘    │
 *   └────────────────────────────────────────────────┘
 *
 * WHY THE TILE WIDTH IS MEASURED
 *   The design puts four tiles across, filling the panel. Percentage
 *   widths cannot account for the gaps between tiles, so the grid
 *   measures its own width and divides it: up to FOUR columns, fewer
 *   when the panel is too narrow to give each tile MIN_TILE points.
 *   More than four places wrap onto further rows with the SAME tile
 *   width, left-aligned, rather than stretching the last row.
 *
 * WHAT A TILE SHOWS
 *   The stop's photograph when ops has uploaded one
 *   (`SpiritualTourPlace.imageUrl`), otherwise the tour's own mark.
 *   The catalog has no per-stop icon, so every stop uses the tour's.
 *   Names wrap to two lines and shrink slightly before breaking a
 *   word, so a long name is never clipped.
 * ------------------------------------------------------------------ */
import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { MapPin } from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { TourIcon } from './TourIcon';
import { IconSection } from './tabs/IconSection';
import type { SpiritualTourIcon, SpiritualTourPlace } from '../types';

type Props = {
  places: SpiritualTourPlace[];
  /** Drawn on a tile that has no photograph yet. */
  icon: SpiritualTourIcon;
};

const MAX_COLUMNS = 4;
const MIN_TILE = 68;
const GAP = Spacing.sm;
const ICON = 30;
const PHOTO_HEIGHT = 44;

/** Splits `items` into rows of `size`. */
function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

export const PlacesCovered: React.FC<Props> = ({ places, icon }) => {
  const [gridWidth, setGridWidth] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setGridWidth(Math.floor(e.nativeEvent.layout.width));
  }, []);

  const { columns, tileWidth } = useMemo(() => {
    if (gridWidth <= 0) return { columns: MAX_COLUMNS, tileWidth: 0 };
    const fit = Math.floor((gridWidth + GAP) / (MIN_TILE + GAP));
    const cols = Math.max(1, Math.min(MAX_COLUMNS, fit));
    return {
      columns: cols,
      tileWidth: Math.floor((gridWidth - GAP * (cols - 1)) / cols),
    };
  }, [gridWidth]);

  const rows = useMemo(() => chunk(places, columns), [places, columns]);

  if (places.length === 0) return null;

  return (
    <View style={styles.panel}>
      <IconSection Icon={MapPin} title="Places Covered" />

      {/* Measured, then filled: tiles appear on the first layout pass. */}
      <View style={styles.grid} onLayout={onLayout}>
        {tileWidth > 0
          ? rows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                {row.map(place => (
                  <View
                    key={place.name}
                    style={[styles.tile, { width: tileWidth }]}
                  >
                    {place.imageUrl ? (
                      <Image
                        source={{ uri: place.imageUrl }}
                        style={styles.photo}
                        resizeMode="cover"
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                      />
                    ) : (
                      <View
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                      >
                        <TourIcon
                          name={icon}
                          size={ICON}
                          color={Colors.primaryDark}
                        />
                      </View>
                    )}

                    <Text
                      style={styles.name}
                      numberOfLines={2}
                      adjustsFontSizeToFit
                      minimumFontScale={0.85}
                      maxFontSizeMultiplier={1.2}
                    >
                      {place.name}
                    </Text>
                  </View>
                ))}
              </View>
            ))
          : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    padding: Spacing.md,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryTint,
    gap: Spacing.md,
  },
  grid: {
    gap: GAP,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  photo: {
    width: '100%',
    height: PHOTO_HEIGHT,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryTint,
  },
  name: {
    ...Typography.bodySmall,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textAlign: 'center',
    color: Colors.textPrimary,
  },
});
