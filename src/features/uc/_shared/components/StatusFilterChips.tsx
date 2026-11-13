/**
 * ------------------------------------------------------------------
 * StatusFilterChips — the ONE status-chip strip for every UC screen
 * ------------------------------------------------------------------
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │ [All 42] [Upcoming 2] [Ongoing 1] [Completed 34] [Cance… │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Extracted from HistoryFilterChips, unchanged in look, and made
 * generic over the filter key so the Quotations tab can use the very
 * same component instead of a copy. Two screens drawing chips from
 * two files is how they end up different sizes — which is exactly
 * what happened before this existed.
 *
 * HistoryFilterChips is now a thin wrapper around this, so Trip
 * History, UC Bookings and UC Trips render through this file too and
 * nothing about them changes.
 *
 * Design decisions (carried over unchanged):
 *   - Horizontal ScrollView (not FlashList/View row) so extra filters
 *     don't force chips to shrink; they scroll instead. The strip is
 *     pinned to its content height (flexGrow/flexShrink 0) so it never
 *     stretches when a screen puts it straight into a flex column.
 *   - Counts are optional. Before the parent has them, the chip shows
 *     just the label — no "42" flicker.
 *   - Every chip has its own colour: selected is filled with the solid
 *     colour and white text; unselected shows its colour as text on a
 *     light tint.
 *   - Colours come from the screen's own status colours, so the chips
 *     match the cards below them.
 *   - Chip height ≈ 36px so the row barely eats scroll space.
 * ------------------------------------------------------------------ */

import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '@theme';

/* ---------------- Palette ---------------- */

/** Colours for one chip. */
export type StatusChipTone = {
  /** Selected: the chip fill. The label is white on top of it. */
  solid: string;
  /** Unselected: the chip fill. */
  tint: string;
  /**
   * Unselected: the label colour. Defaults to `solid`.
   *
   * Some accents are too faint to read on their own tint — a mid red
   * on a pale red measures under the 4.5:1 WCAG AA floor for small
   * text. Those pass a darker shade here. The SELECTED chip still
   * fills with the exact card accent either way, so the chips and the
   * cards they filter to cannot drift apart.
   */
  text?: string;
};

/** One tone per filter key. */
export type StatusChipPalette<K extends string> = Readonly<
  Record<K, StatusChipTone>
>;

/** One chip: its key and the label shown on it. */
export type StatusChipOption<K extends string> = {
  key: K;
  label: string;
};

type Props<K extends string> = {
  /** Chips in display order, left → right. */
  options: readonly StatusChipOption<K>[];
  value: K;
  onChange: (next: K) => void;
  /**
   * Optional per-key counts, shown beside the label as "All 42".
   * Omit them and the chips render label-only, so a parent that has
   * not computed counts yet needs no special case.
   */
  counts?: Partial<Record<K, number>>;
  /** Colour per chip. Pass the palette matching the cards below. */
  palette: StatusChipPalette<K>;
};

export function StatusFilterChips<K extends string>({
  options,
  value,
  onChange,
  counts,
  palette,
}: Props<K>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {options.map(option => (
        <Chip
          key={option.key}
          optionKey={option.key}
          label={option.label}
          selected={value === option.key}
          count={counts?.[option.key]}
          tone={palette[option.key]}
          onPress={onChange}
        />
      ))}
    </ScrollView>
  );
}

/* ---------------- Chip ---------------- */

type ChipProps<K extends string> = {
  optionKey: K;
  label: string;
  selected: boolean;
  count: number | undefined;
  tone: StatusChipTone;
  onPress: (next: K) => void;
};

/**
 * Not memoised: the component is generic, and React.memo on a generic
 * either loses the type parameter or needs a cast. The strip holds a
 * handful of chips, so re-rendering all of them on a tap costs
 * nothing measurable — unlike a list row, which is why the cards are
 * memoised and these are not.
 */
function Chip<K extends string>({
  optionKey,
  label,
  selected,
  count,
  tone,
  onPress,
}: ChipProps<K>) {
  const handlePress = useCallback(
    () => onPress(optionKey),
    [optionKey, onPress],
  );

  // Selected: solid fill + white text. Unselected: tint fill, and the
  // label in `text` (or `solid` when the accent reads fine as-is).
  const fill = selected ? tone.solid : tone.tint;
  const labelColor = selected ? Colors.textInverse : tone.text ?? tone.solid;

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label} filter${
        typeof count === 'number' ? `, ${count}` : ''
      }`}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: fill, borderColor: fill },
        pressed && styles.chipPressed,
      ]}
    >
      <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
        {label}
      </Text>
      {typeof count === 'number' ? (
        <View
          style={[
            styles.badge,
            selected ? styles.badgeSelected : styles.badgeDefault,
          ]}
        >
          <Text style={[styles.badgeText, { color: labelColor }]}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  /* A horizontal ScrollView placed directly in a column grows to fill
   * the free vertical space (the chips became full-height pills on
   * the Trips tab). Pin it to its content height so it is correct on
   * every screen, wrapped or not. */
  strip: {
    flexGrow: 0,
    flexShrink: 0,
  },
  row: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipPressed: {
    opacity: 0.75,
  },

  label: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },

  /* Small pill inside the chip carrying the count. */
  badge: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDefault: {
    backgroundColor: Colors.surface,
  },
  badgeSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  badgeText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
});
