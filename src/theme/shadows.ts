// src/theme/shadows.ts
/**
 * ------------------------------------------------------------------
 * urbancruise Shadow System
 * ------------------------------------------------------------------
 * Centralized elevation and shadow tokens.
 *
 * Android:
 *   Uses elevation.
 *
 * iOS:
 *   Uses shadowColor, shadowOffset, shadowOpacity and shadowRadius.
 *
 * Rules:
 * - Do not hardcode shadows inside components.
 * - Prefer these predefined tokens.
 * - Keep shadows subtle and consistent.
 * ------------------------------------------------------------------
 */

import { ViewStyle } from 'react-native';

export const Shadows = {
  none: {
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0,
    shadowRadius: 0,
  },

  xs: {
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },

  sm: {
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.10,
    shadowRadius: 3,
  },

  md: {
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: 5,
  },

  lg: {
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.14,
    shadowRadius: 7,
  },

  xl: {
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.16,
    shadowRadius: 10,
  },

  xxl: {
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
} satisfies Record<string, ViewStyle>;

export type ShadowKey = keyof typeof Shadows;

export default Shadows;