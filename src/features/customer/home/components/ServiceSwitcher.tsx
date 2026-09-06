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

  const handlePress = useCallback(() => {
    onPress(option.value);
  }, [onPress, option.value]);

  const path = width > 0 ? buildTilePath(width) : '';

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
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
        <Image
          source={option.image}
          resizeMode="contain"
          style={[
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
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  tiles: {
    flexDirection: 'row',
    gap: Spacing.sm + 2,
  },
  tile: {
    flex: 1,
    height: TILE_HEIGHT,
  },
  pressed: {
    opacity: 0.85,
  },
  content: {
    flex: 1,
    paddingTop: 3,
    paddingBottom: FLARE_HEIGHT - 6,
    paddingHorizontal: TOP_INSET + 4,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  carImage: { width: 58, height: 58 },
  templeImage: { width: 58, height: 58 },
  imageInactive: { opacity: 0.6 },
  label: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  activeLabel: { color: Colors.primary },
  inactiveLabel: { color: Colors.textSecondary, fontWeight: '600' },
});
