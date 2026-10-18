// src/navigation/VendorNavigator.tsx
/**
 * ------------------------------------------------------------------
 * VendorNavigator — see CustomerNavigator for the route policy.
 *
 * The vendor app is not built yet: only the tab shell and the shared
 * screens SCREEN_ACCESS grants the vendor role are registered (Settings,
 * Support, About, Profile, Notifications and the vendor help topics).
 * Everything else the vendor can tap shows a "Coming soon" toast.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import VendorTabs from './tabs/VendorTabs';
import { renderSharedScreens } from './sharedScreens';
import type { VendorStackParamList } from './types';

const Stack = createNativeStackNavigator<VendorStackParamList>();

const VendorNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="VendorTabs"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* Real screens */}
      <Stack.Screen name="VendorTabs" component={VendorTabs} />

      {/* Shared screens — decided by SCREEN_ACCESS (src/rbac/screenAccess.ts) */}
      {renderSharedScreens(Stack, 'vendor')}
    </Stack.Navigator>
  );
};

export default VendorNavigator;