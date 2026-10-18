/**
 * Tier label pill. Same colour rule as VehicleOptionCard's tier pill:
 * green for Economy / Premium, royal purple for Royal / Royal VIP,
 * white text on the solid colour.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '@theme';
import {
  VEHICLE_TIER_LABELS,
  type VehicleTierKey,
} from '@features/customer/quotations/vehicleTierOptions';

export function tierSolidColor(tier: VehicleTierKey): string {
  return tier === 'royal' || tier === 'royal_vip'
    ? Colors.royal
    : Colors.primaryDark;
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
