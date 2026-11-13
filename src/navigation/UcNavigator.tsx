// src/navigation/UcNavigator.tsx
/**
 * ------------------------------------------------------------------
 * UcNavigator — see CustomerNavigator for the route policy.
 * ------------------------------------------------------------------
 * Registered screens fall into two buckets:
 *
 *   1. Real feature screens — full UI (UcTabs, CustomersList, …).
 *   2. More-sheet destinations whose body is still the shared
 *      ComingSoon component. They live in `features/uc/<domain>/`
 *      so the file is the swap point when the real screen lands.
 *
 * Features with no screen at all (quotation builder, enquiry
 * detail, trip monitor, …) have no route; the UI that would open
 * them shows a "Coming soon" toast via `@services/comingSoon`.
 *
 * ------------------------------------------------------------------
 * TWO WORKSPACES, TWO TAB BARS
 * ------------------------------------------------------------------
 * `GET /api/v1/uc/workspace` tells the app which dashboard this
 * staff member gets. The business workspaces (admin / sales /
 * telesales / ops) keep UcTabs — Quotations, Bookings, Trips. The
 * 'general' workspace (Finance, IT, HR, Digital Marketing, anyone
 * with no department) gets UcWorkplaceTabs instead.
 *
 * ------------------------------------------------------------------
 * WHY WE WAIT FOR THE ANSWER BEFORE MOUNTING (READ BEFORE EDITING)
 * ------------------------------------------------------------------
 * `initialRouteName` is read ONCE, when the navigator first mounts.
 * React Navigation builds its state from it and then ignores the
 * prop — changing it later does nothing at all.
 *
 * So rendering the navigator while the workspace call is still in
 * flight is a bug, not a loading state. The hook reports 'general'
 * until the answer lands, the navigator locks that in, and ~200 ms
 * later the real answer ('sales', say) arrives and changes nothing.
 * The user stays on the Workplace dashboard for the whole session.
 *
 * That is exactly what happened on 13 Nov 2026: staff id 102, whose
 * uc_staff_access row reads departmentId 1 / subDepartmentId 1
 * (Sales › Pre-Sales), resolved correctly to 'sales' on the server
 * and still landed on the Workplace dashboard. It was not specific
 * to that user — EVERY workspace landed there, because the fallback
 * was always what the navigator saw first.
 *
 * Two things fix it, and both are needed:
 *
 *   1. Do not mount the navigator until `isLoading` is false. The
 *      call takes ~200 ms, so the spinner is barely seen. On error
 *      the hook stops loading and reports 'general', so this can
 *      never hang.
 *
 *   2. `key={…}` on the Navigator. If the workspace ever changes
 *      after mount — a refetch on resume, or HR moving someone
 *      between departments in Saarthi — the key change remounts the
 *      navigator so the new `initialRouteName` is actually applied.
 *      Without it, point 1 alone would still leave a stale shell on
 *      screen for the rest of the session.
 *
 * Do not "simplify" this back to passing the workspace straight into
 * `initialRouteName`. It silently does nothing.
 *
 * ------------------------------------------------------------------
 * THIS IS NOT A PERMISSION CHECK. The app only decides what to draw.
 * Anyone can modify a client, so every restriction that matters is
 * enforced again on the server: the directory lists are gated by
 * `requireFullDirectory` and personal numbers by which view the
 * backend queries. If this file were edited to show UcTabs to a
 * 'general' user, those screens would return 403 and empty.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import UcTabs from './tabs/UcTabs';
import UcWorkplaceTabs from './tabs/UcWorkplaceTabs';
import {
  CustomersListScreen,
  CustomerHistoryScreen,
} from '@features/uc/customers';
import { VendorsListScreen } from '@features/uc/vendors';
import { PaymentsScreen } from '@features/uc/payments';
import { DriversListScreen } from '@features/uc/drivers';
import { PerformanceScreen } from '@features/uc/performance';
import DirectoryScreen from '@features/uc/_directory/screens/DirectoryScreen';
import { UcChangeMpinScreen } from '@features/uc/security';
import { isBusinessWorkspace, useUcWorkspace } from '@features/uc/workspace';
import { Colors } from '@theme';
import { renderSharedScreens } from './sharedScreens';
import type { UcStackParamList } from './types';

const Stack = createNativeStackNavigator<UcStackParamList>();

const UcNavigator: React.FC = () => {
  const { workspace, isLoading } = useUcWorkspace();

  // Point 1 above: never mount the navigator on a guessed workspace.
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const isBusiness = isBusinessWorkspace(workspace);

  return (
    <Stack.Navigator
      // Point 2 above: remount if the workspace ever changes, so the
      // new initialRouteName is actually applied.
      key={isBusiness ? 'business' : 'workplace'}
      initialRouteName={isBusiness ? 'UcTabs' : 'UcWorkplaceTabs'}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* Real screens — one of these two is the landing route. */}
      <Stack.Screen name="UcTabs" component={UcTabs} />
      <Stack.Screen name="UcWorkplaceTabs" component={UcWorkplaceTabs} />

      {/* Shared screens — decided by SCREEN_ACCESS (src/rbac/screenAccess.ts) */}
      {renderSharedScreens(Stack, 'uc')}
      <Stack.Screen name="CustomersList" component={CustomersListScreen} />
      <Stack.Screen name="CustomerDetail" component={CustomerHistoryScreen} />

      {/* ComingSoon placeholders — pushed from the More sheet */}
      <Stack.Screen name="VendorsList" component={VendorsListScreen} />
      <Stack.Screen name="Payments" component={PaymentsScreen} />
      <Stack.Screen name="DriversList" component={DriversListScreen} />
      <Stack.Screen name="Performance" component={PerformanceScreen} />

      {/* Directory hub — Customers / Vendors / UC Staff / Drivers.
          Reached from the More sheet, which only the business
          workspaces have. The 'general' workspace gets the
          staff-only StaffDirectoryScreen as a bottom tab instead. */}
      <Stack.Screen name="Directory" component={DirectoryScreen} />
      {/* Settings › Security */}
      <Stack.Screen name="UcChangeMpin" component={UcChangeMpinScreen} />
    </Stack.Navigator>
  );
};

export default UcNavigator;

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
