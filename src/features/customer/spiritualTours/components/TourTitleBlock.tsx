/**
 * ------------------------------------------------------------------
 * TourTitleBlock — icon tile, tour name and its stops
 * ------------------------------------------------------------------
 *   ┌──────┐  Char Dham Yatra
 *   │  🛕  │  Yamunotri · Gangotri · Kedarnath · Badrinath
 *   └──────┘
 *
 * The title wraps rather than truncating: this is the one place the
 * full name is always shown. `titleNote` follows it in a smaller grey
 * size, e.g. "Shakti peeth Tour (North, MP)".
 *
 * The second line is the same text the list card shows (`subtitleFor`):
 * the joined stops, or the summary when a tour has no named stops.
 * ------------------------------------------------------------------ */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';
import { TourIcon } from './TourIcon';
import { subtitleFor } from './TourCard';
import type { SpiritualTour } from '../types';

type Props = {
  tour: SpiritualTour;
};

/** The design's tile is a little wider than it is tall. */
const TILE_W = 76;
const TILE_H = 68;
const ICON = 40;

/** The design's deep green title (same as the list screen's hero). */
const TITLE = '#1B5E20';

export const TourTitleBlock: React.FC<Props> = ({ tour }) => {
  const subtitle = useMemo(() => subtitleFor(tour), [tour]);

  return (
    <View style={styles.row}>
      <View
        style={styles.tile}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <TourIcon name={tour.icon} size={ICON} color={Colors.primaryDark} />
      </View>

      <View style={styles.copy}>
        <Text
          style={styles.title}
          accessibilityRole="header"
          maxFontSizeMultiplier={1.4}
        >
          {tour.title}
          {tour.titleNote ? (
            <Text style={styles.titleNote}> {tour.titleNote}</Text>
          ) : null}
        </Text>

        {subtitle !== '' ? (
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.5}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  tile: {
    width: TILE_W,
    height: TILE_H,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryTint,
    flex: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xs,
  },
  title: {
    ...Typography.h1,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: TITLE,
  },
  titleNote: {
    ...Typography.subtitle,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  subtitle: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
});
