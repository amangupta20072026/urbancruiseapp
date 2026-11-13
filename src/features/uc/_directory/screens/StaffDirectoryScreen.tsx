/**
 * ------------------------------------------------------------------
 * StaffDirectoryScreen — Directory for the 'general' workspace
 * ------------------------------------------------------------------
 * The UC staff list ONLY. Finance, IT, HR, Digital Marketing and
 * anyone with no department set look up colleagues; they do not see
 * customers, vendors or drivers.
 *
 * WHY A SEPARATE SCREEN, not DirectoryScreen with three tabs hidden:
 *   A single-tab top-tab navigator is a bar the user cannot use. This
 *   drops the bar entirely, so the list starts right under the header.
 *
 * THIS IS NOT THE SECURITY BOUNDARY. The app only decides what to
 * draw. The backend refuses /uc/customers, /uc/vendors and
 * /uc/drivers for this workspace in its own right — see
 * src/modules/uc/requireFullDirectory.ts. Removing this screen would
 * not grant anyone access to that data.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { Spacing } from '@theme';
import StaffTabScreen from '@features/uc/staff/screens/StaffTabScreen';

import { DIRECTORY_TAB_LABEL } from '../types';

const StaffDirectoryScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <SafeScreen edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title={DIRECTORY_TAB_LABEL.staff}
          subtitle="Find a colleague's office number, email and branch."
          onBack={() => navigation.goBack()}
        />
      </View>

      <StaffTabScreen />
    </SafeScreen>
  );
};

export default StaffDirectoryScreen;

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
});
