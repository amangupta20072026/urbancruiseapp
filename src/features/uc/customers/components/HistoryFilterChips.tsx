/**
 * ------------------------------------------------------------------
 * HistoryFilterChips
 * ------------------------------------------------------------------
 * Horizontal chip row for filtering the trip history by status.
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │ [All 42]  [Completed 35]  [Cancelled 5]  [Upcoming 2]   │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Design decisions:
 *   - Horizontal ScrollView (not FlashList/View row) so future filters
 *     (`no_show`, `paid`, `refunded`, etc.) don't force us to shrink
 *     chips to fit; they scroll instead.
 *   - Counts are optional. When the parent hasn't computed them yet
 *     (still loading), the chip shows just the label — no "42" flicker.
 *   - Only the selected chip carries a tint; unselected chips are
 *     neutral outline. Follows the same pattern as CustomerFilterSheet.
 *   - Chip height ≈ 32px so this row barely eats scroll space.
 * ------------------------------------------------------------------ */

import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '@theme';

import { HISTORY_STATUS_LABEL, type HistoryStatusFilter } from '../types';

type Props = {
  value: HistoryStatusFilter;
  onChange: (next: HistoryStatusFilter) => void;
  /**
   * Optional per-status counts, shown alongside the label as "All 42".
   * When omitted, chips render label-only. This keeps the API forgiving
   * — the parent may not have the counts on first render.
   */
  counts?: Partial<Record<HistoryStatusFilter, number>>;
};

const ORDER: HistoryStatusFilter[] = [
  'all',
  'completed',
  'cancelled',
  'upcoming',
];

export const HistoryFilterChips: React.FC<Props> = ({
  value,
  onChange,
  counts,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {ORDER.map(status => (
        <FilterChip
          key={status}
          status={status}
          selected={value === status}
          count={counts?.[status]}
          onPress={onChange}
        />
      ))}
    </ScrollView>
  );
};

/* ---------------- Chip ---------------- */

/* Individual chip is memo'd so scrolling / re-selecting one chip
 * doesn't re-render the other three. Cheap here but a habit worth
 * keeping since we'll reuse this pattern elsewhere. */
const FilterChipImpl: React.FC<{
  status: HistoryStatusFilter;
  selected: boolean;
  count: number | undefined;
  onPress: (next: HistoryStatusFilter) => void;
}> = ({ status, selected, count, onPress }) => {
  const handlePress = useCallback(() => onPress(status), [status, onPress]);

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
        selected ? styles.chipSelected : styles.chipDefault,
        pressed && styles.chipPressed,
      ]}
    >
      <Text
        style={[
          styles.label,
          selected ? styles.labelSelected : styles.labelDefault,
        ]}
        numberOfLines={1}
      >
        {HISTORY_STATUS_LABEL[status]}
      </Text>
      {typeof count === 'number' ? (
        <View
          style={[
            styles.badge,
            selected ? styles.badgeSelected : styles.badgeDefault,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              selected ? styles.badgeTextSelected : styles.badgeTextDefault,
            ]}
          >
            {count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
};
const FilterChip = React.memo(FilterChipImpl);
FilterChip.displayName = 'FilterChip';

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
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
  chipDefault: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipPressed: {
    opacity: 0.75,
  },

  label: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  labelDefault: {
    color: Colors.textPrimary,
  },
  labelSelected: {
    color: Colors.textInverse,
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
    backgroundColor: Colors.backgroundTertiary,
  },
  badgeSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  badgeText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextDefault: {
    color: Colors.textSecondary,
  },
  badgeTextSelected: {
    color: Colors.textInverse,
  },
});
