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
import HelpSupportScreen from '@features/shared/support/screens/HelpSupportScreen';
import QuotationHelpScreen from '@features/shared/support/screens/QuotationHelpScreen';
import BookingHelpScreen from '@features/shared/support/screens/BookingHelpScreen';
import PaymentsHelpScreen from '@features/shared/support/screens/PaymentsHelpScreen';
import AccountHelpScreen from '@features/shared/support/screens/AccountHelpScreen';
import SafetyHelpScreen from '@features/shared/support/screens/SafetyHelpScreen';
import FeedbackHelpScreen from '@features/shared/support/screens/FeedbackHelpScreen';

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
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="QuotationHelp" component={QuotationHelpScreen} />
      <Stack.Screen name="BookingHelp" component={BookingHelpScreen} />
      <Stack.Screen name="PaymentsHelp" component={PaymentsHelpScreen} />
      <Stack.Screen name="AccountHelp" component={AccountHelpScreen} />
      <Stack.Screen name="SafetyHelp" component={SafetyHelpScreen} />
      <Stack.Screen name="FeedbackHelp" component={FeedbackHelpScreen} />

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
