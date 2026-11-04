/**
 * Four MPIN boxes. Filled boxes show a dot (never the digit). On an
 * error the boxes turn red and shake once (skipped with Reduce Motion).
 */
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Radius, Spacing } from '@theme';
import { MPIN_LENGTH } from '@services/ucSecurity/mpinRules';

type Props = {
  /** Digits entered so far (0–4). */
  filled: number;
  error?: boolean;
  /** Change this number to replay the shake (e.g. once per wrong MPIN). */
  shakeKey?: number;
};

export const PinBoxes: React.FC<Props> = ({
  filled,
  error = false,
  shakeKey = 0,
}) => {
  const reduceMotion = useReducedMotion();
  const x = useSharedValue(0);

  useEffect(() => {
    if (shakeKey === 0 || reduceMotion) return;
    x.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  }, [shakeKey, reduceMotion, x]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <Animated.View
      style={[styles.row, animated]}
      accessible
      accessibilityLabel={`${filled} of ${MPIN_LENGTH} digits entered`}
    >
      {Array.from({ length: MPIN_LENGTH }, (_, i) => {
        const isFilled = i < filled;
        const isActive = !error && i === filled;
        return (
          <View
            key={i}
            style={[
              styles.box,
              isActive && styles.boxActive,
              error && styles.boxError,
            ]}
          >
            {isFilled ? (
              <View style={[styles.dot, error && styles.dotError]} />
            ) : null}
          </View>
        );
      })}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.md },
  box: {
    width: 52,
    height: 58,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: Colors.primary, borderWidth: 2 },
  boxError: { borderColor: Colors.error },
  dot: {
    width: 12,
    height: 12,
    borderRadius: Radius.circle,
    backgroundColor: Colors.textPrimary,
  },
  dotError: { backgroundColor: Colors.error },
});
