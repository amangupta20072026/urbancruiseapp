/**
 * ------------------------------------------------------------------
 * TourTitleBlock — the tour's mark, name and stops
 * ------------------------------------------------------------------
 *   ┌──────┐  Char Dham Yatra
 *   │  🛕  │  Yamunotri · Gangotri · Kedarnath · Badrinath
 *   └──────┘
 *
 * The line under the title is the SAME stops line the list card shows
 * (`subtitleFor`), so the two screens can never disagree. It is never
 * truncated: it wraps, and the mark stays vertically centred beside
 * however many lines result.
 *
 * `titleNote` stays inline after the title, smaller, exactly as on
 * the list card: "Shakti peeth Tour (North, MP)" is one name.
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

const TILE = 84;
const ICON = 48;

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
    width: TILE,
    height: TILE,
    borderRadius: Radius.xl,
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
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  titleNote: {
    ...Typography.subtitle,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  subtitle: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
});
