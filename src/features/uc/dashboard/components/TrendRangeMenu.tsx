/**
 * ------------------------------------------------------------------
 * TrendRangeMenu — "Last 7 Days ⌄" button + its dropdown menu
 * ------------------------------------------------------------------
 * The menu opens in a transparent Modal anchored under the button
 * (measured with measureInWindow), so it floats above the scroll
 * view and closes on an outside tap or the Android back button.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';

import { TREND_RANGES, TREND_RANGE_LABEL, type TrendRange } from '../types';

type Props = {
  value: TrendRange;
  onChange: (range: TrendRange) => void;
};

type Anchor = { top: number; right: number };

const MENU_GAP = 6;

export const TrendRangeMenu: React.FC<Props> = ({ value, onChange }) => {
  const buttonRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const { width: screenW } = useWindowDimensions();

  const open = useCallback(() => {
    buttonRef.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ top: y + h + MENU_GAP, right: screenW - (x + w) });
    });
  }, [screenW]);

  const close = useCallback(() => setAnchor(null), []);

  const pick = useCallback(
    (range: TrendRange) => {
      setAnchor(null);
      if (range !== value) onChange(range);
    },
    [onChange, value],
  );

  return (
    <>
      <Pressable
        ref={buttonRef}
        onPress={open}
        hitSlop={6}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Date range: ${TREND_RANGE_LABEL[value]}`}
        accessibilityHint="Opens a list of date ranges"
        accessibilityState={{ expanded: anchor !== null }}
      >
        <Text style={styles.buttonText}>{TREND_RANGE_LABEL[value]}</Text>
        <ChevronDown size={16} color={Colors.textSecondary} strokeWidth={2.2} />
      </Pressable>

      <Modal
        visible={anchor !== null}
        transparent
        animationType="fade"
        onRequestClose={close}
        statusBarTranslucent
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close date range list"
        />
        {anchor ? (
          <View
            style={[styles.menu, { top: anchor.top, right: anchor.right }]}
            accessibilityRole="menu"
          >
            {TREND_RANGES.map(range => {
              const selected = range === value;
              return (
                <Pressable
                  key={range}
                  onPress={() => pick(range)}
                  style={({ pressed }) => [
                    styles.item,
                    selected && styles.itemSelected,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[styles.itemText, selected && styles.itemTextOn]}
                  >
                    {TREND_RANGE_LABEL[range]}
                  </Text>
                  {selected ? (
                    <Check
                      size={16}
                      color={Colors.primaryDark}
                      strokeWidth={2.5}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  buttonText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  pressed: { opacity: 0.85 },

  menu: {
    position: 'absolute',
    minWidth: 168,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
  },
  itemSelected: { backgroundColor: Colors.primaryWash },
  itemText: { ...Typography.body, color: Colors.textPrimary },
  itemTextOn: { color: Colors.primaryDark, fontWeight: '700' },
});
