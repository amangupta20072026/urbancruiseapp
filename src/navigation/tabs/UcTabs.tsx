// src/navigation/tabs/UcTabs.tsx
/**
 * ==================================================================
 * UcTabs — Tab navigator for the UC (admin) role
 * ==================================================================
 * All sheet/navigation plumbing lives in `useMoreTabController`.
 * See `./shared/useMoreTabController.tsx` for the full one-way
 * data-flow contract (user tap → sheet reacts) and why we listen
 * to `tabPress` rather than `state.index`.
 * ==================================================================
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { UcDashboardScreen } from '@features/uc/dashboard';
import { QuotationsScreen } from '@features/uc/quotations';
import { BookingsScreen } from '@features/uc/bookings';
import { TripsScreen } from '@features/uc/trips';

import type { UcTabParamList } from '../types';
import { MORE_ROUTE_NAME, useMoreTabController } from './shared';

const Tab = createBottomTabNavigator<UcTabParamList>();

/**
 * The More tab is a synthetic route — tapping it opens the MoreSheet
 * rather than navigating to a screen. It still needs a component to
 * satisfy the navigator; a null-returning stub is intentional here
 * (see openMoreListeners / renderTabBar for the real behaviour).
 */
const MoreTabStub: React.FC = () => null;

const UcTabs: React.FC = () => {
  const {
    screenOptions,
    screenListeners,
    openMoreListeners,
    renderTabBar,
    MoreSheetElement,
  } = useMoreTabController('uc');

  return (
    <>
      <Tab.Navigator
        screenOptions={screenOptions}
        screenListeners={screenListeners}
        tabBar={renderTabBar}
      >
        <Tab.Screen name="Dashboard" component={UcDashboardScreen} />
        <Tab.Screen name="Quotations" component={QuotationsScreen} />
        <Tab.Screen name="Bookings" component={BookingsScreen} />
        <Tab.Screen name="Trips" component={TripsScreen} />
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

export default UcTabs;