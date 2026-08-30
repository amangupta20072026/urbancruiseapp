/* eslint-disable react-native/no-inline-styles */
/**
 * ------------------------------------------------------------------
 * VendorNumberPickerSheet
 * ------------------------------------------------------------------
 * Secondary bottom sheet that appears when the user taps Call or
 * WhatsApp on a vendor with two lines. Modeled on the customer
 * NumberPickerSheet — controlled via `open` prop instead of an
 * imperative ref, so the parent (VendorContactSheet) can drive it
 * from state.
 * ------------------------------------------------------------------
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Phone } from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';

import type { Vendor } from '../types';

type Props = {
  open: boolean;
  vendor: Vendor;
  action: 'call' | 'whatsapp' | null;
  onSelect: (phone: string) => void;
  onCancel: () => void;
};

export const VendorNumberPickerSheet: React.FC<Props> = ({
  open,
  vendor,
  action,
  onSelect,
  onCancel,
}) => {
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['38%'], []);

  useEffect(() => {
    if (open) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [open]);

  const renderBackdrop = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      opacity={0.5}
      pressBehavior="close"
    />
  );

  const title =
    action === 'call'
      ? 'Which number to call?'
      : action === 'whatsapp'
      ? 'Which number to message?'
      : 'Pick a number';

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      index={0}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      onDismiss={onCancel}
      enablePanDownToClose
      handleIndicatorStyle={{ backgroundColor: Colors.border, width: 40 }}
      backgroundStyle={{
        backgroundColor: Colors.surface,
        borderTopLeftRadius: Radius.xl,
        borderTopRightRadius: Radius.xl,
      }}
    >
      <BottomSheetView style={styles.body}>
        <Text style={styles.title}>{title}</Text>

        <NumberButton
          label="Primary"
          number={vendor.phone}
          onPress={() => onSelect(vendor.phone)}
        />
        {vendor.phoneAlt && (
          <NumberButton
            label="Secondary"
            number={vendor.phoneAlt}
            onPress={() => onSelect(vendor.phoneAlt as string)}
          />
        )}

        <Pressable onPress={onCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

type ButtonProps = { label: string; number: string; onPress: () => void };

const NumberButton: React.FC<ButtonProps> = ({ label, number, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    accessibilityRole="button"
    accessibilityLabel={`${label} phone ${number}`}
  >
    <View style={styles.rowIcon}>
      <Phone size={18} color={Colors.primary} />
    </View>
    <View style={styles.rowText}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowNumber}>{number}</Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  title: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.background,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  rowNumber: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
  cancelText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
