// src/navigation/CustomerNavigator.tsx
/**
 * ------------------------------------------------------------------
 * CustomerNavigator
 * ------------------------------------------------------------------
 * ROUTE POLICY (applies to every role navigator):
 *   Only screens that are actually built are registered, and every
 *   route in CustomerStackParamList (and its siblings) has a real
 *   component. There are no placeholder routes.
 *
 *   Unfinished features are NOT given a route. The UI that would
 *   open them calls `notifyComingSoon('<feature>')` from
 *   `@services/comingSoon`, which shows a "Coming soon" toast and
 *   records the attempt. Destinations that exist for some roles but
 *   not others go through `navigateOrComingSoon` in
 *   NavigationService. Deep links to unfinished destinations are
 *   handled in `services/deeplinks/toNavigate.ts`.
 *
 * SHIPPING A NEW SCREEN:
 *   1. Add the route to the role's ParamList in `./types.ts`.
 *   2. Register it below with its real component.
 *   3. Replace the `notifyComingSoon(...)` call(s) with navigation,
 *      and delete the feature key from `services/comingSoon/features.ts`
 *      — TypeScript then lists any call site you missed.
 *
 * MORE-SHEET DESTINATIONS:
 *   Profile / Settings / NotificationCentre are shared cross-role
 *   screens under features/shared/*. Referrals is Customer-scoped
 *   under features/customer/referrals/.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CustomerTabs from './tabs/CustomerTabs';
import { renderSharedScreens } from './sharedScreens';
import type { CustomerStackParamList } from './types';
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
import {
  CompareVehiclesScreen,
  VehicleBrochuresScreen,
  VehicleVideoScreen,
} from '@features/customer/brochures';

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

      {/* Shared screens — decided by SCREEN_ACCESS (src/rbac/screenAccess.ts) */}
      {renderSharedScreens(Stack, 'customer')}

      {/* More-sheet destinations — shared across roles */}

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
      {/* Vehicle brochures (reached from QuotationDetail) */}
      <Stack.Screen
        name="VehicleBrochures"
        component={VehicleBrochuresScreen}
      />
      <Stack.Screen name="VehicleVideo" component={VehicleVideoScreen} />
      <Stack.Screen name="CompareVehicles" component={CompareVehiclesScreen} />

      {/* Bookings */}
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
      <Stack.Screen name="Feedback" component={GiveFeedbackScreen} />
    </Stack.Navigator>
  );
};

export default CustomerNavigator;