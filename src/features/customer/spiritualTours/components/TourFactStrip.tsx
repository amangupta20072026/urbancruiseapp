/**
 * ------------------------------------------------------------------
 * TourFactStrip — Duration · Travel Mode · Best Season · Difficulty
 * ------------------------------------------------------------------
 * A pale green band of four labelled facts separated by hairlines.
 *
 * Any fact the catalog leaves null is DROPPED, not printed as a dash:
 * "Difficulty —" reads as a mistake, while three facts read as three
 * facts. The dividers are drawn between whatever survives, so there
 * is never a trailing rule. With nothing at all the strip does not
 * render.
 *
 * Each fact is one accessibility node ("Duration, 10 – 12 Days") so
 * the reader does not announce eight disconnected fragments.
 * ------------------------------------------------------------------ */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  BarChart3,
  CalendarDays,
  CarFront,
  UsersRound,
  type LucideProps,
} from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';
import type { SpiritualTourFacts } from '../types';

type Props = {
  facts: SpiritualTourFacts;
};

type Fact = {
  key: string;
  label: string;
  value: string;
  Icon: React.ComponentType<LucideProps>;
};

export const TourFactStrip: React.FC<Props> = ({ facts }) => {
  const items = useMemo<Fact[]>(() => {
    const all: Array<Fact | null> = [
      facts.duration
        ? {
            key: 'duration',
            label: 'Duration',
            value: facts.duration,
            Icon: CalendarDays,
          }
        : null,
      facts.travelMode
        ? {
            key: 'travelMode',
            label: 'Travel Mode',
            value: facts.travelMode,
            Icon: CarFront,
          }
        : null,
      facts.bestSeason
        ? {
            key: 'bestSeason',
            label: 'Best Season',
            value: facts.bestSeason,
            Icon: UsersRound,
          }
        : null,
      facts.difficulty
        ? {
            key: 'difficulty',
            label: 'Difficulty',
            value: facts.difficulty,
            Icon: BarChart3,
          }
        : null,
    ];
    return all.filter((f): f is Fact => f !== null);
  }, [facts]);

  if (items.length === 0) return null;

  return (
    <View style={styles.strip}>
      {items.map((fact, i) => (
        <React.Fragment key={fact.key}>
          {i === 0 ? null : <View style={styles.divider} />}

          <View
            style={styles.fact}
            accessible
            accessibilityLabel={`${fact.label}, ${fact.value}`}
          >
            <fact.Icon size={22} color={Colors.primaryDark} strokeWidth={2} />

            <View style={styles.copy}>
              <Text
                style={styles.label}
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
              >
                {fact.label}
              </Text>
              <Text
                style={styles.value}
                numberOfLines={2}
                maxFontSizeMultiplier={1.3}
              >
                {fact.value}
              </Text>
            </View>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryWash,
  },
  fact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  copy: {
    flex: 1,
  },
  label: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  value: {
    ...Typography.bodySmall,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'center',
    height: '72%',
    marginHorizontal: Spacing.sm,
    backgroundColor: Colors.primaryLight,
  },
});
