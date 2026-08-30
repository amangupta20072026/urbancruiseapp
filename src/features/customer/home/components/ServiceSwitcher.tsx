import React, { useCallback, useState } from 'react';
import {
  Image,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Colors } from '@theme';
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

/* ------------------------------------------------------------------
 * IMPORTANT
 *
 * This is intentionally much shorter than the previous 164px card.
 * The reference is a navigation tab, not a content card.
 * ------------------------------------------------------------------ */

const TAB_HEIGHT = 92;

const TOP_RADIUS = 22;

/*
 * Small bottom inward curves.
 *
 * This is what makes it look like a folder/tab rather than
 * a rounded rectangle.
 */
const BOTTOM_CURVE = 16;

const BORDER_WIDTH = 1.2;

/* ------------------------------------------------------------------
 * Reference-style tab path
 * ------------------------------------------------------------------ */

const buildTabPath = (width: number, height: number): string => {
  return [
    /*
     * Top-left
     */
    `M ${TOP_RADIUS} 0`,

    /*
     * Top edge
     */
    `L ${width - TOP_RADIUS} 0`,

    /*
     * Top-right
     */
    `Q ${width} 0 ${width} ${TOP_RADIUS}`,

    /*
     * Right edge
     */
    `L ${width} ${height - BOTTOM_CURVE}`,

    /*
     * Bottom-right inward curve
     *
     * The curve comes inward rather than simply rounding
     * the corner.
     */
    `C ${width} ${height - 5}
       ${width - 8} ${height}
       ${width - BOTTOM_CURVE} ${height}`,

    /*
     * Bottom shelf section
     */
    `L ${BOTTOM_CURVE} ${height}`,

    /*
     * Bottom-left inward curve
     */
    `C 8 ${height}
       0 ${height - 5}
       0 ${height - BOTTOM_CURVE}`,

    /*
     * Left edge
     */
    `L 0 ${TOP_RADIUS}`,

    /*
     * Top-left
     */
    `Q 0 0 ${TOP_RADIUS} 0`,

    'Z',
  ].join(' ');
};

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

      {/* ------------------------------------------------------------
       * Shelf
       *
       * This is important.
       *
       * The reference doesn't look like two independent cards.
       * There is a horizontal base underneath the tabs.
       * ------------------------------------------------------------ */}

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
  const [width, setWidth] = useState(0);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  const handlePress = useCallback(() => {
    onPress(option.value);
  }, [onPress, option.value]);

  const path = width > 0 ? buildTabPath(width, TAB_HEIGHT) : '';

  return (
    <Pressable
      onPress={handlePress}
      onLayout={handleLayout}
      accessibilityRole="radio"
      accessibilityState={{
        selected,
      }}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
    >
      {/* ----------------------------------------------------------
       * Tab background
       * ---------------------------------------------------------- */}

      {width > 0 && (
        <Svg
          width={width}
          height={TAB_HEIGHT}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Path
            d={path}
            fill={selected ? '#F1FAF2' : '#F8F9FB'}
            stroke={selected ? Colors.primary : '#E3E6EB'}
            strokeWidth={BORDER_WIDTH}
          />
        </Svg>
      )}

      {/* ----------------------------------------------------------
       * Content
       * ---------------------------------------------------------- */}

      <View style={styles.content}>
        <Image
          source={option.image}
          resizeMode="contain"
          style={[
            styles.image,
            option.value === 'car_bus' ? styles.carImage : styles.templeImage,
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
      </View>
    </Pressable>
  );
};

/* ------------------------------------------------------------------
 * Styles
 * ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },

  tabs: {
    width: '100%',
    flexDirection: 'row',
  },

  tab: {
    flex: 1,
    height: TAB_HEIGHT,

    alignItems: 'center',
    justifyContent: 'center',

    overflow: 'hidden',
  },

  content: {
    width: '100%',
    height: '100%',

    alignItems: 'center',
    justifyContent: 'center',

    /*
     * Keep the content compact like the reference.
     */
    paddingTop: 7,
    paddingBottom: 10,
  },

  image: {
    resizeMode: 'contain',
    marginBottom: 3,
  },

  carImage: {
    width: 72,
    height: 48,
  },

  templeImage: {
    width: 60,
    height: 48,
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
  },

  pressed: {
    opacity: 0.82,
  },

  /*
   * The horizontal shelf underneath the tabs.
   */
  shelf: {
    height: 1,
    width: '100%',
    backgroundColor: '#E6E8EC',
  },
});
