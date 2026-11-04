/**
 * Asks for the MPIN before turning fingerprint off (product decision).
 * The MPIN is checked by the server (an MPIN unlock): a wrong one uses
 * one of the 5 attempts, exactly like unlocking.
 */
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Colors, Dimensions, Radius, Spacing, Typography } from '@theme';
import {
  isSessionEndingError,
  ucErrorCode,
  ucErrorMessage,
  UC_ERROR,
  verifyMpin,
} from '@services/ucSecurity';
import { PinBoxes } from './PinBoxes';
import { PinPad } from './PinPad';
import { usePinInput } from '../hooks/usePinInput';

export type MpinConfirmSheetRef = { present: () => void; dismiss: () => void };

type Props = {
  title: string;
  subtitle: string;
  /** Called after the server accepted the MPIN. */
  onConfirmed: () => Promise<void>;
  /** Session over (e.g. 5th wrong MPIN). */
  onSignedOut: (message: string | null) => void;
};

export const MpinConfirmSheet = forwardRef<MpinConfirmSheetRef, Props>(
  ({ title, subtitle, onConfirmed, onSignedOut }, ref) => {
    const insets = useSafeAreaInsets();
    const sheetRef = useRef<BottomSheetModal>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [shakeKey, setShakeKey] = useState(0);

    const input = usePinInput(
      useCallback(
        async (mpin: string) => {
          setBusy(true);
          try {
            await verifyMpin(mpin);
            await onConfirmed();
            setBusy(false);
            sheetRef.current?.dismiss();
          } catch (err) {
            setBusy(false);
            input.clear();
            if (isSessionEndingError(err)) {
              sheetRef.current?.dismiss();
              onSignedOut(ucErrorMessage(err));
              return;
            }
            if (ucErrorCode(err) === UC_ERROR.MPIN_INVALID)
              setShakeKey(k => k + 1);
            setError(ucErrorMessage(err));
          }
        },
        // input.clear is stable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [onConfirmed, onSignedOut],
      ),
    );

    useImperativeHandle(
      ref,
      () => ({
        present: () => {
          input.clear();
          setError(null);
          setBusy(false);
          sheetRef.current?.present();
        },
        dismiss: () => sheetRef.current?.dismiss(),
      }),
      // input.clear is stable.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.5}
          pressBehavior={busy ? 'none' : 'close'}
        />
      ),
      [busy],
    );

    return (
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        enablePanDownToClose={!busy}
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
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>{subtitle}</Text>
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
          <PinPad
            onDigit={d => {
              if (error) setError(null);
              input.addDigit(d);
            }}
            onDelete={input.removeDigit}
            disabled={busy}
          />
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);
MpinConfirmSheet.displayName = 'MpinConfirmSheet';

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
