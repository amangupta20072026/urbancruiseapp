/**
 * ------------------------------------------------------------------
 * WelcomeOverlay — first-time welcome on Customer Home
 * ------------------------------------------------------------------
 * Shown once, right after a NEW customer account is created
 * (appSlice.pendingWelcome, set by useCustomerOnboard only when the
 * server reports isNewAccount). Home renders first; the card and the
 * confetti follow after a short pause so the user sees where they
 * landed.
 *
 * Closes on "Let's go", on Android back, or on a tap outside the
 * card. Closing clears the flag, so it never shows again.
 *
 * Reduce Motion: no confetti and no scale-in; the card fades only.
 * ------------------------------------------------------------------
 */

import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  useReducedMotion,
} from 'react-native-reanimated';
import { PartyPopper } from 'lucide-react-native';

import {
  Colors,
  Dimensions,
  Radius,
  Shadows,
  Spacing,
  Typography,
} from '@theme';
import { ConfettiBurst } from './ConfettiBurst';

/** Pause after Home appears, before the welcome shows. */
const SHOW_DELAY_MS = 450;

type Props = {
  visible: boolean;
  /** Empty while the profile hydrates; the title then omits the name. */
  firstName: string;
  onDismiss: () => void;
};

export const WelcomeOverlay: React.FC<Props> = ({
  visible,
  firstName,
  onDismiss,
}) => {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShown(false);
      return;
    }
    const timer = setTimeout(() => setShown(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible || !shown) return null;

  const title = firstName
    ? `Welcome to Urban Cruise, ${firstName}`
    : 'Welcome to Urban Cruise';

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onDismiss}
    >
      <Animated.View
        entering={FadeIn.duration(250)}
        exiting={FadeOut.duration(200)}
        style={styles.backdrop}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Close welcome"
        />

        <Animated.View
          entering={
            reduceMotion
              ? FadeIn.duration(250)
              : ZoomIn.springify().damping(14).delay(120)
          }
          style={styles.card}
          accessibilityViewIsModal
        >
          <View style={styles.iconCircle}>
            <PartyPopper
              size={42}
              color={Colors.primaryDark}
              strokeWidth={1.75}
            />
          </View>

          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.body}>
            Your account is ready. Request a quotation whenever you{'\u2019'}re
            ready to travel.
          </Text>

          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Let's go"
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <Text style={styles.ctaText}>Let{'\u2019'}s go</Text>
          </Pressable>
        </Animated.View>

        {reduceMotion ? null : <ConfettiBurst />}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Dimensions.screenHorizontalPadding,
    backgroundColor: Colors.overlay,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.xxl,
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryTint,
  },
  title: {
    ...Typography.h4,
    color: Colors.textPrimary,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  body: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  cta: {
    alignSelf: 'stretch',
    height: Dimensions.buttonHeight,
    marginTop: Spacing.xl,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  ctaPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  ctaText: {
    ...Typography.button,
    color: Colors.buttonPrimaryText,
  },
});
