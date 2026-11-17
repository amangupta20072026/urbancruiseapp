/**
 * ------------------------------------------------------------------
 * TourDetailHeader — back button and the Urban Cruise wordmark
 * ------------------------------------------------------------------
 *   ┌───────────────────────────────────────────────┐
 *   │ ‹              [ UC  Urban Cruise ]            │
 *   └───────────────────────────────────────────────┘
 *
 * Fixed above the scrolling body. It paints the status-bar area
 * itself (`topInset`), the same way the list screen's hero does, so
 * the screen needs no SafeScreen wrapper.
 *
 * The wordmark sits straight on the white page, with no plate behind
 * it: on a light background the brand-green lettering is readable,
 * unlike on the list screen's dark hero.
 * ------------------------------------------------------------------ */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

import { BrandLockup } from '@shared/components';
import { Colors, Spacing } from '@theme';

type Props = {
  onBack: () => void;
  /** Safe-area top inset — the header paints its own status-bar area. */
  topInset: number;
};

/** Rendered width of the wordmark's visible artwork. */
const LOGO_WIDTH = 120;

export const TourDetailHeader: React.FC<Props> = ({ onBack, topInset }) => (
  <View style={[styles.bar, { paddingTop: topInset + Spacing.sm }]}>
    <Pressable
      onPress={onBack}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={({ pressed }) => [styles.side, pressed && styles.pressed]}
    >
      <ChevronLeft size={28} color={Colors.textPrimary} strokeWidth={2.4} />
    </Pressable>

    <BrandLockup width={LOGO_WIDTH} variant="wordmark" />

    {/* Balances the back button so the wordmark sits centred. */}
    <View style={styles.side} />
  </View>
);

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  side: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
