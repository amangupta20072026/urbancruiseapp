/**
 * ------------------------------------------------------------------
 * RequestSuccessModal — reusable centered success modal
 * ------------------------------------------------------------------
 * A native RN `<Modal>` (not a bottom sheet) rendered as a centered
 * card over a dimmed backdrop. Used after a customer submits a
 * request that will be handled asynchronously — a change request
 * on a quotation, a booking request, etc — to confirm the request
 * landed and offer the two natural next-step destinations.
 *
 * LAYOUT (top → bottom, inside the card):
 *
 *   ┌─────────────────────────────────  X (close) ┐
 *
 *             ✦   [ ✓ green circle ]   ✦
 *                 ✦             ✦
 *
 *                Request Sent Successfully!
 *
 *          Your request has been sent. Our executive
 *          will contact you shortly to confirm
 *          availability and next steps.
 *
 *         [        Go to Bookings          ]  (primary)
 *                    Back to Home             (secondary link)
 *
 * ------------------------------------------------------------------
 * DESIGN NOTES
 * ------------------------------------------------------------------
 *   - Uses RN's built-in `<Modal>` because the surface needs to sit
 *     ABOVE any bottom sheet that may still be visible under it.
 *     RN `<Modal>` mounts its own native window; @gorhom/bottom-sheet
 *     doesn't share that layer, so a RN Modal reliably wins.
 *
 *   - Backdrop press = close (calls `onClose`). Hardware back on
 *     Android is handled by `onRequestClose` — same effect.
 *
 *   - The four small green "sparkles" around the check are pure
 *     decoration (positioned dots), not real icons, so they stay
 *     crisp at any DPI and add no icon-font weight.
 *
 *   - Every string except title/message is renamed via props so the
 *     modal can be reused across contexts. Defaults match the
 *     "Request Changes" flow because that's the first caller.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, X } from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';

type Props = {
  visible: boolean;
  /** Big centered header. Defaults to "Request Sent Successfully!". */
  title?: string;
  /** Muted paragraph under the title. Two to three short lines. */
  message?: string;
  /** Green primary button label. Defaults to "Go to Bookings". */
  primaryLabel?: string;
  onPrimary?: () => void;
  /** Text-link secondary label. Defaults to "Back to Home". */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** X-close and backdrop tap. Also fires when Android back is used. */
  onClose: () => void;
};

const DEFAULT_TITLE = 'Request Sent Successfully!';
const DEFAULT_MESSAGE =
  'Your request has been sent. Our executive will contact you shortly to confirm availability and next steps.';

export const RequestSuccessModal: React.FC<Props> = ({
  visible,
  title = DEFAULT_TITLE,
  message = DEFAULT_MESSAGE,
  primaryLabel = 'Go to Bookings',
  onPrimary,
  secondaryLabel = 'Back to Home',
  onSecondary,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop — tap-to-dismiss so users can always escape */}
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel="Dismiss success dialog"
        accessibilityRole="button"
      >
        {/* Card wrapper — inner Pressable stops backdrop tap from
            firing when the user taps inside the card. */}
        <Pressable style={styles.cardWrap} onPress={() => {}}>
          <View style={styles.card}>
            {/* Close (top-right) */}
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && styles.pressed,
              ]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={22} color={Colors.textPrimary} strokeWidth={2.25} />
            </Pressable>

            {/* Success icon with decorative sparkles */}
            <View style={styles.iconStage}>
              <View style={[styles.sparkle, styles.sparkleTL]} />
              <View style={[styles.sparkle, styles.sparkleTR]} />
              <View style={[styles.sparkle, styles.sparkleBL]} />
              <View style={[styles.sparkle, styles.sparkleBR]} />
              <View style={styles.iconRing}>
                <View style={styles.iconCircle}>
                  <Check size={38} color={Colors.primary} strokeWidth={3} />
                </View>
              </View>
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            <Pressable
              onPress={onPrimary}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={primaryLabel}
            >
              <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
            </Pressable>

            <Pressable
              onPress={onSecondary}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={secondaryLabel}
            >
              <Text style={styles.secondaryBtnText}>{secondaryLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 380,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    ...Shadows.xs,
  },

  /* Close */
  closeBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 32,
    height: 32,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },

  /* Icon stage — the check inside a light-green ring, with four
     small green dots positioned diagonally as decorative sparkles. */
  iconStage: {
    marginTop: Spacing.lg,
    width: 140,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: Radius.circle,
    backgroundColor: Colors.surface,
    borderWidth: 3,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primary,
    opacity: 0.55,
  },
  sparkleTL: { top: 8, left: 8 },
  sparkleTR: { top: 12, right: 10 },
  sparkleBL: { bottom: 10, left: 14 },
  sparkleBR: { bottom: 6, right: 6 },

  /* Text */
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  message: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: Spacing.sm,
  },

  /* Buttons */
  primaryBtn: {
    marginTop: Spacing.lg,
    alignSelf: 'stretch',
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.xs,
  },
  primaryBtnText: {
    ...Typography.body,
    color: Colors.textOnPrimary,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    marginTop: Spacing.sm,
    alignSelf: 'stretch',
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '800',
  },

  pressed: {
    opacity: 0.85,
  },
});
