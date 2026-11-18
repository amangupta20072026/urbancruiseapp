/**
 * Tier label pill. Same colours as VehicleOptionCard's tier pill —
 * the shared VEHICLE_TIER_PALETTE (Economy green, Premium blue, Royal
 * purple, Royal VIP gold) — with white text on the solid colour.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '@theme';
import {
  VEHICLE_TIER_LABELS,
  VEHICLE_TIER_PALETTE,
  type VehicleTierKey,
} from '@features/customer/quotations/vehicleTierOptions';

export function tierSolidColor(tier: VehicleTierKey): string {
  return VEHICLE_TIER_PALETTE[tier].solid;
}

export const TierPill: React.FC<{ tier: VehicleTierKey }> = ({ tier }) => (
  <View style={[styles.pill, { backgroundColor: tierSolidColor(tier) }]}>
    <Text style={styles.text}>{VEHICLE_TIER_LABELS[tier]}</Text>
  </View>
);

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  text: {
    ...Typography.caption,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: Colors.textOnPrimary,
    includeFontPadding: false,
  },
});
