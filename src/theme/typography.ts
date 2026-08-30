// src/theme/typography.ts
/**
 * ------------------------------------------------------------------
 * urbancruise Typography
 * ------------------------------------------------------------------
 * Centralized Typography System
 * Never hardcode font sizes or weights inside components.
 * ------------------------------------------------------------------
 */

import { TextStyle } from 'react-native';

export const FontFamily = {
  regular: 'System',
  medium: 'System',
  semiBold: 'System',
  bold: 'System',
} as const;

/**
 * ------------------------------------------------------------------
 * Font Sizes
 * ------------------------------------------------------------------
 */
export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  h5: 22,
  h4: 24,
  h3: 28,
  h2: 32,
  h1: 36,
} as const;

/**
 * ------------------------------------------------------------------
 * Font Weights
 * ------------------------------------------------------------------
 */
export const FontWeight = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
} as const;

/**
 * ------------------------------------------------------------------
 * Line Heights
 * ------------------------------------------------------------------
 */
export const LineHeight = {
  xs: 14,
  sm: 18,
  md: 20,
  lg: 24,
  xl: 28,
  xxl: 32,
  h5: 34,
  h4: 36,
  h3: 40,
  h2: 44,
  h1: 48,
} as const;

/**
 * ------------------------------------------------------------------
 * Letter Spacing
 * ------------------------------------------------------------------
 */
export const LetterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
} as const;

/**
 * ------------------------------------------------------------------
 * Typography Styles
 * ------------------------------------------------------------------
 */

export const Typography: Record<string, TextStyle> = {
  h1: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h1,
    fontWeight: FontWeight.bold,
    lineHeight: LineHeight.h1,
    letterSpacing: LetterSpacing.tight,
  },

  h2: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    lineHeight: LineHeight.h2,
  },

  h3: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.h3,
    fontWeight: FontWeight.semiBold,
    lineHeight: LineHeight.h3,
  },

  h4: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.h4,
    fontWeight: FontWeight.semiBold,
    lineHeight: LineHeight.h4,
  },

  h5: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.h5,
    fontWeight: FontWeight.semiBold,
    lineHeight: LineHeight.h5,
  },

  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semiBold,
    lineHeight: LineHeight.xl,
  },

  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
    lineHeight: LineHeight.lg,
  },

  bodyLarge: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.regular,
    lineHeight: LineHeight.lg,
  },

  body: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    fontWeight: FontWeight.regular,
    lineHeight: LineHeight.md,
  },

  bodySmall: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.regular,
    lineHeight: LineHeight.sm,
  },

  caption: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.regular,
    lineHeight: LineHeight.xs,
  },

  button: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semiBold,
    lineHeight: LineHeight.lg,
  },

  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    lineHeight: LineHeight.sm,
  },
};

export default Typography;