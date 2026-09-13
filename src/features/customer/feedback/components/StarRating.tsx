/**
 * ------------------------------------------------------------------
 * StarRating
 * ------------------------------------------------------------------
 * Interactive 5-star rating selector. Tap a star to set the rating
 * to that many stars; tap the same one again to clear (set to 0).
 *
 * `readOnly` renders the same visual but no touch handling — used
 * by the "My Feedback" list to display a previous rating.
 *
 * Ratings are integer 0..5; the mockup shows "4.0 out of 5" so the
 * numeric side-label prints with one decimal for stylistic
 * consistency (the value itself has no fractional resolution).
 * ------------------------------------------------------------------
 */

import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Star } from 'lucide-react-native';

import { Colors, Spacing, Typography } from '@theme';

type Props = {
  value: number; // 0..5
  onChange?: (next: number) => void;
  readOnly?: boolean;
  /** Star glyph size — default matches the mockup's chunky stars. */
  size?: number;
  /** Show the "N.N out of 5" side-label next to the stars. */
  showLabel?: boolean;
};

export const StarRating: React.FC<Props> = ({
  value,
  onChange,
  readOnly = false,
  size = 32,
  showLabel = true,
}) => {
  const onTap = useCallback(
    (n: number) => {
      if (readOnly) return;
      onChange?.(value === n ? 0 : n);
    },
    [onChange, readOnly, value],
  );

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map(n => {
        const active = n <= value;
        return (
          <Pressable
            key={n}
            onPress={() => onTap(n)}
            hitSlop={4}
            disabled={readOnly}
            accessibilityRole={readOnly ? undefined : 'button'}
            accessibilityLabel={readOnly ? undefined : `Rate ${n} stars`}
          >
            <Star
              size={size}
              color={active ? Colors.secondary : Colors.border}
              fill={active ? Colors.secondary : 'transparent'}
              strokeWidth={1.5}
            />
          </Pressable>
        );
      })}
      {showLabel ? (
        <>
          <View style={styles.divider} />
          <Text style={styles.label}>{value.toFixed(1)} out of 5</Text>
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  label: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
