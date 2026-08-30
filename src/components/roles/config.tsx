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

export const BadgeIcon: React.FC<IconProps> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2.5 4.5 5.2v6c0 4.9 3.2 9.3 7.5 10.5 4.3-1.2 7.5-5.6 7.5-10.5v-6L12 2.5z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    <Path
      d="M9 11h6M9 14h4"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

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
    Icon: BadgeIcon,
    tint: 'accent',
  },
];

export const ROLE_MAP: Record<UserRole, RoleConfig> = ROLES.reduce((acc, r) => {
  acc[r.id] = r;
  return acc;
}, {} as Record<UserRole, RoleConfig>);

export const TINT_COLOR: Record<RoleTint, string> = {
  primary: Colors.primary,
  secondary: Colors.secondaryDark,
  accent: Colors.accent,
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
