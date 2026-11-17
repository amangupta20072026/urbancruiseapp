/**
 * Small entry point into the brochure screens from QuotationDetail.
 *
 *   WatchVehicleVideoButton — on the "Vehicle Details" card of
 *                         accepted / expired quotations.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Clock, Play } from 'lucide-react-native';
import { Colors, Radius, Typography } from '@theme';

export const WatchVehicleVideoButton: React.FC<{
  comingSoon: boolean;
  onPress: () => void;
  vehicleName: string;
}> = ({ comingSoon, onPress, vehicleName }) =>
  comingSoon ? (
    <View
      style={[styles.videoBtn, styles.soonBtn]}
      accessibilityRole="button"
      accessibilityState={{ disabled: true }}
      accessibilityLabel={`Video of ${vehicleName} coming soon`}
    >
      <Clock size={16} color={Colors.textSecondary} strokeWidth={2} />
      <Text style={[styles.videoLabel, styles.soonLabel]}>
        Video coming soon
      </Text>
    </View>
  ) : (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.videoBtn, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Watch video of ${vehicleName}`}
    >
      <Play
        size={16}
        color={Colors.primaryDark}
        fill={Colors.primaryDark}
        strokeWidth={2}
      />
      <Text style={styles.videoLabel}>Watch Vehicle Video</Text>
    </Pressable>
  );

const styles = StyleSheet.create({
  videoBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryTint,
  },
  soonBtn: {
    borderColor: Colors.textTertiary,
    borderStyle: 'dashed',
    backgroundColor: Colors.surfaceMuted,
  },
  videoLabel: {
    ...Typography.label,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  soonLabel: {
    color: Colors.textSecondary,
  },
  pressed: {
    opacity: 0.75,
  },
});
