// src/navigation/UcNavigator.tsx
/**
 * ------------------------------------------------------------------
 * UcNavigator — see CustomerNavigator for the ghost-route policy.
 * ------------------------------------------------------------------
 * Registered screens fall into three buckets:
 *
 *   1. Real feature screens — full UI (UcTabs, CustomersList).
 *   2. ComingSoon placeholders — user-facing "coming soon" pages
 *      pushed from the More sheet. Live in `features/uc/<domain>/`
 *      so the file is the swap point when the real screen lands.
 *   3. Ghost routes — registered against NotImplementedScreen (a
 *      DEV-facing debug placeholder). These are for routes whose UX
 *      hasn't been designed yet; NotImplementedScreen exists to
 *      make bad navigate() calls visible during development.
 *
 * When a ComingSoon or ghost screen graduates to a real UI, simply
 * change its component reference below.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import UcTabs from './tabs/UcTabs';
import {
  CustomersListScreen,
  CustomerHistoryScreen,
} from '@features/uc/customers';
import { ProfileScreen } from '@features/shared/profile';
import { SettingsScreen } from '@features/shared/settings';
import { NotificationCentreScreen } from '@features/shared/notifications';
import { VendorsListScreen } from '@features/uc/vendors';
import { PaymentsScreen } from '@features/uc/payments';
import { DriversListScreen } from '@features/uc/drivers';
import { IssuesScreen } from '@features/uc/issues';
import { PerformanceScreen } from '@features/uc/performance';
import { FeedbackScreen } from '@features/shared/feedbacks';
import type { UcStackParamList } from './types';
import { NotImplementedScreen } from '@features/shared/screens';
import SupportScreen from '@features/shared/support/screens/SupportScreen';

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
      <Stack.Screen name="CustomersList" component={CustomersListScreen} />
      <Stack.Screen name="CustomerDetail" component={CustomerHistoryScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />

      {/* ComingSoon placeholders — pushed from the More sheet */}
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen
        name="NotificationCentre"
        component={NotificationCentreScreen}
      />
      <Stack.Screen name="VendorsList" component={VendorsListScreen} />
      <Stack.Screen name="Payments" component={PaymentsScreen} />
      <Stack.Screen name="DriversList" component={DriversListScreen} />
      <Stack.Screen name="Issues" component={IssuesScreen} />
      <Stack.Screen name="Performance" component={PerformanceScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} />

      {/* Registered ghost routes — real screens land later. */}
      <Stack.Screen name="EnquiryDetail" component={NotImplementedScreen} />
      <Stack.Screen name="CreateEnquiry" component={NotImplementedScreen} />
      <Stack.Screen name="QuotationBuilder" component={NotImplementedScreen} />
      <Stack.Screen name="QuotationRevision" component={NotImplementedScreen} />
      <Stack.Screen name="VendorDetail" component={NotImplementedScreen} />
      <Stack.Screen
        name="VendorApprovalQueue"
        component={NotImplementedScreen}
      />
      <Stack.Screen name="AssignVendor" component={NotImplementedScreen} />
      <Stack.Screen name="TripMonitor" component={NotImplementedScreen} />
      <Stack.Screen
        name="ChangeVehicleApproval"
        component={NotImplementedScreen}
      />
      <Stack.Screen name="PayinDetail" component={NotImplementedScreen} />
      <Stack.Screen name="PayoutDetail" component={NotImplementedScreen} />
    </Stack.Navigator>
  );
};

export default UcNavigator;
