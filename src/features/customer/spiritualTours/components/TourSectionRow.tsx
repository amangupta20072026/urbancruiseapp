/**
 * ------------------------------------------------------------------
 * TourSectionRow — one tappable row (Itinerary, Inclusions, …)
 * ------------------------------------------------------------------
 *   ─────────────────────────────────────────────
 *    📅   Itinerary                           ›
 *   ─────────────────────────────────────────────
 *
 * Title and icon come from the catalog; tapping opens the section's
 * bottom sheet (TourSectionSheet). Rows sit in a list with a hairline
 * above each one and below the last, as in the design.
 *
 * SectionIcon is exported so the sheet's header draws the same icon.
 * ------------------------------------------------------------------ */
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CalendarDays,
  ChevronRight,
  CircleCheck,
  CircleX,
  IndianRupee,
  Info,
  List as ListIcon,
} from 'lucide-react-native';

import { Colors, Spacing, Typography } from '@theme';
import type {
  SpiritualTourInfoSection,
  SpiritualTourSectionIcon,
} from '../types';

type IconComponent = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

const SECTION_ICON: Record<SpiritualTourSectionIcon, IconComponent> = {
  itinerary: CalendarDays,
  check: CircleCheck,
  cross: CircleX,
  rupee: IndianRupee,
  info: Info,
  list: ListIcon,
};

export const SectionIcon: React.FC<{
  name: SpiritualTourSectionIcon;
  size?: number;
}> = ({ name, size = 28 }) => {
  const Icon = SECTION_ICON[name];
  return <Icon size={size} color={Colors.primaryDark} strokeWidth={2} />;
};

type Props = {
  section: SpiritualTourInfoSection;
  onPress: (section: SpiritualTourInfoSection) => void;
  /** The last row also draws the hairline under itself. */
  isLast: boolean;
};

export const TourSectionRow: React.FC<Props> = ({
  section,
  onPress,
  isLast,
}) => {
  const handlePress = useCallback(() => {
    onPress(section);
  }, [onPress, section]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={section.title}
      accessibilityHint="Opens the details"
      style={({ pressed }) => [
        styles.row,
        isLast && styles.rowLast,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={styles.icon}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <SectionIcon name={section.icon} />
      </View>

      <Text style={styles.title} numberOfLines={1} maxFontSizeMultiplier={1.4}>
        {section.title}
      </Text>

      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <ChevronRight size={24} color={Colors.primaryDark} strokeWidth={2.4} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    minHeight: 60,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  rowLast: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pressed: {
    backgroundColor: Colors.primaryWash,
  },
  icon: {
    width: 32,
    alignItems: 'center',
  },
  title: {
    ...Typography.subtitle,
    flex: 1,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
