// src/theme/colors.ts
/**
 * ------------------------------------------------------------
 * urbancruise Theme Colors
 * ------------------------------------------------------------
 * Centralized Color Palette
 * Never hardcode colors inside components.
 * ------------------------------------------------------------
 */

export const Colors = {
  /**
   * ------------------------------------------------------------
   * Brand Colors
   * ------------------------------------------------------------
   */
  primary: '#4CAF50',
  primaryDark: '#2E7D32',
  primaryLight: '#81C784',

  secondary: '#F9A825',
  secondaryDark: '#F57F17',
  secondaryLight: '#FFD54F',

  accent: '#FF6F00',
  textOnPrimary: '#FFFFFF',

  /**
   * ------------------------------------------------------------
   * Background
   * ------------------------------------------------------------
   */
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  backgroundTertiary: '#F2F4F7',

  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',

  /**
   * ------------------------------------------------------------
   * Text
   * ------------------------------------------------------------
   */
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textDisabled: '#C7CBD1',

  textInverse: '#FFFFFF',

  /**
   * ------------------------------------------------------------
   * Border
   * ------------------------------------------------------------
   */
  border: '#E5E7EB',
  borderLight: '#F1F3F5',
  divider: '#ECEFF3',

  /**
   * ------------------------------------------------------------
   * Status
   * ------------------------------------------------------------
   */
  success: '#16A34A',
  warning: '#F59E0B',
  error: '#DC2626',
  info: '#0288D1',

  /**
   * ------------------------------------------------------------
   * Booking Status
   * ------------------------------------------------------------
   */
  pending: '#F59E0B',
  confirmed: '#16A34A',
  cancelled: '#DC2626',
  completed: '#2563EB',

  /**
   * ------------------------------------------------------------
   * Vendor
   * ------------------------------------------------------------
   */
  available: '#16A34A',
  busy: '#F59E0B',
  offline: '#9CA3AF',

  /**
   * ------------------------------------------------------------
   * Driver
   * ------------------------------------------------------------
   */
  onTrip: '#16A34A',
  onBreak: '#F59E0B',
  offDuty: '#9CA3AF',

  /**
   * ------------------------------------------------------------
   * Buttons
   * ------------------------------------------------------------
   */
  buttonPrimary: '#4CAF50',
  buttonPrimaryText: '#FFFFFF',

  buttonSecondary: '#FFFFFF',
  buttonSecondaryText: '#4CAF50',

  buttonDisabled: '#D1D5DB',

  /**
   * ------------------------------------------------------------
   * Icon Colors
   * ------------------------------------------------------------
   */
  iconPrimary: '#111827',
  iconSecondary: '#6B7280',
  iconDisabled: '#BDBDBD',

  /**
   * ------------------------------------------------------------
   * Muted Colors
   * ------------------------------------------------------------
   */
  textMuted: '#9CA3AF',
  surfaceMuted: '#F3F4F6',

  /**
   * ------------------------------------------------------------
   * Tint variants — soft backgrounds for status pills, icon chips,
   * activity rows, badges, etc. Each tint pairs 1:1 with a fg color
   * above and is what you use as the `bg` field wherever fg/bg
   * pairs are needed.
   *
   * Sourced as ~10-12% alpha of the paired fg color. Kept as opaque
   * hex (not rgba) so components can freely layer them without
   * blending against their parent surface.
   * ------------------------------------------------------------
   */
  primaryTint: '#E7F7EC', // pairs with primary / confirmed
  successTint: '#D1FAE5', // pairs with success (deeper green)
  warningTint: '#FEF3C7', // pairs with warning / pending
  errorTint: '#FEE2E2', // pairs with error / cancelled
  infoTint: '#E0F2FE', // pairs with info (sky blue)
  completedTint: '#DBEAFE', // pairs with completed (indigo blue)
  secondaryTint: '#FEF9C3', // pairs with secondary (gold)
  accentTint: '#FFE4CC', // pairs with accent (deep orange)

  /**
   * ------------------------------------------------------------
   * Overlay
   * ------------------------------------------------------------
   */
  overlay: 'rgba(0,0,0,0.45)',

  /**
   * ------------------------------------------------------------
   * Misc
   * ------------------------------------------------------------
   */
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  danger: '#EF4444',
} as const;

export type ColorType = keyof typeof Colors;

export default Colors;
