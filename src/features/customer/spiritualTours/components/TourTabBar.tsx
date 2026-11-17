/**
 * ------------------------------------------------------------------
 * TourTabBar — Overview · Itinerary · Inclusions · Exclusions · Pricing
 * ------------------------------------------------------------------
 * Filled pill for the selected tab, grey for the rest.
 *
 * It scrolls horizontally. Five pills do not fit across a phone at
 * the design's text size — the mockup clips "Pricing" at the right
 * edge — and they certainly do not fit at a large system font size.
 * Scrolling keeps every label readable instead of truncating them.
 *
 * The bar is one `tablist`, each pill a `tab` with its selected
 * state, so a screen reader announces "Itinerary, tab, 2 of 5".
 *
 * A tab whose content is EMPTY is still shown and still selectable —
 * its panel explains that the detail is on its way. Hiding it would
 * make the bar change shape as ops fills the catalog in, and a
 * customer who has seen five tabs once would wonder where they went.
 * ------------------------------------------------------------------ */
import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';

export const TOUR_TABS = [
  'overview',
  'itinerary',
  'inclusions',
  'exclusions',
  'pricing',
] as const;

export type TourTab = (typeof TOUR_TABS)[number];

export const TOUR_TAB_LABEL: Record<TourTab, string> = {
  overview: 'Overview',
  itinerary: 'Itinerary',
  inclusions: 'Inclusions',
  exclusions: 'Exclusions',
  pricing: 'Pricing',
};

type Props = {
  value: TourTab;
  onChange: (next: TourTab) => void;
};

type PillProps = {
  tab: TourTab;
  selected: boolean;
  onPress: (tab: TourTab) => void;
};

const Pill: React.FC<PillProps> = ({ tab, selected, onPress }) => {
  const handlePress = useCallback(() => {
    onPress(tab);
  }, [onPress, tab]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={TOUR_TAB_LABEL[tab]}
      style={({ pressed }) => [
        styles.pill,
        selected ? styles.pillSelected : styles.pillIdle,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.label,
          selected ? styles.labelSelected : styles.labelIdle,
        ]}
        maxFontSizeMultiplier={1.4}
      >
        {TOUR_TAB_LABEL[tab]}
      </Text>
    </Pressable>
  );
};

export const TourTabBar: React.FC<Props> = ({ value, onChange }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.row}
    accessibilityRole="tablist"
  >
    {TOUR_TABS.map(tab => (
      <Pill key={tab} tab={tab} selected={tab === value} onPress={onChange} />
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  row: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xxs,
  },
  pill: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.pill,
  },
  pillSelected: {
    backgroundColor: Colors.primaryDark,
  },
  pillIdle: {
    backgroundColor: Colors.backgroundTertiary,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    ...Typography.body,
    fontSize: 15,
  },
  labelSelected: {
    fontWeight: '800',
    color: Colors.surface,
  },
  labelIdle: {
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
