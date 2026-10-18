/**
 * Small entry points into the brochure screens from QuotationDetail.
 *
 *   ViewAllVehiclesLink — under the "Choose Your Vehicle" header
 *                         (pending quotations only).
 *   WatchVehicleVideoButton — on the "Vehicle Details" card of
 *                         accepted / expired quotations.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Clock, LayoutGrid, Play } from 'lucide-react-native';
import { Colors, Radius, Spacing, Typography } from '@theme';

export const ViewAllVehiclesLink: React.FC<{ onPress: () => void }> = ({
  onPress,
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.link, pressed && styles.pressed]}
    accessibilityRole="button"
    accessibilityLabel="View all vehicles. Brochure videos by vehicle type and seater"
  >
    <View style={styles.linkIcon}>
      <LayoutGrid size={16} color={Colors.primaryDark} strokeWidth={2} />
    </View>
    <View style={styles.linkText}>
      <Text style={styles.linkTitle}>View all vehicles</Text>
      <Text style={styles.linkSubtitle}>
        Brochure videos by vehicle type and seater
      </Text>
    </View>
    <ChevronRight size={18} color={Colors.primaryDark} strokeWidth={2} />
  </Pressable>
);

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
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 52,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.surface,
  },
  linkIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    flex: 1,
  },
  linkTitle: {
    ...Typography.label,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  linkSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
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
