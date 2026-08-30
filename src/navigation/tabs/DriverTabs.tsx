// src/navigation/tabs/DriverTabs.tsx
/**
 * DriverTabs — Tab navigator for the Driver role.
 * See `./shared/useMoreTabController.tsx` for the sheet/nav contract.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DriverHomeScreen from '../../features/driver/DriverHomeScreen';

import type { DriverTabParamList } from '../types';
import { MORE_ROUTE_NAME, useMoreTabController } from './shared';

const Tab = createBottomTabNavigator<DriverTabParamList>();

const PlaceholderScreen: React.FC = () => null;

const DriverTabs: React.FC = () => {
  const {
    screenOptions,
    screenListeners,
    openMoreListeners,
    renderTabBar,
    MoreSheetElement,
  } = useMoreTabController('driver');

  return (
    <>
      <Tab.Navigator
        screenOptions={screenOptions}
        screenListeners={screenListeners}
        tabBar={renderTabBar}
      >
        <Tab.Screen name="Home" component={DriverHomeScreen} />
        <Tab.Screen name="MyTrips" component={PlaceholderScreen} />
        <Tab.Screen name="Emergency" component={PlaceholderScreen} />
        <Tab.Screen name="Earnings" component={PlaceholderScreen} />
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

export default DriverTabs;
