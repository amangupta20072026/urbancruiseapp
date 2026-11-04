/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * UcChangeMpinScreen — Settings › Security › Change MPIN (UC only)
 * ------------------------------------------------------------------
 * Steps: current MPIN → new MPIN → confirm. Nothing is sent until the
 * last step. Server rules (service/uc-security.ts changeUcMpin):
 *   - a wrong current MPIN uses the SAME 5 attempts as unlock;
 *     the 5th removes this phone's MPIN + fingerprint and logs out;
 *   - the new MPIN must not be weak and must differ from the current.
 * Fingerprint stays on.
 * ------------------------------------------------------------------
 */
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { Colors, Dimensions, Radius, Spacing, Typography } from '@theme';
import { toast } from '@services/toast';
import {
  changeMpin,
  isSessionEndingError,
  mpinWeakness,
  ucErrorCode,
  ucErrorMessage,
  UC_ERROR,
  WEAK_MPIN_MESSAGE,
} from '@services/ucSecurity';
import { PinBoxes } from '../components/PinBoxes';
import { PinPad } from '../components/PinPad';
import { usePinInput } from '../hooks/usePinInput';
import { useLocalSignOut } from '../hooks/useLocalSignOut';

type Step = 'current' | 'new' | 'confirm';

const TITLES: Record<Step, string> = {
  current: 'Enter current MPIN',
  new: 'Enter new MPIN',
  confirm: 'Confirm new MPIN',
};
const STEP_NUMBER: Record<Step, number> = { current: 1, new: 2, confirm: 3 };

const UcChangeMpinScreen: React.FC = () => {
  const navigation = useNavigation();
  const signOut = useLocalSignOut();
  const [step, setStep] = useState<Step>('current');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const fail = useCallback((message: string) => {
    setError(message);
    setShakeKey(k => k + 1);
  }, []);

  const submit = useCallback(
    async (current: string, next: string) => {
      setBusy(true);
      try {
        await changeMpin(current, next);
      } catch (err) {
        setBusy(false);
        if (isSessionEndingError(err)) {
          await signOut(ucErrorMessage(err));
          return;
        }
        const code = ucErrorCode(err);
        if (code === UC_ERROR.MPIN_INVALID) {
          setCurrentPin('');
          setNewPin('');
          setStep('current');
        } else if (code === UC_ERROR.MPIN_WEAK || code === UC_ERROR.MPIN_SAME) {
          setNewPin('');
          setStep('new');
        }
        fail(ucErrorMessage(err));
        return;
      }
      setBusy(false);
      toast.success('MPIN changed');
      if (navigation.canGoBack()) navigation.goBack();
    },
    [fail, navigation, signOut],
  );

  const input = usePinInput(
    useCallback(
      (pin: string) => {
        input.clear();
        if (step === 'current') {
          setCurrentPin(pin);
          setError(null);
          setStep('new');
          return;
        }
        if (step === 'new') {
          if (pin === currentPin) {
            fail('New MPIN must be different from the current one.');
            return;
          }
          if (mpinWeakness(pin)) {
            fail(WEAK_MPIN_MESSAGE);
            return;
          }
          setNewPin(pin);
          setError(null);
          setStep('confirm');
          return;
        }
        if (pin !== newPin) {
          fail("MPINs don't match. Try again.");
          return;
        }
        setError(null);
        void submit(currentPin, pin);
      },
      // input.clear is stable.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [step, currentPin, newPin, fail, submit],
    ),
  );

  const handleBack = useCallback(() => {
    if (busy) return;
    if (navigation.canGoBack()) navigation.goBack();
  }, [busy, navigation]);

  return (
    <SafeScreen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <ScreenHeader title="Change MPIN" onBack={handleBack} />
      </View>
      <View style={styles.body}>
        <View
          style={styles.steps}
          accessible
          accessibilityLabel={`Step ${STEP_NUMBER[step]} of 3`}
        >
          {(['current', 'new', 'confirm'] as const).map(s => (
            <View
              key={s}
              style={[
                styles.stepBar,
                STEP_NUMBER[s] <= STEP_NUMBER[step] && styles.stepBarOn,
              ]}
            />
          ))}
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {TITLES[step]}
        </Text>
        <Text style={styles.sub}>Step {STEP_NUMBER[step]} of 3</Text>
        <PinBoxes
          filled={input.pin.length}
          error={!!error}
          shakeKey={shakeKey}
        />
        <View style={styles.statusLine}>
          {busy ? (
            <ActivityIndicator color={Colors.primary} />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
        </View>
        <View style={styles.flex} />
        <PinPad
          onDigit={d => {
            if (error) setError(null);
            input.addDigit(d);
          }}
          onDelete={input.removeDigit}
          disabled={busy}
        />
      </View>
    </SafeScreen>
  );
};

export default UcChangeMpinScreen;

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  body: {
    flex: 1,
    paddingHorizontal: Dimensions.screenHorizontalPadding,
    paddingBottom: Spacing.lg,
  },
  flex: { flex: 1 },
  steps: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginVertical: Spacing.lg,
  },
  stepBar: {
    width: 40,
    height: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.border,
  },
  stepBarOn: { backgroundColor: Colors.primary },
  title: { ...Typography.h5, color: Colors.textPrimary, textAlign: 'center' },
  sub: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  statusLine: {
    minHeight: 40,
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
});
