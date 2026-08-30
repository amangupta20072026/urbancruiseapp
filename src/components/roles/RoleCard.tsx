/**
 * ------------------------------------------------------------------
 * RoleCard — shared card for the role picker
 * ------------------------------------------------------------------
 * Handles the tap, selected-state visuals, and the small spring
 * "pop" on press. No entrance animation — parents can wrap this
 * in an <Animated.View entering={...} /> if they want a stagger.
 * ------------------------------------------------------------------
 */

import React, { memo, useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  Colors,
  Dimensions,
  Radius,
  Shadows,
  Spacing,
  Typography,
} from '../../theme';
import type { UserRole } from '../../store/slices/appSlice';
import {
  CheckIcon,
  TINT_COLOR,
  withAlpha,
  type RoleConfig,
} from './config';

type RoleCardProps = {
  role: RoleConfig;
  selected: boolean;
  onPress: (id: UserRole) => void;
};

const RoleCard: React.FC<RoleCardProps> = memo(({ role, selected, onPress }) => {
  const { Icon, pickerTitle, description, tint, id } = role;
  const tintColor = TINT_COLOR[tint];

  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 14, stiffness: 260 });
  }, [selected, scale]);

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 16, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 260 });
    });
    onPress(id);
  }, [onPress, id, scale]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const badgeAnimStyle = useAnimatedStyle(() => ({
    backgroundColor: selected ? tintColor : 'transparent',
    borderColor: selected ? tintColor : Colors.border,
    transform: [{ scale: withTiming(selected ? 1 : 0.85, { duration: 150 }) }],
  }));

  return (
    <Animated.View style={[styles.card, cardAnimStyle]}>
      <Pressable
        onPress={handlePress}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={`${pickerTitle}. ${description}`}
        style={({ pressed }) => [
          styles.cardInner,
          pressed && styles.cardPressed,
        ]}
      >
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: withAlpha(tintColor, 0.12) },
          ]}
        >
          <Icon color={tintColor} size={Dimensions.iconLg} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {pickerTitle}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={2}>
            {description}
          </Text>
        </View>
        <Animated.View style={[styles.checkBadge, badgeAnimStyle]}>
          {selected && <CheckIcon color={Colors.white} size={14} />}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});
RoleCard.displayName = 'RoleCard';

export default RoleCard;

/* -----------------------------------------------------------------
 * Styles
 * ----------------------------------------------------------------- */

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
    ...Shadows.xs,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  cardPressed: {
    opacity: 0.9,
  },
  iconWrap: {
    width: Dimensions.avatarLg,
    height: Dimensions.avatarLg,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  cardSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: Radius.circle,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});