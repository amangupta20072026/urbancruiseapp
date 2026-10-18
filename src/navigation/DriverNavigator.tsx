// src/navigation/DriverNavigator.tsx
/**
 * ------------------------------------------------------------------
 * DriverNavigator — see CustomerNavigator for the route policy.
 *
 * The driver app is not built yet: only the tab shell and the shared
 * screens SCREEN_ACCESS grants the driver role are registered (Settings,
 * Support, About, Profile, Notifications and the driver help topics).
 * Everything else the driver can tap shows a "Coming soon" toast.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DriverTabs from './tabs/DriverTabs';
import { renderSharedScreens } from './sharedScreens';
import type { DriverStackParamList } from './types';

const Stack = createNativeStackNavigator<DriverStackParamList>();

const DriverNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="DriverTabs"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* Real screens */}
      <Stack.Screen name="DriverTabs" component={DriverTabs} />

      {/* Shared screens — decided by SCREEN_ACCESS (src/rbac/screenAccess.ts) */}
      {renderSharedScreens(Stack, 'driver')}
    </Stack.Navigator>
  );
};

export default DriverNavigator;
