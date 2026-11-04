/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * UcSetupMpinScreen — first login on a phone (UC staff only)
 * ------------------------------------------------------------------
 * Shown by RootNavigator when ucGate === 'setup' (right after an OTP
 * login). Steps: create MPIN → confirm → server registers this phone →
 * if the phone has a strong fingerprint, the phone's fingerprint popup
 * opens by itself (no "Do you want…" question; product decision). If
 * the user cancels it, the next app open asks again.
 *
 * The server allows this only within 10 minutes of the OTP login.
 * ------------------------------------------------------------------
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Check, ChevronLeft, Lock } from 'lucide-react-native';

import { SafeScreen } from '@shared/components';
import { Colors, Dimensions, Radius, Spacing, Typography } from '@theme';
import { useAppDispatch } from '@store/hooks';
import {
  autoEnableBiometric,
  isSessionEndingError,
  mpinWeakness,
  registerDevice,
  ucErrorCode,
  ucErrorMessage,
  UC_ERROR,
  WEAK_MPIN_MESSAGE,
} from '@services/ucSecurity';
import { PinBoxes } from '../components/PinBoxes';
import { PinPad } from '../components/PinPad';
import { usePinInput } from '../hooks/usePinInput';
import { useLocalSignOut } from '../hooks/useLocalSignOut';
import { completeUcUnlock } from '../afterUnlock';

type Step = 'create' | 'confirm' | 'saving' | 'done';

const UcSetupMpinScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const signOut = useLocalSignOut();
  const [step, setStep] = useState<Step>('create');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  const fail = useCallback((message: string) => {
    setError(message);
    setShakeKey(k => k + 1);
  }, []);

  const save = useCallback(
    async (mpin: string) => {
      setStep('saving');
      try {
        await registerDevice(mpin);
      } catch (err) {
        if (isSessionEndingError(err)) {
          await signOut(ucErrorMessage(err));
          return;
        }
        if (ucErrorCode(err) === UC_ERROR.MPIN_WEAK) {
          setFirstPin('');
          setStep('create');
        } else {
          setStep('confirm');
        }
        fail(ucErrorMessage(err));
        return;
      }
      setStep('done');
      // Opens the phone's fingerprint popup when supported. Any result
      // is fine: 'cancelled' → asked again on the next app open.
      await autoEnableBiometric(false);
      completeUcUnlock(dispatch);
    },
    [dispatch, fail, signOut],
  );

  const input = usePinInput(
    useCallback(
      (pin: string) => {
        if (step === 'create') {
          if (mpinWeakness(pin)) {
            input.clear();
            fail(WEAK_MPIN_MESSAGE);
            return;
          }
          setFirstPin(pin);
          input.clear();
          setError(null);
          setStep('confirm');
          return;
        }
        if (step === 'confirm') {
          input.clear();
          if (pin !== firstPin) {
            fail("MPINs don't match. Try again.");
            return;
          }
          setError(null);
          void save(pin);
        }
      },
      // input.clear is stable.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [step, firstPin, fail, save],
    ),
  );

  if (step === 'saving' || step === 'done') {
    return (
      <SafeScreen edges={['top', 'bottom']}>
        <View style={styles.centerFill}>
          <View style={styles.badge}>
            {step === 'done' ? (
              <Check size={30} color={Colors.primaryDark} strokeWidth={2.4} />
            ) : (
              <ActivityIndicator color={Colors.primaryDark} />
            )}
          </View>
          <Text style={styles.title}>
            {step === 'done' ? 'MPIN set' : 'Saving your MPIN…'}
          </Text>
        </View>
      </SafeScreen>
    );
  }

  const isConfirm = step === 'confirm';

  return (
    <SafeScreen edges={['top', 'bottom']}>
      <View style={styles.screen}>
        <View style={styles.topBar}>
          {isConfirm ? (
            <Pressable
              onPress={() => {
                input.clear();
                setFirstPin('');
                setError(null);
                setStep('create');
              }}
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={8}
              style={styles.backBtn}
            >
              <ChevronLeft size={22} color={Colors.textPrimary} />
            </Pressable>
          ) : null}
          <Text style={styles.topTitle}>Set up MPIN</Text>
        </View>

        <View style={styles.badge}>
          <Lock size={30} color={Colors.primaryDark} strokeWidth={2} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {isConfirm ? 'Re-enter your MPIN' : 'Create your 4-digit MPIN'}
        </Text>
        <Text style={styles.sub}>
          {isConfirm
            ? 'Enter the same 4 digits again to confirm.'
            : "You'll use it to open Urban Cruise on this phone."}
        </Text>

        <PinBoxes
          filled={input.pin.length}
          error={!!error}
          shakeKey={shakeKey}
        />
        <Text style={[styles.hint, error ? styles.hintError : null]}>
          {error ?? (isConfirm ? ' ' : 'Avoid easy MPINs like 1234 or 1111.')}
        </Text>

        <View style={styles.flex} />
        <PinPad
          onDigit={d => {
            if (error) setError(null);
            input.addDigit(d);
          }}
          onDelete={input.removeDigit}
        />
      </View>
    </SafeScreen>
  );
};

export default UcSetupMpinScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: Dimensions.screenHorizontalPadding,
    paddingBottom: Spacing.lg,
  },
  flex: { flex: 1 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: Dimensions.headerHeight,
    marginBottom: Spacing.lg,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.circle,
    backgroundColor: Colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
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
    marginBottom: Spacing.xl,
  },
  hint: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  hintError: { color: Colors.error, fontWeight: '600' },
});
