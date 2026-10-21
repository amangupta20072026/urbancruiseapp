/**
 * ------------------------------------------------------------------
 * PhoneNumberPickerSheet — choose which number to call / WhatsApp
 * ------------------------------------------------------------------
 * Generalised from the customer NumberPickerSheet (same look) so all
 * four directory roles share one picker.
 *
 * Renders as a native RN Modal, not a gorhom sheet, on purpose:
 *   - it stacks cleanly over the open DirectoryContactSheet without
 *     portal / animation-lifecycle conflicts;
 *   - a Modal receives the Android back press BEFORE the contact
 *     sheet's BackHandler, so back closes the picker, not the screen.
 *
 * UX contract:
 *   - One row per number; tap → onSelect(number).
 *   - Backdrop tap, Cancel, or hardware back → onCancel.
 *   - The parent shows this only for 2+ distinct numbers.
 *   - Numbers are shown masked (maskPhone); onSelect still receives
 *     the raw number, so the call / WhatsApp goes to the real one.
 * ------------------------------------------------------------------
 */

import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Phone } from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { maskPhone } from '@shared/utils';

import type { ContactPhone } from './types';

type Props = {
  visible: boolean;
  /** e.g. "Call Ravi Kumar" or "WhatsApp Ravi Kumar". */
  title: string;
  options: readonly ContactPhone[];
  onSelect: (phone: string) => void;
  onCancel: () => void;
};

export const PhoneNumberPickerSheet: React.FC<Props> = ({
  visible,
  title,
  options,
  onSelect,
  onCancel,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onCancel}
    statusBarTranslucent
  >
    {/* Outer backdrop — taps outside the sheet cancel. */}
    <TouchableWithoutFeedback
      onPress={onCancel}
      accessibilityRole="button"
      accessibilityLabel="Close number picker"
    >
      <View style={styles.backdrop}>
        {/* Inner sheet swallows taps so they don't reach the backdrop. */}
        <TouchableWithoutFeedback accessible={false}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            <Text style={styles.subtitle}>Choose a number to use</Text>

            {options.map(option => (
              <PhoneOption
                key={`${option.label}:${option.value}`}
                option={option}
                onSelect={onSelect}
              />
            ))}

            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={({ pressed }) => [
                styles.cancel,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
);

/* ---------------- One row per number ---------------- */

const PhoneOption: React.FC<{
  option: ContactPhone;
  onSelect: (phone: string) => void;
}> = ({ option, onSelect }) => {
  const masked = maskPhone(option.value);
  return (
    <Pressable
      onPress={() => onSelect(option.value)}
      accessibilityRole="button"
      accessibilityLabel={`${option.label} number ${masked}`}
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Phone size={18} color={Colors.primary} strokeWidth={2.2} />
      </View>
      <View style={styles.optionText}>
        <Text style={styles.region}>{option.label}</Text>
        <Text style={styles.phone} numberOfLines={1}>
          {masked}
        </Text>
      </View>
    </Pressable>
  );
};

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
    ...Shadows.md,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h4,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.sm,
  },
  pressed: { opacity: 0.7 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E7F7EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1 },
  region: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  phone: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  cancel: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    alignItems: 'center',
  },
  cancelText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
