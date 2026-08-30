// src/navigation/tabs/VendorTabs.tsx
/**
 * VendorTabs — Tab navigator for the Vendor role.
 * See `./shared/useMoreTabController.tsx` for the sheet/nav contract.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import VendorHomeScreen from '../../features/vendor/VendorHomeScreen';

import type { VendorTabParamList } from '../types';
import { MORE_ROUTE_NAME, useMoreTabController } from './shared';

const Tab = createBottomTabNavigator<VendorTabParamList>();

const PlaceholderScreen: React.FC = () => null;

const VendorTabs: React.FC = () => {
  const {
    screenOptions,
    screenListeners,
    openMoreListeners,
    renderTabBar,
    MoreSheetElement,
  } = useMoreTabController('vendor');

  return (
    <>
      <Tab.Navigator
        screenOptions={screenOptions}
        screenListeners={screenListeners}
        tabBar={renderTabBar}
      >
        <Tab.Screen name="Dashboard" component={VendorHomeScreen} />
        <Tab.Screen name="Bookings" component={PlaceholderScreen} />
        <Tab.Screen name="Fleet" component={PlaceholderScreen} />
        <Tab.Screen name="Drivers" component={PlaceholderScreen} />
        <Tab.Screen
          name={MORE_ROUTE_NAME}
          component={PlaceholderScreen}
          listeners={openMoreListeners}
        />
      </Tab.Navigator>

      {MoreSheetElement}
    </>
  );
};

export default VendorTabs;
