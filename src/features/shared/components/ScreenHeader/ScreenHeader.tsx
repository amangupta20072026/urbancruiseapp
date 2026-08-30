/**
 * ------------------------------------------------------------------
 * ScreenHeader
 * ------------------------------------------------------------------
 * Generic header for stack screens: back chevron + title + optional
 * subtitle + optional right-slot for icons (filter, notifications, ...).
 *
 * Extracted from the CustomerListHeader pattern so every stack
 * screen renders a visually identical top bar without duplicating
 * layout code. When a screen needs a specialised header (e.g. with
 * filter badge + sheet trigger), keep composing ScreenHeader and add
 * the specific control into `rightSlot` — do not fork this file.
 *
 * DESIGN INVARIANTS:
 *   - Back chevron only renders when `onBack` is provided AND the
 *     navigator can go back. Callers usually pass `navigation.goBack`
 *     directly; the internal `canGoBack` guard prevents rendering an
 *     inert button on a stack root.
 *   - No SafeAreaView here — this header is meant to sit inside a
 *     SafeScreen with `edges={['top']}`. Nesting insets would
 *     double-pad on notched devices.
 *   - Uses theme tokens only. No hardcoded colors or spacings.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { Colors, Spacing, Typography } from '@theme';

type Props = {
  title: string;
  subtitle?: string;
  /**
   * Callback for the back chevron. When omitted, the header hides
   * the chevron entirely. When provided but the navigator cannot go
   * back (e.g. root of a stack), the chevron is also hidden — no
   * dead-tap affordances.
   */
  onBack?: () => void;
  /**
   * Optional element rendered at the far right (icon button, badge,
   * menu trigger). Keeps this component reusable without a growing
   * list of `showFilter` / `showBell` boolean props.
   */
  rightSlot?: React.ReactNode;
};

export const ScreenHeader: React.FC<Props> = ({
  title,
  subtitle,
  onBack,
  rightSlot,
}) => {
  const navigation = useNavigation();
  const showBack = onBack !== undefined && navigation.canGoBack();

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.titleRow}>
          {showBack ? (
            <Pressable
              onPress={onBack}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={styles.backBtn}
            >
              <ChevronLeft
                size={26}
                color={Colors.textPrimary}
                strokeWidth={2.25}
              />
            </Pressable>
          ) : null}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {rightSlot ? <View style={styles.right}>{rightSlot}</View> : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    marginLeft: -Spacing.xs,
    marginRight: Spacing.xs,
    padding: Spacing.xs,
  },
  title: {
    ...Typography.h1,
    fontSize: 26,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  right: {
    marginLeft: Spacing.sm,
  },
});