import React, { useCallback } from 'react';

import {
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Svg, { Path } from 'react-native-svg';

import { Colors, Spacing } from '@theme';

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
const INACTIVE_STROKE = '#D1D5DB';

const TILE_HEIGHT = 82;
const CORNER_RADIUS = 12;
const TOP_INSET = 8;
const FLARE_HEIGHT = 12;

/**
 * Builds the custom service tile shape.
 *
 * Shape:
 *   - Rounded top corners at `TOP_INSET` px in from the left/right edges
 *   - Straight sides down at the inset width
 *   - Bottom `FLARE_HEIGHT` px flares outward via Q curves to reach the
 *     full container width at y = h
 *
 * Layout contract with `ServiceSwitcher` (Swiggy-inspired):
 *   The two tiles sit edge-to-edge (`gap: 0`) inside `styles.tiles`, so
 *   the left tile's right-bottom flare and the right tile's left-bottom
 *   flare meet at a single point in the middle of the switcher at y = h.
 *   Above y = flareY, a triangular V-notch opens between them (16 px wide
 *   at the top) — that's the signature Swiggy look.
 *
 * Important:
 *   TILE_HEIGHT remains 82.
 *   We do not reduce the 80 × 80 car image.
 */
function buildTilePath(width: number): string {
  const w = width;
  const h = TILE_HEIGHT;
  const r = CORNER_RADIUS;
  const inset = TOP_INSET;
  const flareY = h - FLARE_HEIGHT;

  return [
    `M ${inset + r} 0`,
    `L ${w - inset - r} 0`,
    `Q ${w - inset} 0 ${w - inset} ${r}`,
    `L ${w - inset} ${flareY}`,
    `Q ${w - inset} ${h} ${w} ${h}`,
    `L 0 ${h}`,
    `Q ${inset} ${h} ${inset} ${flareY}`,
    `L ${inset} ${r}`,
    `Q ${inset} 0 ${inset + r} 0`,
    'Z',
  ].join(' ');
}

export const ServiceSwitcher: React.FC<Props> = ({ value, onChange }) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.tiles}>
        {OPTIONS.map(option => (
          <ServiceTile
            key={option.value}
            option={option}
            selected={value === option.value}
            onPress={onChange}
          />
        ))}
      </View>
    </View>
  );
};

type ServiceTileProps = {
  option: Option;
  selected: boolean;
  onPress: (value: ServiceMode) => void;
};

const ServiceTile: React.FC<ServiceTileProps> = ({
  option,
  selected,
  onPress,
}) => {
  const [width, setWidth] = React.useState(0);

  const isCarBus = option.value === 'car_bus';

  const handlePress = useCallback(() => {
    onPress(option.value);
  }, [onPress, option.value]);

  const path = width > 0 ? buildTilePath(width) : '';

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      {/* Custom background shape */}
      {width > 0 ? (
        <Svg width={width} height={TILE_HEIGHT} style={StyleSheet.absoluteFill}>
          <Path
            d={path}
            fill={selected ? ACTIVE_TINT : Colors.surface}
            stroke={selected ? Colors.primary : INACTIVE_STROKE}
            strokeWidth={selected ? 1.5 : 1}
          />
        </Svg>
      ) : null}

      <View style={styles.content}>
        {/* Vehicle / temple image */}
        <Image
          source={option.image}
          resizeMode="contain"
          style={[
            isCarBus ? styles.carImage : styles.templeImage,
            !selected && styles.imageInactive,
          ]}
        />

        {/* Service label */}
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            isCarBus ? styles.carLabel : styles.templeLabel,
            selected ? styles.activeLabel : styles.inactiveLabel,
          ]}
        >
          {SERVICE_MODE_LABEL[option.value]}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },

  /**
   * Tiles container.
   *
   * `gap: 0` is intentional — this is the Swiggy pattern. Each tile's
   * bottom flare reaches the full container width at y = TILE_HEIGHT,
   * so with zero horizontal gap the left tile's right-bottom flare and
   * the right tile's left-bottom flare meet at a single point in the
   * middle of the switcher. Above the flare region, the two tiles are
   * separated by a triangular V-notch that widens toward the top
   * (2 × TOP_INSET = 16 px at y = 0), giving the switcher the
   * distinctive "tabs sharing a bottom line" look.
   *
   * Do NOT put positive gap here without also revisiting the tile
   * shape — a gap would leave the flares floating with visible space
   * between them and break the pattern.
   */
  tiles: {
    flexDirection: 'row',
    gap: 0,
  },

  tile: {
    flex: 1,
    height: TILE_HEIGHT,
    overflow: 'visible',
  },

  pressed: {
    opacity: 0.85,
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /**
   * Keep the original image dimensions.
   *
   * The car is moved upward visually without:
   * - increasing TILE_HEIGHT
   * - reducing the image
   *
   * The label remains independently positioned.
   */
  carImage: {
    position: 'absolute',
    width: 80,
    height: 80,
    top: -14,
  },

  /**
   * Temple remains smaller and naturally centred.
   */
  templeImage: {
    width: 60,
    height: 60,
    position: 'absolute',
    top: 2,
  },

  imageInactive: {
    opacity: 0.6,
  },

  /**
   * Base label styles.
   */
  label: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 3,

    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    textAlign: 'center',
  },

  /**
   * Car & Bus Rental stays fixed inside
   * the bottom section of the tile.
   */
  carLabel: {
    bottom: 3,
  },

  /**
   * Spiritual Tours stays at the same
   * visual baseline as the car service.
   */
  templeLabel: {
    bottom: 3,
  },

  activeLabel: {
    color: Colors.primary,
  },

  inactiveLabel: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
