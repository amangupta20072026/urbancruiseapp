/**
 * ItineraryTab — the day-by-day plan.
 *
 * NO DESIGN EXISTS FOR THIS TAB. The layout below is a plain timeline:
 * a day label, a title, optional detail, joined by a connector line
 * down the left. It is deliberately unopinionated so restyling it to
 * a future design is a change to this one file.
 *
 * `dayLabel` is printed as ops writes it rather than being numbered
 * here, because days are often grouped ("Day 3 – 4") and a generated
 * number would then disagree with the text.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';
import { SectionHeading, TabEmpty } from './TabPieces';
import type { SpiritualTourItineraryDay } from '../../types';

type Props = {
  itinerary: SpiritualTourItineraryDay[];
};

export const ItineraryTab: React.FC<Props> = ({ itinerary }) => {
  if (itinerary.length === 0) {
    return <TabEmpty message="The day-by-day itinerary is being prepared." />;
  }

  return (
    <View>
      <SectionHeading title="Day by Day" />

      <View style={styles.list}>
        {itinerary.map((day, index) => {
          const isLast = index === itinerary.length - 1;

          return (
            <View key={day.dayLabel} style={styles.row}>
              {/* Marker column: dot, then a connector to the next day. */}
              <View style={styles.markerColumn}>
                <View style={styles.dot} />
                {isLast ? null : <View style={styles.connector} />}
              </View>

              <View style={[styles.copy, isLast && styles.copyLast]}>
                <Text style={styles.dayLabel}>{day.dayLabel}</Text>
                <Text style={styles.title} maxFontSizeMultiplier={1.6}>
                  {day.title}
                </Text>
                {day.detail ? (
                  <Text style={styles.detail} maxFontSizeMultiplier={1.6}>
                    {day.detail}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    marginTop: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  markerColumn: {
    alignItems: 'center',
    width: 16,
  },
  dot: {
    width: 12,
    height: 12,
    marginTop: Spacing.xs,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primaryDark,
  },
  connector: {
    flex: 1,
    width: 2,
    marginTop: Spacing.xs,
    backgroundColor: Colors.primaryLight,
  },
  copy: {
    flex: 1,
    paddingBottom: Spacing.xl,
    gap: Spacing.xxs,
  },
  copyLast: {
    paddingBottom: 0,
  },
  dayLabel: {
    ...Typography.caption,
    fontSize: 12,
    letterSpacing: 0.4,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  title: {
    ...Typography.subtitle,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  detail: {
    ...Typography.bodySmall,
    marginTop: Spacing.xxs,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
});
