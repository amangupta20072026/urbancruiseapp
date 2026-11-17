/**
 * ------------------------------------------------------------------
 * AdvisorCallBar — the one action on the Spiritual Tours screens
 * ------------------------------------------------------------------
 * Pinned above the home indicator, so it is reachable by thumb at
 * every scroll position rather than only at the bottom of the list.
 *
 * WHY IT RENDERS NOTHING WITHOUT A NUMBER
 *   The support phone comes from app config (`s.app.appConfig?.support`,
 *   the same source AboutUrbanCruiseScreen reads), and config can
 *   still be the bundled default on a cold start that never reached
 *   the server. A "Talk to a Travel Advisor" button that silently
 *   does nothing is worse than no button, so the caller passes null
 *   and the bar does not render at all.
 *
 * WHAT TAPPING IT ACTUALLY DOES
 *   Hands the number to the OS dialler through `makePhoneCall`.
 *   On ANDROID that dials straight away. On iOS the system always
 *   shows its own confirmation sheet first — Apple does not let an
 *   app place a call silently, and no setting changes that. So the
 *   label says "Talk to", not "Calling now".
 * ------------------------------------------------------------------ */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Headphones } from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';

type Props = {
  /** Null hides the bar entirely — see the note above. */
  onPress: (() => void) | null;
  bottomInset: number;
  /** Button text. The list and the detail screen word it differently. */
  label?: string;
};

export const AdvisorCallBar: React.FC<Props> = ({
  onPress,
  bottomInset,
  label = 'Talk to a Travel Advisor',
}) => {
  if (!onPress) return null;

  return (
    <View style={[styles.bar, { paddingBottom: bottomInset + Spacing.md }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Calls our team"
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Headphones size={20} color={Colors.textOnPrimary} strokeWidth={2.1} />
        <Text
          style={styles.label}
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {label}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    minHeight: 54,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryDark,
    ...Shadows.sm,
  },
  pressed: {
    opacity: 0.88,
  },
  label: {
    ...Typography.button,
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textOnPrimary,
  },
});
