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
import {
  SpiritualToursScreen,
  SpiritualTourDetailScreen,
} from '@features/customer/spiritualTours';
import {
  BookingDetailScreen,
  BookingTripsScreen,
} from '@features/customer/bookings';
import {
  QuotationDetailScreen,
  RequestQuotationScreen,
  QuotationSuccessScreen,
  QuotationHighlightsScreen,
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

      {/* In-app Spiritual Tours catalog, opened from the "Spiritual
          Tours" tile on Customer Home, and one tour's detail. */}
      <Stack.Screen name="SpiritualTours" component={SpiritualToursScreen} />
      <Stack.Screen
        name="SpiritualTourDetail"
        component={SpiritualTourDetailScreen}
      />

      {/* "Plan your next journey" flow — form + success */}
      <Stack.Screen
        name="RequestQuotation"
        component={RequestQuotationScreen}
      />
      <Stack.Screen
        name="QuotationSuccess"
        component={QuotationSuccessScreen}
      />
      {/* Brand images before QuotationDetail — used for deep links and
          Pay Now; in-app card taps play them over the list instead
          (HighlightsStoryHost). No iOS swipe-back: the customer must
          watch (Android back is blocked in HighlightsStory). */}
      <Stack.Screen
        name="QuotationHighlights"
        component={QuotationHighlightsScreen}
        options={{ gestureEnabled: false }}
      />
      {/* Quotation Details fades up from slightly below — after the
          highlights, and when it opens directly (Expired). */}
      <Stack.Screen
        name="QuotationDetail"
        component={QuotationDetailScreen}
        options={{ animation: 'fade_from_bottom' }}
      />
      {/* Vehicle brochures (reached from QuotationDetail) */}
      <Stack.Screen
        name="VehicleBrochures"
        component={VehicleBrochuresScreen}
      />
      <Stack.Screen name="VehicleVideo" component={VehicleVideoScreen} />
      <Stack.Screen name="CompareVehicles" component={CompareVehiclesScreen} />

      {/* Bookings */}
      <Stack.Screen name="BookingTrips" component={BookingTripsScreen} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
      <Stack.Screen name="Feedback" component={GiveFeedbackScreen} />
    </Stack.Navigator>
  );
};

export default CustomerNavigator;
