/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * CallerIdSetupSheet — "Know who's calling", shown ONCE per phone
 * ------------------------------------------------------------------
 *   ┌────────────────────────────────────────┐
 *   │ (📞)                                   │
 *   │ Know who's calling                     │
 *   │ See the customer's name, type and city │
 *   │ when they call you.                    │
 *   │ ✓ Works when the app is closed         │
 *   │ ✓ Calls are never blocked              │
 *   │ [        Turn on caller ID        ]    │
 *   │               Not now                  │
 *   └────────────────────────────────────────┘
 *
 * Product decision (23 Nov 2026): shown the first time a UC staff
 * member opens the app after this update, and never again — "Not now"
 * is final; Settings › Caller ID turns it on later. Not shown when
 * caller ID is already on, or on phones that can't use it (iPhone,
 * Android 9 and below).
 *
 * Mounted once by UcNavigator, which renders only after the MPIN /
 * fingerprint unlock, so it never covers the lock screen.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { CircleCheck, PhoneCall } from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';
import { mmkv } from '@services/storage/mmkv';
import { StorageKeys } from '@constants/storageKeys';
import { callerIdNative, isCallerIdSupported } from '@/native/callerId';

import { turnOnCallerId } from '../turnOn';

/** Let the dashboard settle before the sheet slides up. */
const SHOW_DELAY_MS = 1200;

export const CallerIdSetupSheet: React.FC = () => {
  const sheetRef = useRef<BottomSheetModal>(null);
  const isOpenRef = useRef(false);

  useEffect(() => {
    if (!isCallerIdSupported()) return;
    if (mmkv.getBoolean(StorageKeys.ucCallerIdPromptShown)) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    void callerIdNative.getStatus().then(status => {
      if (cancelled || !status.supported) return;
      if (status.roleHeld) {
        // Already on (e.g. turned on from Settings first): never ask.
        mmkv.setBoolean(StorageKeys.ucCallerIdPromptShown, true);
        return;
      }
      timer = setTimeout(() => {
        if (cancelled) return;
        // Recorded when shown, so "Not now", a swipe-down and closing
        // the app all count as the one time.
        mmkv.setBoolean(StorageKeys.ucCallerIdPromptShown, true);
        sheetRef.current?.present();
      }, SHOW_DELAY_MS);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  /* Hardware back closes the sheet instead of the screen behind it
     (BottomSheetModalProvider sits above NavigationContainer). */
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (!isOpenRef.current) return false;
        sheetRef.current?.dismiss();
        return true;
      },
    );
    return () => subscription.remove();
  }, []);

  const handleChange = useCallback((index: number) => {
    isOpenRef.current = index >= 0;
  }, []);

  const handleTurnOn = useCallback(() => {
    sheetRef.current?.dismiss();
    void turnOnCallerId();
  }, []);

  const handleNotNow = useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.55}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.sheetBg}
      enablePanDownToClose
      onChange={handleChange}
    >
      <BottomSheetView style={styles.content}>
        <View style={styles.iconTile}>
          <PhoneCall size={22} color={Colors.primaryDark} strokeWidth={2.25} />
        </View>

        <Text style={styles.title}>Know who's calling</Text>
        <Text style={styles.subtitle}>
          See the customer's name, type and city when they call you.
        </Text>

        <View style={styles.points}>
          <Point text="Works when the app is closed" />
          <Point text="Calls are never blocked" />
        </View>

        <Pressable
          onPress={handleTurnOn}
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Turn on caller ID"
        >
          <Text style={styles.primaryBtnText}>Turn on caller ID</Text>
        </Pressable>

        <Pressable
          onPress={handleNotNow}
          style={({ pressed }) => [
            styles.secondaryBtn,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Not now"
        >
          <Text style={styles.secondaryBtnText}>Not now</Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

const Point: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.point}>
    <CircleCheck size={16} color={Colors.success} strokeWidth={2.25} />
    <Text style={styles.pointText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  handle: {
    backgroundColor: Colors.border,
    width: 44,
  },
  sheetBg: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.title,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  points: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  point: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pointText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  primaryBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.buttonPrimary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    ...Typography.button,
    color: Colors.buttonPrimaryText,
  },
  secondaryBtn: {
    marginTop: Spacing.xs,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  secondaryBtnText: {
    ...Typography.button,
    color: Colors.textSecondary,
  },
  pressed: { opacity: 0.7 },
});
