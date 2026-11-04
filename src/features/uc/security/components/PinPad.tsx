/**
 * Number pad for MPIN entry (an in-app pad, so the MPIN never goes
 * through a third-party keyboard). Bottom-left shows a fingerprint key
 * only when `onBiometric` is given, like Google Pay.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Delete, FingerprintPattern } from 'lucide-react-native';
import { Colors, Radius, Spacing } from '@theme';

type Props = {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onBiometric?: () => void;
  disabled?: boolean;
};

const ROWS: readonly (readonly string[])[] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

export const PinPad: React.FC<Props> = ({
  onDigit,
  onDelete,
  onBiometric,
  disabled = false,
}) => {
  const renderDigit = (d: string) => (
    <Pressable
      key={d}
      onPress={() => onDigit(d)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={d}
      style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
    >
      <Text style={[styles.keyText, disabled && styles.keyTextDisabled]}>
        {d}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.pad}>
      {ROWS.map(row => (
        <View key={row.join('')} style={styles.row}>
          {row.map(renderDigit)}
        </View>
      ))}
      <View style={styles.row}>
        {onBiometric ? (
          <Pressable
            onPress={onBiometric}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Use fingerprint"
            style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
          >
            <FingerprintPattern
              size={28}
              color={Colors.primaryDark}
              strokeWidth={1.8}
            />
          </Pressable>
        ) : (
          <View style={styles.key} />
        )}
        {renderDigit('0')}
        <Pressable
          onPress={onDelete}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Delete last digit"
          style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
        >
          <Delete size={26} color={Colors.textPrimary} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pad: { gap: Spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  key: {
    flex: 1,
    height: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: { backgroundColor: Colors.backgroundTertiary },
  keyText: { fontSize: 26, fontWeight: '500', color: Colors.textPrimary },
  keyTextDisabled: { color: Colors.textDisabled },
});
