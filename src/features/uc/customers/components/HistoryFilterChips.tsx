/**
 * ------------------------------------------------------------------
 * HistoryFilterChips
 * ------------------------------------------------------------------
 * Horizontal chip row for filtering the trip history by status.
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │ [All 42] [Upcoming 2] [Ongoing 1] [Completed 34] [Cancel… │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Design decisions:
 *   - Horizontal ScrollView (not FlashList/View row) so future filters
 *     (`no_show`, `paid`, `refunded`, etc.) don't force us to shrink
 *     chips to fit; they scroll instead. The strip is pinned to its
 *     content height (flexGrow/flexShrink 0) so it never stretches
 *     when a screen places it straight into a flex column.
 *   - Counts are optional. When the parent hasn't computed them yet
 *     (still loading), the chip shows just the label — no "42" flicker.
 *   - Every chip has its own colour (FilterChipPalette): the selected
 *     chip is filled with its solid colour and white text; unselected
 *     chips show their solid colour as text on a light tint.
 *   - Colours come from the screen's own status colours so the chips
 *     match the cards below them. Default palette = Trip History card
 *     colours (used by Trip History and the UC Bookings tab); the UC
 *     Trips tab passes UC_TRIP_CHIP_PALETTE to match its cards.
 *   - Chip height ≈ 32px so this row barely eats scroll space.
 * ------------------------------------------------------------------ */

import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '@theme';

import {
  HISTORY_STATUS_LABEL,
  TRIP_STATUS_TONE,
  type HistoryStatusFilter,
} from '../types';

/* ---------------- Palette ---------------- */

/** Colours for one chip. */
export type FilterChipTone = {
  /** Selected fill; also the text/badge colour when unselected. */
  solid: string;
  /** Unselected background and border. */
  tint: string;
};

export type FilterChipPalette = Readonly<
  Record<HistoryStatusFilter, FilterChipTone>
>;

/**
 * Default palette: the Trip History card colours. Status `solid`s are
 * read from TRIP_STATUS_TONE (the cards' source) so chips and cards
 * can't drift apart. "All" has no card, so it uses the brand's royal
 * purple — a fifth colour none of the statuses use.
 */
export const TRIP_HISTORY_CHIP_PALETTE: FilterChipPalette = Object.freeze({
  all: { solid: Colors.royal, tint: Colors.royalTint },
  upcoming: {
    solid: TRIP_STATUS_TONE.upcoming.solid,
    tint: Colors.completedTint,
  },
  ongoing: {
    solid: TRIP_STATUS_TONE.in_progress.solid,
    tint: Colors.accentTint,
  },
  completed: {
    solid: TRIP_STATUS_TONE.completed.solid,
    tint: Colors.primaryTint,
  },
  cancelled: {
    solid: TRIP_STATUS_TONE.cancelled.solid,
    tint: Colors.errorTint,
  },
});

type Props = {
  value: HistoryStatusFilter;
  onChange: (next: HistoryStatusFilter) => void;
  /**
   * Optional per-status counts, shown alongside the label as "All 42".
   * When omitted, chips render label-only. This keeps the API forgiving
   * — the parent may not have the counts on first render.
   */
  counts?: Partial<Record<HistoryStatusFilter, number>>;
  /**
   * Colour per chip. Pass the palette that matches the cards on the
   * screen. Defaults to the Trip History colours.
   */
  palette?: FilterChipPalette;
};

/** Display order of the chips (left → right). */
const ORDER: readonly HistoryStatusFilter[] = [
  'all',
  'upcoming',
  'ongoing',
  'completed',
  'cancelled',
];

export const HistoryFilterChips: React.FC<Props> = ({
  value,
  onChange,
  counts,
  palette = TRIP_HISTORY_CHIP_PALETTE,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {ORDER.map(status => (
        <FilterChip
          key={status}
          status={status}
          selected={value === status}
          count={counts?.[status]}
          tone={palette[status]}
          onPress={onChange}
        />
      ))}
    </ScrollView>
  );
};

/* ---------------- Chip ---------------- */

/* Individual chip is memo'd so scrolling / re-selecting one chip
 * doesn't re-render the others. `tone` comes from a frozen palette
 * constant, so its reference is stable and doesn't break the memo. */
const FilterChipImpl: React.FC<{
  status: HistoryStatusFilter;
  selected: boolean;
  count: number | undefined;
  tone: FilterChipTone;
  onPress: (next: HistoryStatusFilter) => void;
}> = ({ status, selected, count, tone, onPress }) => {
  const handlePress = useCallback(() => onPress(status), [status, onPress]);

  // Selected: solid fill + white text. Unselected: tint fill + solid text.
  const chipColors = useMemo(
    () =>
      selected
        ? { backgroundColor: tone.solid, borderColor: tone.solid }
        : { backgroundColor: tone.tint, borderColor: tone.tint },
    [selected, tone],
  );
  const textColor = useMemo(
    () => ({ color: selected ? Colors.textInverse : tone.solid }),
    [selected, tone],
  );

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${HISTORY_STATUS_LABEL[status]} filter${
        typeof count === 'number' ? `, ${count}` : ''
      }`}
      style={({ pressed }) => [
        styles.chip,
        chipColors,
        pressed && styles.chipPressed,
      ]}
    >
      <Text style={[styles.label, textColor]} numberOfLines={1}>
        {HISTORY_STATUS_LABEL[status]}
      </Text>
      {typeof count === 'number' ? (
        <View
          style={[
            styles.badge,
            selected ? styles.badgeSelected : styles.badgeDefault,
          ]}
        >
          <Text style={[styles.badgeText, textColor]}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
};
const FilterChip = React.memo(FilterChipImpl);
FilterChip.displayName = 'FilterChip';

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  /* A horizontal ScrollView placed directly in a column grows to fill
   * the free vertical space (the chips became full-height pills on
   * the Trips tab). Pin it to its content height so it is correct on
   * every screen, wrapped or not — same as the UC Quotations chips. */
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
