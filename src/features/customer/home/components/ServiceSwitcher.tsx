/**
 * ------------------------------------------------------------------
 * ServiceSwitcher
 * ------------------------------------------------------------------
 * Icon-over-label tab switcher between the two customer service
 * modes (Car & Bus Rental / Spiritual Tours).
 *
 * Design pattern (extracted from reference tab-switcher UI):
 *   - Icon sits above a bold label, not beside it.
 *   - The ACTIVE tab reads as a lifted card: larger top-corner
 *     radius, tinted background, colored border + soft shadow —
 *     it looks like it belongs to the content below it.
 *   - INACTIVE tabs recede: flat, no border/shadow, muted icon
 *     opacity, gray label. They sit "in" the background rather
 *     than "on" it.
 *   - A thin shelf line runs under the whole row, tying the tabs
 *     visually to the section beneath them.
 * ------------------------------------------------------------------ */

import React, { useCallback } from 'react';
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Colors, Radius, Spacing } from '@theme';
import { SERVICE_MODE_LABEL, type ServiceMode } from '../types';

type Props = {
  value: ServiceMode;
  onChange: (next: ServiceMode) => void;
};

type Option = {
  value: ServiceMode;
  image: ImageSourcePropType;
};

const OPTIONS: readonly Option[] = [
  {
    value: 'car_bus',
    image: require('@assets/images/service-car.png'),
  },
  {
    value: 'spiritual_tour',
    image: require('@assets/images/service-temple.png'),
  },
];

const ACTIVE_TINT = '#F1FAF2';

/* ------------------------------------------------------------------
 * Main component
 * ------------------------------------------------------------------ */

export const ServiceSwitcher: React.FC<Props> = ({ value, onChange }) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.tabs}>
        {OPTIONS.map(option => (
          <ServiceTab
            key={option.value}
            option={option}
            selected={value === option.value}
            onPress={onChange}
          />
        ))}
      </View>

      {/* Shelf — thin base line connecting the tabs to whatever
       * section renders next, so the row doesn't feel detached. */}
      <View style={styles.shelf} />
    </View>
  );
};

/* ------------------------------------------------------------------
 * Individual tab
 * ------------------------------------------------------------------ */

type ServiceTabProps = {
  option: Option;
  selected: boolean;
  onPress: (value: ServiceMode) => void;
};

const ServiceTab: React.FC<ServiceTabProps> = ({
  option,
  selected,
  onPress,
}) => {
  const handlePress = useCallback(() => {
    onPress(option.value);
  }, [onPress, option.value]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.tab,
        selected ? styles.tabActive : styles.tabInactive,
        pressed && styles.pressed,
      ]}
    >
      <Image
        source={option.image}
        resizeMode="contain"
        style={[
          styles.image,
          option.value === 'car_bus' ? styles.carImage : styles.templeImage,
          !selected && styles.imageInactive,
        ]}
      />

      <Text
        numberOfLines={1}
        style={[
          styles.label,
          selected ? styles.activeLabel : styles.inactiveLabel,
        ]}
      >
        {SERVICE_MODE_LABEL[option.value]}
      </Text>
    </Pressable>
  );
};

/* ------------------------------------------------------------------
 * Styles
 * ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.xl,
  },

  tabs: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,

    /* Folder-tab silhouette: generous top rounding, flatter
     * bottom — reads as "lifted" rather than a plain rounded box. */
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderBottomLeftRadius: Radius.xs,
    borderBottomRightRadius: Radius.xs,
  },

  tabActive: {
    backgroundColor: ACTIVE_TINT,
    borderWidth: 1.2,
    borderColor: Colors.primary,
    borderBottomWidth: 0,
    shadowColor: Colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  tabInactive: {
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1.2,
    borderColor: Colors.border,
    borderBottomWidth: 0,
  },

  pressed: {
    opacity: 0.82,
  },

  image: {
    marginBottom: Spacing.xs,
  },

  imageInactive: {
    opacity: 0.55,
  },

  carImage: {
    width: 68,
    height: 44,
  },

  templeImage: {
    width: 56,
    height: 44,
  },

  label: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
  },

  activeLabel: {
    color: Colors.primary,
  },

  inactiveLabel: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },

  /* Thin base line under the whole tab row, sitting flush with
   * the active tab's flattened bottom corners. */
  shelf: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginTop: -1,
  },
});