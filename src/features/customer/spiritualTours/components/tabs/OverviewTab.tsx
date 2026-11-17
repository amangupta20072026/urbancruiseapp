/**
 * OverviewTab — About the Tour, Tour Highlights, Places Covered.
 * The one tab that has a design; it follows it section by section.
 * Each section renders only when the catalog has content for it.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Info } from 'lucide-react-native';

import { Colors, Spacing, Typography } from '@theme';
import { PlacesCovered } from '../PlacesCovered';
import { TourHighlights } from '../TourHighlights';
import type { SpiritualTourIcon, SpiritualTourPlace } from '../../types';
import { IconSection } from './IconSection';
import { TabEmpty } from './TabPieces';

type Props = {
  overview: string | null;
  highlights: string[];
  places: SpiritualTourPlace[];
  /** The tour's mark, drawn on a place tile that has no photograph. */
  icon: SpiritualTourIcon;
};

export const OverviewTab: React.FC<Props> = ({
  overview,
  highlights,
  places,
  icon,
}) => {
  // Nothing written at all — one empty state rather than three.
  if (!overview && highlights.length === 0 && places.length === 0) {
    return <TabEmpty message="The full description is being prepared." />;
  }

  return (
    <View style={styles.stack}>
      {overview ? (
        <IconSection Icon={Info} title="About the Tour">
          <Text style={styles.body} maxFontSizeMultiplier={1.6}>
            {overview}
          </Text>
        </IconSection>
      ) : null}

      {overview && highlights.length > 0 ? (
        <View
          style={styles.rule}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ) : null}

      <TourHighlights highlights={highlights} />

      <PlacesCovered places={places} icon={icon} />
    </View>
  );
};

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.xl,
  },
  body: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
});
