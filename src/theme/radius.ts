// src/theme/radius.ts
/**
 * ------------------------------------------------------------------
 * urbancruise Border Radius System
 * ------------------------------------------------------------------
 * Centralized corner-radius tokens.
 *
 * Rules:
 * - Do not hardcode borderRadius values inside components.
 * - Use these tokens consistently across Customer, Vendor,
 *   and Driver experiences.
 * ------------------------------------------------------------------
 */

export const Radius = {
  /** 0px - square corners */
  none: 0,

  /** 4px - very subtle rounding */
  xs: 4,

  /** 8px - small controls, compact cards */
  sm: 8,

  /** 12px - inputs, standard cards */
  md: 12,

  /** 16px - primary cards and buttons */
  lg: 16,

  /** 20px - larger cards and sheets */
  xl: 20,

  /** 24px - prominent containers */
  xxl: 24,

  /** 32px - large hero containers */
  xxxl: 32,

  /** Fully rounded / pill-shaped components */
  pill: 999,

  /** Circular elements */
  circle: 9999,
} as const;

export type RadiusKey = keyof typeof Radius;

export type RadiusValue = (typeof Radius)[RadiusKey];

export default Radius;