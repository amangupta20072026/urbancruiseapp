/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * UcUnlockSheet — fingerprint / MPIN unlock (UC staff only)
 * ------------------------------------------------------------------
 * Opened from Onboarding's "Get Started" on a fresh app open, and by
 * UcLockScreen when the server asks for an unlock (24 h rule).
 *
 * On open it asks the server what this phone has set up, then:
 *   - fingerprint on (server) + key on phone + Android → fingerprint
 *     view; the phone's popup opens automatically. "Use MPIN instead".
 *   - otherwise → MPIN view (fingerprint key on the pad if available).
 *   - phone not registered → MPIN setup (if still allowed) or log in
 *     again with OTP.
 * After an MPIN unlock, fingerprint is turned on automatically if it is
 * off and the user hasn't switched it off in Settings.
 *
 * 5 wrong MPINs: the server removes this phone's MPIN + keys and ends
 * the session → "locked" view → log in with OTP.
 * ------------------------------------------------------------------
 */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { FingerprintPattern, Lock } from 'lucide-react-native';

import { Colors, Dimensions, Radius, Spacing, Typography } from '@theme';
import {
  attemptsLeft,
  autoEnableBiometric,
  fetchSecurityStatus,
  hasBiometricKey,
  isBiometricSupported,
  isSessionEndingError,
  ucErrorCode,
  ucErrorMessage,
  UC_ERROR,
  unlockWithBiometric,
  unlockWithMpin,
  type UcSecurityStatus,
} from '@services/ucSecurity';
import { PinBoxes } from './PinBoxes';
import { PinPad } from './PinPad';
import { usePinInput } from '../hooks/usePinInput';

export type UcUnlockSheetRef = { present: () => void; dismiss: () => void };

type Props = {
  /** Unlocked: fresh tokens are already saved. */
  onUnlocked: () => void;
  /** This phone has no MPIN yet but setup is still allowed. */
  onSetupRequired: () => void;
  /**
   * The session is over (lockout, Forgot MPIN, phone no longer
   * registered). The parent runs the local logout. `message` is shown
   * as a toast when not null.
   */
  onSignedOut: (message: string | null) => void;
  /** False on UcLockScreen: there is nothing behind the sheet. */
  dismissible?: boolean;
};

type Phase =
  | { kind: 'loading' }
  | { kind: 'loadError'; message: string }
  | { kind: 'biometric'; busy: boolean; note: string | null }
  | { kind: 'mpin'; busy: boolean; error: string | null }
  | { kind: 'locked' }
  | { kind: 'forgot' };

export const UcUnlockSheet = forwardRef<UcUnlockSheetRef, Props>(
  ({ onUnlocked, onSetupRequired, onSignedOut, dismissible = true }, ref) => {
    const insets = useSafeAreaInsets();
    const sheetRef = useRef<BottomSheetModal>(null);
    const isOpenRef = useRef(false);
    const statusRef = useRef<UcSecurityStatus | null>(null);
    const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
    const [canUseBiometric, setCanUseBiometric] = useState(false);
    const [shakeKey, setShakeKey] = useState(0);

    const busy =
      (phase.kind === 'mpin' || phase.kind === 'biometric') && phase.busy;
    const blocking = !dismissible || busy || phase.kind === 'locked';

    /* ---------- outcomes ---------- */

    const finishUnlocked = useCallback(() => {
      sheetRef.current?.dismiss();
      onUnlocked();
    }, [onUnlocked]);

    const handleSessionEnd = useCallback(
      (err: unknown) => {
        if (ucErrorCode(err) === UC_ERROR.MPIN_LOCKED) {
          setPhase({ kind: 'locked' });
          return;
        }
        sheetRef.current?.dismiss();
        onSignedOut(ucErrorMessage(err));
      },
      [onSignedOut],
    );

    /* ---------- fingerprint ---------- */

    const runBiometric = useCallback(async () => {
      setPhase({ kind: 'biometric', busy: true, note: null });
      try {
        const result = await unlockWithBiometric();
        if (result.ok) {
          finishUnlocked();
          return;
        }
        switch (result.reason) {
          case 'cancelled':
            setPhase({ kind: 'biometric', busy: false, note: null });
            return;
          case 'lockout':
            setPhase({
              kind: 'mpin',
              busy: false,
              error:
                'Fingerprint is blocked for now after too many tries. Use your MPIN.',
            });
            return;
          case 'key_unusable':
            // e.g. a new fingerprint was added on the phone. MPIN now;
            // fingerprint is set up again after the MPIN unlock.
            setCanUseBiometric(false);
            setPhase({
              kind: 'mpin',
              busy: false,
              error:
                'Fingerprint changed on this phone. Use your MPIN once to set it up again.',
            });
            return;
          default:
            setPhase({
              kind: 'biometric',
              busy: false,
              note: 'Fingerprint did not work. Try again or use your MPIN.',
            });
        }
      } catch (err) {
        if (isSessionEndingError(err)) {
          handleSessionEnd(err);
          return;
        }
        if (ucErrorCode(err) === UC_ERROR.BIOMETRIC_NOT_ENABLED) {
          setCanUseBiometric(false);
          setPhase({ kind: 'mpin', busy: false, error: null });
          return;
        }
        setPhase({ kind: 'biometric', busy: false, note: ucErrorMessage(err) });
      }
    }, [finishUnlocked, handleSessionEnd]);

    /* ---------- MPIN ---------- */

    const pinInput = usePinInput(
      useCallback(
        async (mpin: string) => {
          setPhase({ kind: 'mpin', busy: true, error: null });
          try {
            await unlockWithMpin(mpin);
          } catch (err) {
            pinInput.clear();
            if (isSessionEndingError(err)) {
              handleSessionEnd(err);
              return;
            }
            if (ucErrorCode(err) === UC_ERROR.MPIN_INVALID) {
              setShakeKey(k => k + 1);
              const left = attemptsLeft(err);
              if (left === 0) {
                setPhase({ kind: 'locked' });
                return;
              }
            }
            setPhase({ kind: 'mpin', busy: false, error: ucErrorMessage(err) });
            return;
          }
          // Turn fingerprint on automatically (shows the phone's popup)
          // unless it is already on or the user turned it off.
          await autoEnableBiometric(
            statusRef.current?.biometricEnabled ?? false,
          );
          finishUnlocked();
        },
        // pinInput.clear is stable (useCallback in the hook).
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [finishUnlocked, handleSessionEnd],
      ),
    );

    /* ---------- open ---------- */

    const load = useCallback(async () => {
      pinInput.clear();
      setPhase({ kind: 'loading' });
      let status: UcSecurityStatus;
      try {
        status = await fetchSecurityStatus();
      } catch (err) {
        if (isSessionEndingError(err)) {
          handleSessionEnd(err);
          return;
        }
        setPhase({ kind: 'loadError', message: ucErrorMessage(err) });
        return;
      }
      statusRef.current = status;

      if (!status.deviceRegistered) {
        sheetRef.current?.dismiss();
        if (status.setupAllowed) {
          onSetupRequired();
        } else {
          onSignedOut(
            'Your MPIN is not set up on this phone. Please log in again with OTP.',
          );
        }
        return;
      }

      const [supported, localKey] = await Promise.all([
        isBiometricSupported(),
        hasBiometricKey(),
      ]);
      const biometric = supported && localKey && status.biometricEnabled;
      setCanUseBiometric(biometric);
      if (biometric) {
        // Opens the phone's fingerprint popup straight away.
        void runBiometric();
      } else {
        setPhase({ kind: 'mpin', busy: false, error: null });
      }
      // pinInput.clear is stable.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [handleSessionEnd, onSetupRequired, onSignedOut, runBiometric]);

    useImperativeHandle(
      ref,
      () => ({
        present: () => {
          sheetRef.current?.present();
          void load();
        },
        dismiss: () => sheetRef.current?.dismiss(),
      }),
      [load],
    );

    /* ---------- Android back ---------- */
    useEffect(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!isOpenRef.current) return false;
        if (!blocking) sheetRef.current?.dismiss();
        return true;
      });
      return () => sub.remove();
    }, [blocking]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.5}
          pressBehavior={blocking ? 'none' : 'close'}
        />
      ),
      [blocking],
    );

    /* ---------- render ---------- */

    const renderBody = () => {
      switch (phase.kind) {
        case 'loading':
          return (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          );

        case 'loadError':
          return (
            <View>
              <Text style={styles.title}>Couldn't load</Text>
              <Text style={styles.sub}>{phase.message}</Text>
              <PrimaryButton label="Try again" onPress={() => void load()} />
            </View>
          );

        case 'biometric':
          return (
            <View>
              <Brand />
              <Text style={styles.title}>Unlock with fingerprint</Text>
              <Text style={styles.sub}>
                Touch the fingerprint sensor on your phone.
              </Text>
              <Pressable
                onPress={() => void runBiometric()}
                disabled={phase.busy}
                accessibilityRole="button"
                accessibilityLabel="Use fingerprint"
                style={styles.fpBig}
              >
                {phase.busy ? (
                  <ActivityIndicator color={Colors.primaryDark} />
                ) : (
                  <FingerprintPattern
                    size={44}
                    color={Colors.primaryDark}
                    strokeWidth={1.8}
                  />
                )}
              </Pressable>
              {phase.note ? (
                <Text style={styles.errorText}>{phase.note}</Text>
              ) : null}
              <SecondaryButton
                label="Use MPIN instead"
                disabled={phase.busy}
                onPress={() =>
                  setPhase({ kind: 'mpin', busy: false, error: null })
                }
              />
            </View>
          );

        case 'mpin':
          return (
            <View>
              <Text style={styles.title}>Enter your MPIN</Text>
              <Text style={styles.sub}>To open Urban Cruise</Text>
              <PinBoxes
                filled={pinInput.pin.length}
                error={!!phase.error}
                shakeKey={shakeKey}
              />
              <View style={styles.statusLine}>
                {phase.busy ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : phase.error ? (
                  <Text style={styles.errorText}>{phase.error}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => setPhase({ kind: 'forgot' })}
                disabled={phase.busy}
                accessibilityRole="button"
                style={styles.linkBtn}
              >
                <Text style={styles.linkText}>Forgot MPIN?</Text>
              </Pressable>
              <PinPad
                onDigit={d => {
                  if (phase.error)
                    setPhase({ kind: 'mpin', busy: false, error: null });
                  pinInput.addDigit(d);
                }}
                onDelete={pinInput.removeDigit}
                onBiometric={
                  canUseBiometric ? () => void runBiometric() : undefined
                }
                disabled={phase.busy}
              />
            </View>
          );

        case 'locked':
          return (
            <View>
              <View style={[styles.badge, styles.badgeError]}>
                <Lock size={30} color={Colors.error} strokeWidth={2} />
              </View>
              <Text style={styles.title}>MPIN locked on this phone</Text>
              <Text style={styles.sub}>
                Too many wrong attempts. Log in again with OTP and set a new
                MPIN.
              </Text>
              <PrimaryButton
                label="Log in with OTP"
                onPress={() => {
                  sheetRef.current?.dismiss();
                  onSignedOut(null);
                }}
              />
            </View>
          );

        case 'forgot':
          return (
            <View>
              <Text style={styles.title}>Forgot your MPIN?</Text>
              <Text style={styles.sub}>
                You'll log out and log in again with OTP, then set a new MPIN.
                Fingerprint will be set up again too.
              </Text>
              <PrimaryButton
                label="Log in with OTP"
                onPress={() => {
                  sheetRef.current?.dismiss();
                  onSignedOut(null);
                }}
              />
              <View style={styles.gap} />
              <SecondaryButton
                label="Cancel"
                onPress={() =>
                  setPhase({ kind: 'mpin', busy: false, error: null })
                }
              />
            </View>
          );
      }
    };

    return (
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        enablePanDownToClose={!blocking}
        onChange={index => {
          isOpenRef.current = index >= 0;
        }}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.background}
      >
        <BottomSheetView
          style={[
            styles.container,
            { paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.md },
          ]}
        >
          {renderBody()}
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);
UcUnlockSheet.displayName = 'UcUnlockSheet';

/* ---------------- small pieces ---------------- */

/**
 * Urban Cruise logo (same asset as AppHeader), centred, no extra text.
 *
 * `ucwithtext.png` is a 1280×1126 canvas; the visible logo is rows
 * 350–959 only (transparent bands above and below are baked into the
 * file). So the image is drawn at full canvas size inside a clip box
 * and shifted up to hide the top band — the same method AppHeader uses.
 * Keep these three numbers in sync if LOGO_W changes:
 *   LOGO_IMG_H  = LOGO_W × 1126 / 1280
 *   LOGO_TRIM   = LOGO_W × 350 / 1280   (rounded)
 *   LOGO_H      = LOGO_W × 609 / 1280   (rounded; visible logo height)
 */
const LOGO_W = 120;
const LOGO_IMG_H = 106; // 120 × 1126 / 1280 = 105.6
const LOGO_TRIM = 33; // 120 × 350 / 1280 = 32.8
const LOGO_H = 57; // 120 × 609 / 1280 = 57.1

const Brand: React.FC = () => (
  <View style={styles.logoClip}>
    <Image
      source={require('@assets/icons/ucwithtext.png')}
      style={styles.logoImage}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Urban Cruise"
    />
  </View>
);

export const PrimaryButton: React.FC<{
  label: string;
  onPress: () => void;
  disabled?: boolean;
}> = ({ label, onPress, disabled = false }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityState={{ disabled }}
    style={({ pressed }) => [
      styles.primaryBtn,
      disabled && styles.btnDisabled,
      pressed && styles.pressed,
    ]}
  >
    <Text style={styles.primaryBtnText}>{label}</Text>
  </Pressable>
);

export const SecondaryButton: React.FC<{
  label: string;
  onPress: () => void;
  disabled?: boolean;
}> = ({ label, onPress, disabled = false }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityState={{ disabled }}
    style={({ pressed }) => [
      styles.secondaryBtn,
      disabled && styles.btnDisabled,
      pressed && styles.pressed,
    ]}
  >
    <Text style={styles.secondaryBtnText}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  background: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
  },
  handle: { backgroundColor: Colors.border, width: 40 },
  container: {
    paddingHorizontal: Dimensions.screenHorizontalPadding,
    paddingTop: Spacing.sm,
  },
  center: { paddingVertical: Spacing.huge, alignItems: 'center' },
  title: {
    ...Typography.h5,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  sub: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  statusLine: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
    fontWeight: '600',
    textAlign: 'center',
  },
  linkBtn: {
    alignSelf: 'center',
    padding: Spacing.sm,
    minHeight: Dimensions.touchTargetMinimum,
    justifyContent: 'center',
  },
  linkText: {
    ...Typography.body,
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  fpBig: {
    width: 88,
    height: 88,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  badgeError: { backgroundColor: Colors.errorTint },
  logoClip: {
    width: LOGO_W,
    height: LOGO_H,
    overflow: 'hidden',
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  logoImage: {
    width: LOGO_W,
    height: LOGO_IMG_H,
    marginTop: -LOGO_TRIM,
  },
  primaryBtn: {
    height: Dimensions.buttonHeightLarge,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  primaryBtnText: {
    ...Typography.button,
    color: Colors.buttonPrimaryText,
    fontWeight: '700',
  },
  secondaryBtn: {
    height: Dimensions.buttonHeightLarge,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  secondaryBtnText: {
    ...Typography.button,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  btnDisabled: { opacity: 0.5 },
  pressed: { opacity: 0.9 },
  gap: { height: Spacing.xs },
});
