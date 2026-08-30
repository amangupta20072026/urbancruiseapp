// src/theme/dimensions.ts
/**
 * ------------------------------------------------------------------
 * urbancruise Dimensions
 * ------------------------------------------------------------------
 * Centralized UI dimensions.
 *
 * Use this file for:
 * - Component heights
 * - Component widths
 * - Icon sizes
 * - Avatar sizes
 * - Header heights
 * - Bottom tab heights
 * - Touch targets
 *
 * Use spacing.ts for:
 * - margin
 * - padding
 * - gap
 * - section spacing
 * ------------------------------------------------------------------
 */

export const Dimensions = {
  /**
   * --------------------------------------------------------------
   * Screen
   * --------------------------------------------------------------
   */

  screenHorizontalPadding: 24,

  screenVerticalPadding: 16,

  /**
   * --------------------------------------------------------------
   * Header
   * --------------------------------------------------------------
   */

  headerHeight: 56,

  headerIconSize: 24,

  headerLogoHeight: 32,

  headerLogoWidth: 120,

  /**
   * --------------------------------------------------------------
   * Bottom Tab
   * --------------------------------------------------------------
   */

  bottomTabHeight: 64,

  bottomTabIconSize: 24,

  bottomTabLabelSize: 12,

  /**
   * --------------------------------------------------------------
   * Buttons
   * --------------------------------------------------------------
   */

  buttonHeightSmall: 40,

  buttonHeight: 48,

  buttonHeightLarge: 56,

  buttonMinWidth: 120,

  buttonIconSize: 20,

  /**
   * --------------------------------------------------------------
   * Inputs
   * --------------------------------------------------------------
   */

  inputHeightSmall: 40,

  inputHeight: 48,

  inputHeightLarge: 56,

  inputIconSize: 20,

  /**
   * --------------------------------------------------------------
   * Icons
   * --------------------------------------------------------------
   */

  iconXs: 16,

  iconSm: 20,

  iconMd: 24,

  iconLg: 28,

  iconXl: 32,

  iconXxl: 40,

  /**
   * --------------------------------------------------------------
   * Avatar
   * --------------------------------------------------------------
   */

  avatarXs: 24,

  avatarSm: 32,

  avatarMd: 40,

  avatarLg: 48,

  avatarXl: 64,

  avatarXxl: 80,

  /**
   * --------------------------------------------------------------
   * Touch Targets
   * --------------------------------------------------------------
   *
   * 44–48px is a good baseline for interactive controls.
   */

  touchTargetMinimum: 44,

  touchTarget: 48,

  /**
   * --------------------------------------------------------------
   * Cards
   * --------------------------------------------------------------
   */

  cardMinHeight: 80,

  /**
   * --------------------------------------------------------------
   * Divider
   * --------------------------------------------------------------
   */

  dividerHeight: 1,

  /**
   * --------------------------------------------------------------
   * Loading
   * --------------------------------------------------------------
   */

  loaderSmall: 16,

  loaderMedium: 24,

  loaderLarge: 40,

  /**
   * --------------------------------------------------------------
   * Splash
   * --------------------------------------------------------------
   */

  splashLogoSmall: 100,

  splashLogo: 140,

  splashLogoLarge: 180,
} as const;

export type DimensionKey = keyof typeof Dimensions;

export type DimensionValue =
  (typeof Dimensions)[DimensionKey];

export default Dimensions;