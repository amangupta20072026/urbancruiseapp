// src/navigation/CustomerNavigator.tsx
/**
 * ------------------------------------------------------------------
 * CustomerNavigator
 * ------------------------------------------------------------------
 * All routes declared in CustomerStackParamList are registered here.
 * Screens that don't have a real implementation yet are wired to
 * NoImplementedScreen — this eliminates the "declared in types /
 * missing at runtime" class of bug where `navigate('SomeRoute', …)`
 * type-checks but throws at runtime.
 *
 * SWAP PROCEDURE:
 *   When a real screen lands, replace `component={NoImplementedScreen}`
 *   with the real component import. Route name and typing don't change.
 *
 * MORE-SHEET DESTINATIONS:
 *   Profile / Settings / NotificationCentre are shared cross-role
 *   screens under features/shared/*. Referrals is Customer-scoped
 *   under features/customer/referrals/. All four currently render
 *   ComingSoon bodies; when real UI ships, only the component file
 *   changes — this navigator wiring stays.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CustomerTabs from './tabs/CustomerTabs';
import type { CustomerStackParamList } from './types';
import { NotImplementedScreen } from '@features/shared/screens';
import SupportScreen from '@features/shared/support/screens/SupportScreen';
import HelpSupportScreen from '@features/shared/support/screens/HelpSupportScreen';
import { ProfileScreen } from '@features/shared/profile';
import { SettingsScreen } from '@features/shared/settings';
import { NotificationCentreScreen } from '@features/shared/notifications';
import { PaymentDetailScreen } from '@features/customer/payments';
import {
  CustomerFeedbackScreen,
  GiveFeedbackScreen,
} from '@features/customer/feedback';
import { ReferralsScreen } from '@features/customer/referrals';
import { BookingDetailScreen } from '@features/customer/bookings';
import {
  QuotationDetailScreen,
  RequestQuotationScreen,
  QuotationSuccessScreen,
} from '@features/customer/quotations';

const Stack = createNativeStackNavigator<CustomerStackParamList>();

const CustomerNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="CustomerTabs"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* Real screens */}
      <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />

      {/* More-sheet destinations — shared across roles */}
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen
        name="NotificationCentre"
        component={NotificationCentreScreen}
      />

      {/* More-sheet destinations — Customer-scoped */}
      <Stack.Screen
        name="CustomerFeedback"
        component={CustomerFeedbackScreen}
      />
      <Stack.Screen name="Referrals" component={ReferralsScreen} />

      {/* "Plan your next journey" flow — form + success */}
      <Stack.Screen
        name="RequestQuotation"
        component={RequestQuotationScreen}
      />
      <Stack.Screen
        name="QuotationSuccess"
        component={QuotationSuccessScreen}
      />
      <Stack.Screen name="QuotationDetail" component={QuotationDetailScreen} />

      {/* Registered ghost routes — real screens land later. */}
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
      <Stack.Screen name="PaymentDetail" component={PaymentDetailScreen} />
      <Stack.Screen name="PassengerList" component={NotImplementedScreen} />
      <Stack.Screen name="TripLive" component={NotImplementedScreen} />
      <Stack.Screen
        name="ModificationRequest"
        component={NotImplementedScreen}
      />
      <Stack.Screen name="AddRemark" component={NotImplementedScreen} />
      <Stack.Screen name="PayBalance" component={NotImplementedScreen} />
      <Stack.Screen name="GstInvoice" component={NotImplementedScreen} />
      <Stack.Screen name="Feedback" component={GiveFeedbackScreen} />
    </Stack.Navigator>
  );
};

export default CustomerNavigator;
