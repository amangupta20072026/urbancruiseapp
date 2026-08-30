// src/navigation/tabs/CustomerTabs.tsx
/**
 * CustomerTabs — Tab navigator for the Customer role.
 * See `./shared/useMoreTabController.tsx` for the sheet/nav contract.
 *
 * Each tab route below points at a real component — either the
 * finished feature screen (Home) or a ComingSoon tab-root living in
 * `features/customer/<domain>/` (Quotations, Bookings, Payments).
 * Same pattern as UcTabs: when a tab's real UI ships, only its
 * screen file's body changes — the tab wiring here stays untouched.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CustomerHomeScreen } from '@features/customer/home';
import { QuotationsScreen } from '@features/customer/quotations';
import { BookingsScreen } from '@features/customer/bookings';
import { PaymentsScreen } from '@features/customer/payments';

import type { CustomerTabParamList } from '../types';
import { MORE_ROUTE_NAME, useMoreTabController } from './shared';

const Tab = createBottomTabNavigator<CustomerTabParamList>();

/**
 * The More tab is a synthetic route — tapping it opens the MoreSheet
 * rather than navigating to a screen. It still needs a component to
 * satisfy the navigator; a null-returning stub is intentional here
 * (see openMoreListeners / renderTabBar for the real behaviour).
 */
const MoreTabStub: React.FC = () => null;

const CustomerTabs: React.FC = () => {
  const {
    screenOptions,
    screenListeners,
    openMoreListeners,
    renderTabBar,
    MoreSheetElement,
  } = useMoreTabController('customer');

  return (
    <>
      <Tab.Navigator
        screenOptions={screenOptions}
        screenListeners={screenListeners}
        tabBar={renderTabBar}
      >
        <Tab.Screen name="Home" component={CustomerHomeScreen} />
        <Tab.Screen name="Quotations" component={QuotationsScreen} />
        <Tab.Screen name="Bookings" component={BookingsScreen} />
        <Tab.Screen name="Payments" component={PaymentsScreen} />
        <Tab.Screen
          name={MORE_ROUTE_NAME}
          component={MoreTabStub}
          listeners={openMoreListeners}
        />
      </Tab.Navigator>

      {MoreSheetElement}
    </>
  );
};

export default CustomerTabs;
