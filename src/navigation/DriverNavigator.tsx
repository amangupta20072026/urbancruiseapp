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
import HelpSupportScreen from '@features/shared/support/screens/HelpSupportScreen';
import QuotationHelpScreen from '@features/shared/support/screens/QuotationHelpScreen';
import BookingHelpScreen from '@features/shared/support/screens/BookingHelpScreen';
import PaymentsHelpScreen from '@features/shared/support/screens/PaymentsHelpScreen';
import AccountHelpScreen from '@features/shared/support/screens/AccountHelpScreen';
import SafetyHelpScreen from '@features/shared/support/screens/SafetyHelpScreen';
import FeedbackHelpScreen from '@features/shared/support/screens/FeedbackHelpScreen';

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
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="QuotationHelp" component={QuotationHelpScreen} />
      <Stack.Screen name="BookingHelp" component={BookingHelpScreen} />
      <Stack.Screen name="PaymentsHelp" component={PaymentsHelpScreen} />
      <Stack.Screen name="AccountHelp" component={AccountHelpScreen} />
      <Stack.Screen name="SafetyHelp" component={SafetyHelpScreen} />
      <Stack.Screen name="FeedbackHelp" component={FeedbackHelpScreen} />

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
