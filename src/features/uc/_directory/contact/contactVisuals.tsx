/**
 * ------------------------------------------------------------------
 * Directory contact — shared visual building blocks
 * ------------------------------------------------------------------
 * Used by both contact-sheet layouts (the list layout in
 * DirectoryContactSheet and SectionedContactContent), so the close
 * button, quick actions, status pills and Cancel look and behave the
 * same everywhere.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  CircleCheck,
  CircleMinus,
  CircleX,
  Clock,
  Mail,
  Phone,
  X,
  type LucideIcon,
} from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';

import type { ContactPill, ContactTone } from './types';

/* ------------------------------------------------------------------ */
/* Tokens                                                             */
/* ------------------------------------------------------------------ */

const CLOSE_BG = '#FF5A5F';

const CALL_TINT = { bg: '#EAF2FF', fg: '#1D6BFF' };
const WHATSAPP_TINT = { bg: '#E3F9EA', fg: '#1FA855' };
const EMAIL_TINT = { bg: '#FFF1E0', fg: '#D97B0A' };

/** Pill colours per tone. */
export const TONE_COLOURS: Record<ContactTone, { bg: string; fg: string }> = {
  success: { bg: Colors.primaryTint, fg: Colors.success },
  warning: { bg: Colors.warningTint, fg: Colors.pendingDark },
  danger: { bg: Colors.errorTint, fg: Colors.error },
  neutral: { bg: Colors.surfaceMuted, fg: Colors.textSecondary },
};

/** Filled icon shown inside a status pill, per tone. */
const TONE_ICON: Record<ContactTone, LucideIcon> = {
  success: CircleCheck,
  warning: Clock,
  danger: CircleX,
  neutral: CircleMinus,
};

/* ------------------------------------------------------------------ */
/* Props shared by both layouts                                       */
/* ------------------------------------------------------------------ */

export type ContactActions = {
  onCall: () => void;
  onWhatsApp: () => void;
  onEmail: () => void;
  onClose: () => void;
};

/* ------------------------------------------------------------------ */
/* Components                                                         */
/* ------------------------------------------------------------------ */

/** Red × in the top-right corner — one of only two ways to close. */
export const CloseButton: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <Pressable
    onPress={onPress}
    hitSlop={12}
    accessibilityRole="button"
    accessibilityLabel="Close"
    style={({ pressed }) => [styles.closeBtn, pressed && styles.closePressed]}
  >
    <X size={16} color={Colors.textInverse} strokeWidth={2.5} />
  </Pressable>
);

/** Cancel at the bottom — the other way to close (with ×). */
export const CancelButton: React.FC<{ onPress: () => void }> = ({
  onPress,
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel="Cancel and close"
    style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
  >
    <Text style={styles.cancelText}>Cancel</Text>
  </Pressable>
);

/**
 * Call / WhatsApp / Email row.
 *  - 'plain': icon circles on the sheet background (list layout).
 *  - 'card':  each action in its own bordered card (sectioned layout).
 */
export const QuickActions: React.FC<{
  variant: 'plain' | 'card';
  hasPhone: boolean;
  hasEmail: boolean;
  onCall: () => void;
  onWhatsApp: () => void;
  onEmail: () => void;
}> = ({ variant, hasPhone, hasEmail, onCall, onWhatsApp, onEmail }) => (
  <View style={variant === 'card' ? styles.quickRowCard : styles.quickRowPlain}>
    <QuickAction
      variant={variant}
      label="Call"
      tint={CALL_TINT}
      onPress={onCall}
      disabled={!hasPhone}
      disabledHint="No phone number on file"
      icon={<Phone size={22} color={CALL_TINT.fg} strokeWidth={2.2} />}
    />
    <QuickAction
      variant={variant}
      label="WhatsApp"
      tint={WHATSAPP_TINT}
      onPress={onWhatsApp}
      disabled={!hasPhone}
      disabledHint="No phone number on file"
      icon={<WhatsAppIcon size={22} color={WHATSAPP_TINT.fg} />}
    />
    <QuickAction
      variant={variant}
      label="Email"
      tint={EMAIL_TINT}
      onPress={onEmail}
      disabled={!hasEmail}
      disabledHint="No email address on file"
      icon={<Mail size={22} color={EMAIL_TINT.fg} strokeWidth={2.2} />}
    />
  </View>
);

const QuickAction: React.FC<{
  variant: 'plain' | 'card';
  label: string;
  icon: React.ReactNode;
  tint: { bg: string; fg: string };
  onPress: () => void;
  disabled: boolean;
  /** Read by screen readers when the action is disabled. */
  disabledHint: string;
}> = ({ variant, label, icon, tint, onPress, disabled, disabledHint }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled }}
    accessibilityHint={disabled ? disabledHint : undefined}
    style={({ pressed }) => [
      variant === 'card' ? styles.quickCard : styles.quickPlain,
      pressed && !disabled && styles.quickPressed,
      disabled && styles.quickDisabled,
    ]}
  >
    <View style={[styles.quickCircle, { backgroundColor: tint.bg }]}>
      {icon}
    </View>
    <Text style={[styles.quickLabel, { color: tint.fg }]}>{label}</Text>
  </Pressable>
);

/** Rounded status pill with a filled tone icon, e.g. ✓ Active. */
export const StatusPill: React.FC<{ pill: ContactPill }> = ({ pill }) => {
  const { bg, fg } = TONE_COLOURS[pill.tone];
  const ToneIcon = TONE_ICON[pill.tone];
  return (
    <View style={[styles.statusPill, { backgroundColor: bg }]}>
      <ToneIcon size={16} color={Colors.white} fill={fg} strokeWidth={2.2} />
      <Text style={[styles.statusPillText, { color: fg }]}>{pill.label}</Text>
    </View>
  );
};

/** Small text-only pill after a value, e.g. 'Primary'. */
export const TagPill: React.FC<{ pill: ContactPill }> = ({ pill }) => {
  const { bg, fg } = TONE_COLOURS[pill.tone];
  return (
    <View style={[styles.tagPill, { backgroundColor: bg }]}>
      <Text style={[styles.tagPillText, { color: fg }]}>{pill.label}</Text>
    </View>
  );
};

/** WhatsApp brand glyph (lucide has no brand icons). */
export const WhatsAppIcon: React.FC<{ size: number; color: string }> = ({
  size,
  color,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      fill={color}
      d="M20.52 3.48A11.9 11.9 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.62A11.94 11.94 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.19-1.25-6.19-3.48-8.52ZM12 21.82a9.83 9.83 0 0 1-5.02-1.37l-.36-.21-3.68.96.98-3.58-.24-.37A9.83 9.83 0 1 1 21.82 12 9.83 9.83 0 0 1 12 21.82Zm5.4-7.36c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15s-.77.96-.94 1.16c-.17.2-.35.22-.65.08-.3-.15-1.25-.46-2.38-1.47a8.9 8.9 0 0 1-1.65-2.05c-.17-.3 0-.45.13-.6.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.91-2.2-.24-.58-.49-.5-.67-.5H8c-.2 0-.52.07-.8.37-.28.3-1.05 1.02-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.13 3.26 5.16 4.57.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z"
    />
  </Svg>
);

/* ------------------------------------------------------------------ */
/* Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  closeBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CLOSE_BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    ...Shadows.xs,
  },
  closePressed: { transform: [{ scale: 0.94 }], opacity: 0.9 },
  pressed: { opacity: 0.85 },

  cancelBtn: {
    alignSelf: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  cancelText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '700',
  },

  /* Quick actions */
  quickRowPlain: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  quickRowCard: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  quickPlain: { alignItems: 'center', gap: 8 },
  quickCard: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickPressed: { transform: [{ scale: 0.96 }] },
  quickDisabled: { opacity: 0.4 },
  quickCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { ...Typography.caption, fontWeight: '700', fontSize: 12 },

  /* Pills */
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 1,
    borderRadius: Radius.pill,
  },
  statusPillText: { ...Typography.body, fontWeight: '600' },
  tagPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  tagPillText: { ...Typography.bodySmall, fontWeight: '600' },
});
