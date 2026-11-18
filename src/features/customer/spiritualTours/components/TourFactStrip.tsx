/**
 * ------------------------------------------------------------------
 * TourFactStrip — the tinted strip of facts under the title
 * ------------------------------------------------------------------
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ 📅 Duration      │ 👥 Passengers    │ 🚌 Vehicle          │
 *   │    10 – 12 Days  │    Up to 26      │    Tempo Traveller  │
 *   │                  │                  │    9 – 26 Seater    │
 *   └──────────────────────────────────────────────────────────┘
 *
 * BACKEND-DRIVEN
 *   Which facts appear, in what order, with which label and icon, all
 *   come from the catalog (`tour.facts`). The app only lays them out
 *   in equal columns with a hairline between them, so ops can rename
 *   "Passengers" or add a fourth fact with no app release. At most
 *   MAX_FACTS are drawn (the backend enforces the same limit); with
 *   none, the strip is not drawn at all.
 *
 *   Values are printed exactly as sent. Long ones wrap inside their
 *   column instead of being cut, so nothing ops writes is hidden.
 *
 * ACCESSIBILITY
 *   Each column is read as one item: "Duration, 10 – 12 Days".
 * ------------------------------------------------------------------ */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Bus,
  Calendar,
  Clock,
  Info,
  MapPin,
  Mountain,
  Sun,
  Users,
} from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';
import type { SpiritualTourFact, SpiritualTourFactIcon } from '../types';

type Props = {
  facts: readonly SpiritualTourFact[];
};

/** The strip has room for four columns at most. */
const MAX_FACTS = 4;

const ICON_SIZE = 24;

type IconComponent = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

const FACT_ICON: Record<SpiritualTourFactIcon, IconComponent> = {
  calendar: Calendar,
  users: Users,
  vehicle: Bus,
  clock: Clock,
  'map-pin': MapPin,
  sun: Sun,
  mountain: Mountain,
  info: Info,
};

/** Soft green fill and divider, as in the design. */
const STRIP_BG = '#EEF7EF';
const DIVIDER = '#CFE3D1';

export const TourFactStrip: React.FC<Props> = ({ facts }) => {
  const shown = facts.slice(0, MAX_FACTS);
  if (shown.length === 0) return null;

  return (
    <View style={styles.strip}>
      {shown.map((fact, index) => {
        const Icon = FACT_ICON[fact.icon];
        const a11y = [fact.label, fact.value, fact.note]
          .filter((part): part is string => Boolean(part))
          .join(', ');

        return (
          <View
            key={`${fact.label}-${index}`}
            style={[styles.column, index > 0 && styles.columnDivided]}
            accessible
            accessibilityLabel={a11y}
          >
            <Icon size={ICON_SIZE} color={Colors.primaryDark} strokeWidth={2} />

            <View style={styles.copy}>
              <Text style={styles.label} maxFontSizeMultiplier={1.4}>
                {fact.label}
              </Text>
              <Text style={styles.value} maxFontSizeMultiplier={1.4}>
                {fact.value}
              </Text>
              {fact.note ? (
                <Text style={styles.note} maxFontSizeMultiplier={1.4}>
                  {fact.note}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.xl,
    backgroundColor: STRIP_BG,
  },
  column: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  columnDivided: {
    borderLeftWidth: 1,
    borderLeftColor: DIVIDER,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xxs,
  },
  label: {
    ...Typography.caption,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  value: {
    ...Typography.bodySmall,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  note: {
    ...Typography.caption,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
});
