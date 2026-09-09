/**
 * ------------------------------------------------------------------
 * DirectoryScreen — the Directory hub
 * ------------------------------------------------------------------
 * Single screen with four top tabs: Customers / Vendors / UC Staff /
 * Drivers. Replaces the four scattered More-sheet entries with one
 * "Directory" entry that lands here.
 *
 * WHY MATERIAL TOP TABS:
 *   - Swipe-between-tabs is the CRM convention (HubSpot, Zoho).
 *   - Each tab keeps its own scroll position + filter state while the
 *     user swipes to another.
 *   - `@react-navigation/material-top-tabs` is already installed and
 *     used by the app's dependency tree.
 *
 * LAZY MOUNTING:
 *   lazy=true so we don't pay the network + render cost for tabs the
 *   user never visits. Each tab still keeps state after first mount
 *   (default), so returning to the tab is instant.
 *
 * CUSTOM TAB BAR:
 *   The default material-top-tabs bar renders a label + bottom
 *   indicator only. Our design (see mock) is icon + label with the
 *   active tab tinted brand-green and a short underline beneath it.
 *   `DirectoryTabBar` implements that; we pass it via the
 *   `tabBar` prop and strip label/indicator styling from
 *   `screenOptions` since the custom bar owns all of it.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  createMaterialTopTabNavigator,
  type MaterialTopTabNavigationOptions,
} from '@react-navigation/material-top-tabs';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { Spacing } from '@theme';

import CustomersTabScreen from '@features/uc/customers/screens/CustomersTabScreen';
import VendorsTabScreen from '@features/uc/vendors/screens/VendorsTabScreen';
import StaffTabScreen from '@features/uc/staff/screens/StaffTabScreen';
import DriversTabScreen from '@features/uc/drivers/screens/DriversTabScreen';

import { DIRECTORY_TAB_LABEL, type DirectoryTab } from '../types';
import { DirectoryTabBar } from '../components/DirectoryTabBar';

/**
 * Local param list — the Directory tabs live entirely inside this
 * screen, so they don't need to be part of UcStackParamList.
 */
export type DirectoryTabParamList = {
  DirectoryCustomers: undefined;
  DirectoryVendors: undefined;
  DirectoryStaff: undefined;
  DirectoryDrivers: undefined;
};

const Tab = createMaterialTopTabNavigator<DirectoryTabParamList>();

const tabOptions: MaterialTopTabNavigationOptions = {
  lazy: true,
  swipeEnabled: true,
};

/**
 * Maps each tab route name to its DirectoryTab key, so the
 * `screenListeners` focus handler below can look up the right
 * label from DIRECTORY_TAB_LABEL without a switch statement.
 */
const ROUTE_TO_TAB: Record<keyof DirectoryTabParamList, DirectoryTab> = {
  DirectoryCustomers: 'customers',
  DirectoryVendors: 'vendors',
  DirectoryStaff: 'staff',
  DirectoryDrivers: 'drivers',
};

const DirectoryScreen: React.FC = () => {
  const navigation = useNavigation();

  // Drives the header title — defaults to the first tab (Customers)
  // since that's the Tab.Navigator's initial route.
  const [activeTab, setActiveTab] = useState<DirectoryTab>('customers');

  // `screenListeners` (function form) hands us the route for each
  // screen so we can react to its `focus` event. Focus fires both on
  // tap and on swipe, so this stays in sync either way.
  const screenListeners = useCallback(
    ({ route }: { route: { name: keyof DirectoryTabParamList } }) => ({
      focus: () => setActiveTab(ROUTE_TO_TAB[route.name]),
    }),
    [],
  );

  return (
    <SafeScreen edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title={DIRECTORY_TAB_LABEL[activeTab]}
          subtitle="Customers, vendors, uc, and drivers — all in one place."
          onBack={() => navigation.goBack()}
        />
      </View>

      <Tab.Navigator
        screenOptions={tabOptions}
        screenListeners={screenListeners}
        // eslint-disable-next-line react/no-unstable-nested-components
        tabBar={props => <DirectoryTabBar {...props} />}
      >
        <Tab.Screen
          name="DirectoryCustomers"
          component={CustomersTabScreen}
          options={{ tabBarLabel: DIRECTORY_TAB_LABEL.customers }}
        />
        <Tab.Screen
          name="DirectoryVendors"
          component={VendorsTabScreen}
          options={{ tabBarLabel: DIRECTORY_TAB_LABEL.vendors }}
        />
        <Tab.Screen
          name="DirectoryStaff"
          component={StaffTabScreen}
          options={{ tabBarLabel: DIRECTORY_TAB_LABEL.staff }}
        />
        <Tab.Screen
          name="DirectoryDrivers"
          component={DriversTabScreen}
          options={{ tabBarLabel: DIRECTORY_TAB_LABEL.drivers }}
        />
      </Tab.Navigator>
    </SafeScreen>
  );
};

export default DirectoryScreen;

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
});
