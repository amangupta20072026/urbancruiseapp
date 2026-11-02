/**
 * ------------------------------------------------------------------
 * Shared role config
 * ------------------------------------------------------------------
 * Single source of truth for the four user roles. Consumed by:
 *   - OnboardingDashboardScreen  (role picker cards)
 *   - LoginScreen                (Selected Role card + welcome text)
 *   - RoleSelectionSheet         (bottom sheet role switcher)
 * ------------------------------------------------------------------
 */

import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Colors } from '../../theme';
import type { UserRole } from '../../store/slices/appSlice';

/* -----------------------------------------------------------------
 * Types
 * ----------------------------------------------------------------- */

export type IconProps = { color: string; size: number };
export type RoleTint = 'primary' | 'secondary' | 'accent' | 'info';

export type RoleConfig = {
  id: UserRole;
  /** Long form shown on picker cards ("I am a Customer" / "Urban Cruise"). */
  pickerTitle: string;
  /** Short form shown in Selected Role card + welcome text ("Customer" / "Urban Cruise"). */
  shortLabel: string;
  description: string;
  Icon: React.FC<IconProps>;
  tint: RoleTint;
  /**
   * When true, RoleCard passes the full icon-circle diameter as `size`
   * (instead of the standard icon size) and the Icon fits itself inside
   * that circle. Used for the brand logo, which must fill the circle.
   */
  iconFillsCircle?: boolean;
};

/* -----------------------------------------------------------------
 * Icons
 * ----------------------------------------------------------------- */

export const UserIcon: React.FC<IconProps> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={8} r={3.5} stroke={color} strokeWidth={1.8} />
    <Path
      d="M5 20c1.4-3.5 3.9-5 7-5s5.6 1.5 7 5"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

export const BusIcon: React.FC<IconProps> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x={4}
      y={4}
      width={16}
      height={13}
      rx={2.5}
      stroke={color}
      strokeWidth={1.8}
    />
    <Path d="M4 11h16" stroke={color} strokeWidth={1.8} />
    <Path
      d="M8 17v2M16 17v2"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <Circle cx={8.5} cy={14} r={1} fill={color} />
    <Circle cx={15.5} cy={14} r={1} fill={color} />
  </Svg>
);

export const SteeringIcon: React.FC<IconProps> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={1.8} />
    <Circle cx={12} cy={12} r={2} stroke={color} strokeWidth={1.8} />
    <Path
      d="M12 14v6M13.5 12.5l5.5 3M10.5 12.5l-5.5 3"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

// Urban Cruise logo mark used as the "uc" role icon.
//
// Uses the existing uc-icon.png as is (no extra image files). That file
// is 1280×1280 with empty transparent space around the logo, so the
// image is drawn larger than the circle and shifted so only the logo
// area shows, inside a clipping box exactly the logo's size.
//
// `size` is the diameter of the circle the logo sits in (RoleCard
// passes the full circle because the role sets `iconFillsCircle`).
// The logo is scaled to the largest box of its own shape that fits
// inside that circle, with a small gap so its corners never touch the
// circle edge.
//
// `color` is intentionally ignored: the logo keeps its brand colours.
const UC_ICON = require('@assets/icons/uc-icon.png');

/**
 * Where the visible logo sits inside uc-icon.png, as fractions of the
 * image's width/height. Measured from the file's non-transparent pixels:
 * the 1280×1280 image has the logo at x 251–1031 and y 398–882.
 * If uc-icon.png is ever replaced, measure these four values again.
 */
const UC_ICON_LOGO_BOX = {
  left: 251 / 1280,
  top: 398 / 1280,
  width: 780 / 1280,
  height: 484 / 1280,
} as const;

/** Logo width ÷ height (the image is square, so fractions compare directly). */
const UC_ICON_LOGO_ASPECT = UC_ICON_LOGO_BOX.width / UC_ICON_LOGO_BOX.height;

/** Gap (pt) between the logo's corners and the circle edge, per side. */
const UC_LOGO_CIRCLE_GAP = 1;

export const UcLogoIcon: React.FC<IconProps> = ({ size }) => {
  const diameter = Math.max(0, size - UC_LOGO_CIRCLE_GAP * 2);
  // Rectangle with aspect a inside a circle of diameter d:
  // height = d / sqrt(a² + 1), width = a × height.
  const logoHeight =
    diameter / Math.sqrt(UC_ICON_LOGO_ASPECT * UC_ICON_LOGO_ASPECT + 1);
  const logoWidth = logoHeight * UC_ICON_LOGO_ASPECT;

  // Draw the whole square image so its logo area is logoWidth wide,
  // then shift it so that area lines up with the clipping box.
  const imageSize = logoWidth / UC_ICON_LOGO_BOX.width;

  return (
    <View style={[logoStyles.clip, { width: logoWidth, height: logoHeight }]}>
      <Image
        source={UC_ICON}
        style={[
          logoStyles.image,
          {
            width: imageSize,
            height: imageSize,
            left: -imageSize * UC_ICON_LOGO_BOX.left,
            top: -imageSize * UC_ICON_LOGO_BOX.top,
          },
        ]}
        resizeMode="contain"
        // Android: decode the 1280px file at the drawn size, not full size,
        // to keep memory low.
        resizeMethod="resize"
        // Decorative: the card's accessibilityLabel already says "Urban Cruise".
        accessible={false}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
};

const logoStyles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  image: { position: 'absolute' },
});

export const CheckIcon: React.FC<IconProps> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 12.5l4.5 4.5L19 7"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/* -----------------------------------------------------------------
 * Data
 * ----------------------------------------------------------------- */

export const ROLES: RoleConfig[] = [
  {
    id: 'customer',
    pickerTitle: 'I am a Customer',
    shortLabel: 'Customer',
    description: 'Book Vehicles & Packages',
    Icon: UserIcon,
    tint: 'primary',
  },
  {
    id: 'vendor',
    pickerTitle: 'I am a Vendor',
    shortLabel: 'Vendor',
    description: 'List your Fleet & receive Bookings',
    Icon: BusIcon,
    tint: 'secondary',
  },
  {
    id: 'driver',
    pickerTitle: 'I am a Driver',
    shortLabel: 'Driver',
    description: 'Drive assigned Trips',
    Icon: SteeringIcon,
    tint: 'info',
  },
  {
    id: 'uc',
    pickerTitle: 'Urban Cruise',
    shortLabel: 'Urban Cruise',
    description: 'Manage Sales & Operations',
    Icon: UcLogoIcon,
    tint: 'accent',
    iconFillsCircle: true,
  },
];

export const ROLE_MAP: Record<UserRole, RoleConfig> = ROLES.reduce((acc, r) => {
  acc[r.id] = r;
  return acc;
}, {} as Record<UserRole, RoleConfig>);

export const TINT_COLOR: Record<RoleTint, string> = {
  primary: Colors.primary,
  secondary: Colors.secondaryDark,
  accent: Colors.secondary,
  info: Colors.info,
};

/* -----------------------------------------------------------------
 * Utility
 * ----------------------------------------------------------------- */

export const withAlpha = (hex: string, alpha: number): string => {
  const suffix = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${suffix}`;
};
