/**
 * OverviewTab — "About the Tour" prose, then the highlights panel.
 * The one tab that had a design; it follows it closely.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '@theme';
import { TourHighlights } from '../TourHighlights';
import { SectionHeading, TabEmpty } from './TabPieces';

type Props = {
  overview: string | null;
  highlights: string[];
};

export const OverviewTab: React.FC<Props> = ({ overview, highlights }) => {
  // Nothing written at all — one empty state rather than two.
  if (!overview && highlights.length === 0) {
    return <TabEmpty message="The full description is being prepared." />;
  }

  return (
    <View>
      {overview ? (
        <>
          <SectionHeading title="About the Tour" />
          <Text style={styles.body} maxFontSizeMultiplier={1.6}>
            {overview}
          </Text>
        </>
      ) : null}

      <TourHighlights highlights={highlights} />
    </View>
  );
};

const styles = StyleSheet.create({
  body: {
    ...Typography.body,
    marginTop: Spacing.lg,
    fontSize: 15,
    lineHeight: 23,
    color: Colors.textPrimary,
  },
});
