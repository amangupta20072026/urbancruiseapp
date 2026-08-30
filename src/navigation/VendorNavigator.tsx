// src/navigation/VendorNavigator.tsx
/**
 * ------------------------------------------------------------------
 * VendorNavigator — see CustomerNavigator for the ghost-route policy.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import VendorTabs from './tabs/VendorTabs';
import type { VendorStackParamList } from './types';
import { NotImplementedScreen } from '@features/shared/screens';
import SupportScreen from '@features/shared/support/screens/SupportScreen';

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
      <Stack.Screen name="Support" component={SupportScreen} />

      {/* Registered ghost routes — real screens land later. */}
      <Stack.Screen name="AssignmentDetail" component={NotImplementedScreen} />
      <Stack.Screen name="AcceptAssignment" component={NotImplementedScreen} />
      <Stack.Screen name="RejectAssignment" component={NotImplementedScreen} />
      <Stack.Screen name="VehicleDetail" component={NotImplementedScreen} />
      <Stack.Screen name="AddVehicle" component={NotImplementedScreen} />
      <Stack.Screen
        name="VehicleAvailability"
        component={NotImplementedScreen}
      />
      <Stack.Screen name="DriverDetail" component={NotImplementedScreen} />
      <Stack.Screen name="AddDriver" component={NotImplementedScreen} />
      <Stack.Screen name="TripDetail" component={NotImplementedScreen} />
      <Stack.Screen
        name="ChangeVehicleRequest"
        component={NotImplementedScreen}
      />
      <Stack.Screen name="PaymentDetail" component={NotImplementedScreen} />
      <Stack.Screen
        name="NotificationCentre"
        component={NotImplementedScreen}
      />
    </Stack.Navigator>
  );
};

export default VendorNavigator;
