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
 * ------------------------------------------------------------------
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import UcTabs from './tabs/UcTabs';
import {
  CustomersListScreen,
  CustomerHistoryScreen,
} from '@features/uc/customers';
import { VendorsListScreen } from '@features/uc/vendors';
import { PaymentsScreen } from '@features/uc/payments';
import { DriversListScreen } from '@features/uc/drivers';
import { PerformanceScreen } from '@features/uc/performance';
import DirectoryScreen from '@features/uc/_directory/screens/DirectoryScreen';
import { renderSharedScreens } from './sharedScreens';
import type { UcStackParamList } from './types';

const Stack = createNativeStackNavigator<UcStackParamList>();

const UcNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="UcTabs"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* Real screens */}
      <Stack.Screen name="UcTabs" component={UcTabs} />

      {/* Shared screens — decided by SCREEN_ACCESS (src/rbac/screenAccess.ts) */}
      {renderSharedScreens(Stack, 'uc')}
      <Stack.Screen name="CustomersList" component={CustomersListScreen} />
      <Stack.Screen name="CustomerDetail" component={CustomerHistoryScreen} />

      {/* ComingSoon placeholders — pushed from the More sheet */}
      <Stack.Screen name="VendorsList" component={VendorsListScreen} />
      <Stack.Screen name="Payments" component={PaymentsScreen} />
      <Stack.Screen name="DriversList" component={DriversListScreen} />
      <Stack.Screen name="Performance" component={PerformanceScreen} />

      {/* Directory hub — Customers / Vendors / UC Staff / Drivers */}
      <Stack.Screen name="Directory" component={DirectoryScreen} />
    </Stack.Navigator>
  );
};

export default UcNavigator;