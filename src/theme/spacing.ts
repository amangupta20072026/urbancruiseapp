// src/theme/spacing.ts
/**
 * ------------------------------------------------------------------
 * urbancruise Spacing System
 * ------------------------------------------------------------------
 * Centralized spacing tokens.
 *
 * Rules:
 * - Do not hardcode spacing values inside components.
 * - Prefer these tokens for margin, padding, gap, and positioning.
 * - Based on a 4pt spacing grid.
 * ------------------------------------------------------------------
 */

export const Spacing = {
  /** 0px */
  none: 0,

  /** 2px */
  xxs: 2,

  /** 4px */
  xs: 4,

  /** 8px */
  sm: 8,

  /** 12px */
  md: 12,

  /** 16px */
  lg: 16,

  /** 20px */
  xl: 20,

  /** 24px */
  xxl: 24,

  /** 28px */
  xxxl: 28,

  /** 32px */
  xxxxl: 32,

  /** 40px */
  huge: 40,

  /** 48px */
  massive: 48,

  /** 56px */
  section: 56,

  /** 64px */
  sectionLarge: 64,

  /** 72px */
  sectionXLarge: 72,

  /** 80px */
  screen: 80,
} as const;

export type SpacingKey = keyof typeof Spacing;

export type SpacingValue = (typeof Spacing)[SpacingKey];

export default Spacing;