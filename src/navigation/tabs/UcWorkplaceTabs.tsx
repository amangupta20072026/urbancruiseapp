// src/navigation/tabs/UcWorkplaceTabs.tsx
/**
 * ==================================================================
 * UcWorkplaceTabs — bottom tabs for the UC 'general' workspace
 * ==================================================================
 * Dashboard · Directory · Performance · More
 *
 * The business workspaces (admin / sales / telesales / ops) keep
 * UcTabs with Quotations, Bookings and Trips. This set is for staff
 * who do not run the sales pipeline.
 *
 * The More tab uses the SAME controller, sheet and custom tab bar as
 * every other role — `useMoreTabController` — so the floating badge,
 * the notch and the dismiss behaviour stay identical. Only the menu
 * contents differ, through the 'uc.workplace' menu key.
 *
 * Performance is the existing ComingSoon screen; it is a real tab so
 * the bar matches the agreed design, and tapping it says so honestly
 * rather than showing an empty chart.
 * ==================================================================
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { UcWorkplaceDashboardScreen } from '@features/uc/workplace';
import { PerformanceScreen } from '@features/uc/performance';
import StaffDirectoryScreen from '@features/uc/_directory/screens/StaffDirectoryScreen';

import type { UcWorkplaceTabParamList } from '../types';
import { MORE_ROUTE_NAME, useMoreTabController } from './shared';

const Tab = createBottomTabNavigator<UcWorkplaceTabParamList>();

/** Synthetic route — tapping More opens the sheet. See UcTabs. */
const MoreTabStub: React.FC = () => null;

const UcWorkplaceTabs: React.FC = () => {
  const {
    screenOptions,
    screenListeners,
    openMoreListeners,
    renderTabBar,
    MoreSheetElement,
  } = useMoreTabController('uc.workplace');

  return (
    <>
      <Tab.Navigator
        screenOptions={screenOptions}
        screenListeners={screenListeners}
        tabBar={renderTabBar}
      >
        <Tab.Screen name="Dashboard" component={UcWorkplaceDashboardScreen} />
        <Tab.Screen name="Directory" component={StaffDirectoryScreen} />
        <Tab.Screen name="Performance" component={PerformanceScreen} />
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

export default UcWorkplaceTabs;
