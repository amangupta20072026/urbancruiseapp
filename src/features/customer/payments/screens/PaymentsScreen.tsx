/**
 * ------------------------------------------------------------------
 * PaymentsScreen (Customer) — TAB ROOT
 * ------------------------------------------------------------------
 * Landing screen for the Customer "Payments" tab. Currently a
 * ComingSoon placeholder; when the real UI ships (payment history,
 * pending balances, GST invoices), replace the ComingSoon body
 * below. No navigator wiring changes required at that point — this
 * file is the swap point.
 *
 * Tab roots render NO back chevron — the ScreenHeader is used only
 * for the title/subtitle here.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Wallet } from 'lucide-react-native';

import { SafeScreen, ScreenHeader, ComingSoon } from '@shared/components';
import { Spacing } from '@theme';

const PaymentsScreen: React.FC = () => {
  return (
    <SafeScreen edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Payments"
          subtitle="View payment history and pending balances."
        />
      </View>
      <ComingSoon feature="Payments" Icon={Wallet} />
    </SafeScreen>
  );
};

export default PaymentsScreen;

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
});
