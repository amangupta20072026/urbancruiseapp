/**
 * "Watch Video" + "Compare" row shown on every vehicle card of a
 * pending quotation (between the spec row and the price footer).
 *
 *   videoState 'available'  → Watch Video button
 *   videoState 'comingSoon' → disabled "Video coming soon"
 *   videoState 'none'       → no video button (no brochure for this
 *                             vehicle, or the catalog is loading /
 *                             failed); Compare takes the full width
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeftRight, Clock, Play } from 'lucide-react-native';
import { Colors, Radius, Spacing, Typography } from '@theme';

export type BrochureVideoState = 'available' | 'comingSoon' | 'none';

export type BrochureActionRowProps = {
  videoState: BrochureVideoState;
  onWatchVideo: () => void;
  onCompare: () => void;
  /** e.g. "ROYAL Force Traveller", for screen readers. */
  vehicleName: string;
};

export const BrochureActionRow: React.FC<BrochureActionRowProps> = ({
  videoState,
  onWatchVideo,
  onCompare,
  vehicleName,
}) => (
  <View style={styles.row}>
    {videoState === 'available' ? (
      <Pressable
        onPress={onWatchVideo}
        style={({ pressed }) => [
          styles.btn,
          styles.videoBtn,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Watch video of ${vehicleName}`}
      >
        <Play
          size={15}
          color={Colors.primaryDark}
          fill={Colors.primaryDark}
          strokeWidth={2}
        />
        <Text style={[styles.label, styles.videoLabel]}>Watch Video</Text>
      </Pressable>
    ) : null}

    {videoState === 'comingSoon' ? (
      <View
        style={[styles.btn, styles.soonBtn]}
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        accessibilityLabel={`Video of ${vehicleName} coming soon`}
      >
        <Clock size={15} color={Colors.textSecondary} strokeWidth={2} />
        <Text style={[styles.label, styles.soonLabel]}>Video coming soon</Text>
      </View>
    ) : null}

    <Pressable
      onPress={onCompare}
      style={({ pressed }) => [
        styles.btn,
        styles.compareBtn,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Compare ${vehicleName} with other vehicles`}
    >
      <ArrowLeftRight size={15} color={Colors.textPrimary} strokeWidth={2} />
      <Text style={styles.label}>Compare</Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  btn: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  videoBtn: {
    backgroundColor: Colors.primaryTint,
    borderColor: Colors.primaryLight,
  },
  soonBtn: {
    backgroundColor: Colors.surfaceMuted,
    borderColor: Colors.textTertiary,
    borderStyle: 'dashed',
  },
  compareBtn: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  label: {
    ...Typography.label,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  videoLabel: {
    color: Colors.primaryDark,
  },
  soonLabel: {
    color: Colors.textSecondary,
  },
  pressed: {
    opacity: 0.75,
  },
});
