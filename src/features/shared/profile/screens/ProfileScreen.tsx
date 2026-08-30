/**
 * ------------------------------------------------------------------
 * ProfileScreen — SHARED, STACK SCREEN
 * ------------------------------------------------------------------
 * Cross-role placeholder for the "Profile" destination reached from
 * every role's More sheet (customer / vendor / driver / uc). Real
 * profile UI (name, phone, avatar, role-specific fields, edit CTA)
 * will land here later.
 *
 * REGISTRATION:
 *   This component is imported and mounted by EACH role's navigator
 *   (e.g. UcNavigator, VendorNavigator, ...). Route name "Profile"
 *   must be declared in each role's stack ParamList so that
 *   `navigate('Profile')` from useMoreActions.ts resolves regardless
 *   of which role is currently active.
 *
 * WHY IT LIVES IN /shared/:
 *   Role-agnostic surface. The screen renders identically for every
 *   role today; when role-specific variations are needed, prefer
 *   branching inside this file (via `selectUserRole`) over forking
 *   into per-role copies — one file, one swap point.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { User } from 'lucide-react-native';

import { SafeScreen, ScreenHeader, ComingSoon } from '@shared/components';
import { Spacing } from '@theme';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  return (
    <SafeScreen edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader title="Profile" onBack={() => navigation.goBack()} />
      </View>
      <ComingSoon feature="Profile" Icon={User} />
    </SafeScreen>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
});
