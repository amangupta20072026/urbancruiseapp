// src/navigation/VendorNavigator.tsx
/**
 * ------------------------------------------------------------------
 * VendorNavigator — see CustomerNavigator for the route policy.
 *
 * The vendor app is not built yet: only the tab shell and the
 * shared Help & Support screens are registered. Everything else the
 * vendor can tap shows a "Coming soon" toast.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import VendorTabs from './tabs/VendorTabs';
import type { VendorStackParamList } from './types';
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
    </Stack.Navigator>
  );
};

export default VendorNavigator;
