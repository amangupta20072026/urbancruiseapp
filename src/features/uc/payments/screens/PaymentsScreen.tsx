/**
 * ------------------------------------------------------------------
 * PaymentsScreen (UC) — STACK SCREEN
 * ------------------------------------------------------------------
 * Pushed from the UC More sheet. Placeholder until the finance
 * console (payins, payouts, reconciliation) ships.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Wallet } from 'lucide-react-native';

import { SafeScreen, ScreenHeader, ComingSoon } from '@shared/components';
import { Spacing } from '@theme';

const PaymentsScreen: React.FC = () => {
  const navigation = useNavigation();
  return (
    <SafeScreen edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Payments"
          subtitle="Payins, payouts, and reconciliation."
          onBack={() => navigation.goBack()}
        />
      </View>
      <ComingSoon feature="Payments" Icon={Wallet} />
    </SafeScreen>
  );
};

export default PaymentsScreen;

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
});