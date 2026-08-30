/**
 * ------------------------------------------------------------------
 * NumberPickerSheet — pick one of a customer's two phone numbers.
 * ------------------------------------------------------------------
 * Renders as a native RN Modal (not a gorhom bottom sheet) so it
 * stacks cleanly on top of an already-open @gorhom/bottom-sheet
 * without any portal / animation-lifecycle conflicts. Slide-up
 * animation comes for free via `animationType="slide"`.
 *
 * UX contract:
 *   - Two rows: INDIA and GLOBAL, tap either to invoke onSelect.
 *   - Backdrop tap OR hardware back (Android) → onCancel.
 *   - Cancel button at the bottom for touch users.
 *   - If both numbers are identical, the parent should skip this
 *     picker and dial directly — showing "pick between two of the
 *     same number" is a bug in the parent's flow.
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

type Props = {
  visible: boolean;
  /** e.g. "Call Karan Mehta" or "WhatsApp Karan Mehta". */
  title: string;
  phoneIndia: string;
  phoneGlobal: string;
  onSelect: (phone: string) => void;
  onCancel: () => void;
};

export const NumberPickerSheet: React.FC<Props> = ({
  visible,
  title,
  phoneIndia,
  phoneGlobal,
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
    <TouchableWithoutFeedback onPress={onCancel}>
      <View style={styles.backdrop}>
        {/* Inner sheet — intercept taps so they don't bubble to the
            backdrop-cancel handler above. */}
        <TouchableWithoutFeedback>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>Choose a number to use</Text>

            <PhoneOption
              region="India"
              phone={phoneIndia}
              onPress={() => onSelect(phoneIndia)}
            />
            <PhoneOption
              region="Global"
              phone={phoneGlobal}
              onPress={() => onSelect(phoneGlobal)}
            />

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
  region: string;
  phone: string;
  onPress: () => void;
}> = ({ region, phone, onPress }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`${region} number ${phone}`}
    style={({ pressed }) => [styles.option, pressed && styles.pressed]}
  >
    <View style={styles.iconWrap}>
      <Phone size={18} color={Colors.primary} strokeWidth={2.2} />
    </View>
    <View style={styles.optionText}>
      <Text style={styles.region}>{region}</Text>
      <Text style={styles.phone} numberOfLines={1}>
        {phone}
      </Text>
    </View>
  </Pressable>
);

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
