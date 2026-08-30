/**
 * ------------------------------------------------------------------
 * SettingsScreen — SHARED, STACK SCREEN
 * ------------------------------------------------------------------
 * Cross-role placeholder for app-level settings (theme, language,
 * notification preferences, etc.) reached from every role's More
 * sheet.
 *
 * REGISTRATION:
 *   Mounted by EACH role's navigator (UcNavigator, VendorNavigator,
 *   ...). Route name "Settings" must be present in each role's stack
 *   ParamList so `navigate('Settings')` from useMoreActions.ts
 *   resolves in every role context.
 *
 * WHY IT LIVES IN /shared/:
 *   Settings are app-wide and identical across roles. When a
 *   role-specific setting is required later, branch inside this file
 *   rather than forking per-role copies.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Settings } from 'lucide-react-native';

import { SafeScreen, ScreenHeader, ComingSoon } from '@shared/components';
import { Spacing } from '@theme';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  return (
    <SafeScreen edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader title="Settings" onBack={() => navigation.goBack()} />
      </View>
      <ComingSoon feature="Settings" Icon={Settings} />
    </SafeScreen>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
});