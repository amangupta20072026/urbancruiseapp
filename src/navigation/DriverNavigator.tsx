// src/navigation/DriverNavigator.tsx
/**
 * ------------------------------------------------------------------
 * DriverNavigator — see CustomerNavigator for the ghost-route policy.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DriverTabs from './tabs/DriverTabs';
import type { DriverStackParamList } from './types';
import { NotImplementedScreen } from '@features/shared/screens';
import SupportScreen from '@features/shared/support/screens/SupportScreen';

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
      <Stack.Screen name="Support" component={SupportScreen} />

      {/* Registered ghost routes — real screens land later. */}
      <Stack.Screen name="TripDetail" component={NotImplementedScreen} />
      <Stack.Screen name="DeclineTrip" component={NotImplementedScreen} />
      <Stack.Screen name="OtpEntry" component={NotImplementedScreen} />
      <Stack.Screen name="StartLegKm" component={NotImplementedScreen} />
      <Stack.Screen name="EndLegKm" component={NotImplementedScreen} />
      <Stack.Screen name="Briefing" component={NotImplementedScreen} />
      <Stack.Screen name="CollectPayment" component={NotImplementedScreen} />
      <Stack.Screen
        name="DriverRegistration"
        component={NotImplementedScreen}
      />
      <Stack.Screen
        name="NotificationCentre"
        component={NotImplementedScreen}
      />
    </Stack.Navigator>
  );
};

export default DriverNavigator;
