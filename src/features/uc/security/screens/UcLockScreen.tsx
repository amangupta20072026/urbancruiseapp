/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * UcLockScreen — unlock needed while the app is already open
 * ------------------------------------------------------------------
 * RootNavigator shows this when a UC session is locked AFTER onboarding
 * (the server answered `uc_unlock_required`: last unlock older than
 * 24 h). On a fresh open the same sheet opens from Onboarding instead.
 * The sheet can't be closed here: there is nothing behind it.
 * ------------------------------------------------------------------
 */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';

import { SafeScreen } from '@shared/components';
import { Colors, Radius, Spacing, Typography } from '@theme';
import { useAppDispatch } from '@store/hooks';
import { ucSetupRequired } from '@store/slices/appSlice';
import {
  UcUnlockSheet,
  type UcUnlockSheetRef,
} from '../components/UcUnlockSheet';
import { useLocalSignOut } from '../hooks/useLocalSignOut';
import { completeUcUnlock } from '../afterUnlock';

const UcLockScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const signOut = useLocalSignOut();
  const sheetRef = useRef<UcUnlockSheetRef>(null);

  useEffect(() => {
    // After the screen's fade-in, so the sheet animates over it.
    const t = setTimeout(() => sheetRef.current?.present(), 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeScreen edges={['top']}>
      <View style={styles.top}>
        <View style={styles.badge}>
          <Lock size={30} color={Colors.primaryDark} strokeWidth={2} />
        </View>
        <Text style={styles.title}>Urban Cruise is locked</Text>
        <Text style={styles.sub}>Unlock to continue.</Text>
      </View>
      <UcUnlockSheet
        ref={sheetRef}
        dismissible={false}
        onUnlocked={() => completeUcUnlock(dispatch)}
        onSetupRequired={() => dispatch(ucSetupRequired())}
        onSignedOut={message => void signOut(message)}
      />
    </SafeScreen>
  );
};

export default UcLockScreen;

const styles = StyleSheet.create({
  top: {
    alignItems: 'center',
    paddingTop: Spacing.sectionXLarge,
    paddingHorizontal: Spacing.xxl,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: { ...Typography.h5, color: Colors.textPrimary, textAlign: 'center' },
  sub: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
