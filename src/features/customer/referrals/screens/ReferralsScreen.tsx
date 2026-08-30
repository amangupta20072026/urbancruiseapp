/**
 * ------------------------------------------------------------------
 * ReferralsScreen (Customer) — STACK SCREEN
 * ------------------------------------------------------------------
 * Pushed from the Customer More sheet ("Referral & Rewards" tile).
 * Placeholder until the real referrals + rewards UI (invite link,
 * share sheet, earned rewards, redemption) ships.
 *
 * REGISTRATION:
 *   Mounted by CustomerNavigator under the route name "Referrals".
 *   Route declared in CustomerStackParamList so the
 *   `navigate('Referrals')` call in useMoreActions.ts type-checks.
 *
 * WHY IT LIVES IN /customer/:
 *   Referrals & rewards are a Customer-only surface (vendor/driver/uc
 *   don't have this tile). Kept role-scoped instead of shared.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Gift } from 'lucide-react-native';

import { SafeScreen, ScreenHeader, ComingSoon } from '@shared/components';
import { Spacing } from '@theme';

const ReferralsScreen: React.FC = () => {
  const navigation = useNavigation();
  return (
    <SafeScreen edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Referral & Rewards"
          subtitle="Invite friends and earn rewards on every trip."
          onBack={() => navigation.goBack()}
        />
      </View>
      <ComingSoon feature="Referral & Rewards" Icon={Gift} />
    </SafeScreen>
  );
};

export default ReferralsScreen;

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
});
